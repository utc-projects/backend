const XLSX = require('xlsx');
const User = require('../models/User');

const HEADER_MAP = {
  'Họ và tên': 'name',
  'Email': 'email',
  'Mã sinh viên': 'studentId',
  'Khoa': 'department',
  // Alias kỹ thuật
  'name': 'name',
  'email': 'email',
  'studentId': 'studentId',
  'department': 'department',
};

const REQUIRED_FIELDS = ['name', 'email', 'studentId'];
const MAX_ROWS = 500;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const VALID_DEPARTMENTS = [
  'Khoa Du lịch',
  'Khoa Khách sạn',
  'Khoa Nhà hàng',
  'Khoa Lữ hành',
  'Khoa Ngoại ngữ',
  'Phòng Quản trị',
];

/**
 * Parse Excel buffer and return rows with mapped fields
 */
function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw { status: 400, message: 'File Excel không có sheet nào' };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    throw { status: 400, message: 'File Excel không có dữ liệu' };
  }

  if (rawRows.length > MAX_ROWS) {
    throw { status: 400, message: `File vượt quá giới hạn ${MAX_ROWS} dòng (có ${rawRows.length} dòng)` };
  }

  // Validate headers
  const headers = Object.keys(rawRows[0]);
  const mappedHeaders = headers.map(h => HEADER_MAP[h.trim()]).filter(Boolean);
  const missingRequired = REQUIRED_FIELDS.filter(f => !mappedHeaders.includes(f));
  if (missingRequired.length > 0) {
    const labels = missingRequired.map(f => {
      const entry = Object.entries(HEADER_MAP).find(([, v]) => v === f);
      return entry ? entry[0] : f;
    });
    throw { status: 400, message: `Thiếu cột bắt buộc: ${labels.join(', ')}` };
  }

  // Map rows
  const rows = rawRows.map((raw, index) => {
    const mapped = {};
    for (const [key, value] of Object.entries(raw)) {
      const field = HEADER_MAP[key.trim()];
      if (field) {
        mapped[field] = typeof value === 'string' ? value.trim() : String(value).trim();
      }
    }
    // Normalize
    if (mapped.email) mapped.email = mapped.email.toLowerCase();
    if (!mapped.department) mapped.department = 'Khoa Du lịch';
    mapped._row = index + 2; // Excel row (1-indexed header + 1-indexed data)
    return mapped;
  });

  return rows;
}

/**
 * Validate parsed rows against DB and internal duplicates
 */
async function validateRows(rows) {
  const validRows = [];
  const errors = [];

  // Collect all emails and studentIds for batch DB lookup
  const allEmails = rows.map(r => r.email).filter(Boolean);
  const allStudentIds = rows.map(r => r.studentId).filter(Boolean);

  const existingByEmail = await User.find({ email: { $in: allEmails } }).select('email').lean();
  const existingByStudentId = await User.find({ studentId: { $in: allStudentIds } }).select('studentId').lean();

  const dbEmails = new Set(existingByEmail.map(u => u.email));
  const dbStudentIds = new Set(existingByStudentId.map(u => u.studentId));

  // Track duplicates within file
  const fileEmails = new Map();
  const fileStudentIds = new Map();

  for (const row of rows) {
    const rowErrors = [];

    if (!row.name) rowErrors.push('Thiếu họ tên');
    if (!row.email) {
      rowErrors.push('Thiếu email');
    } else {
      if (!EMAIL_REGEX.test(row.email)) rowErrors.push('Email không hợp lệ');
      if (dbEmails.has(row.email)) rowErrors.push('Email đã tồn tại trong hệ thống');
      if (fileEmails.has(row.email)) rowErrors.push(`Email trùng với dòng ${fileEmails.get(row.email)}`);
    }
    if (!row.studentId) {
      rowErrors.push('Thiếu mã sinh viên');
    } else {
      if (dbStudentIds.has(row.studentId)) rowErrors.push('Mã sinh viên đã tồn tại trong hệ thống');
      if (fileStudentIds.has(row.studentId)) rowErrors.push(`Mã sinh viên trùng với dòng ${fileStudentIds.get(row.studentId)}`);
    }
    if (row.department && !VALID_DEPARTMENTS.includes(row.department)) {
      rowErrors.push(`Khoa "${row.department}" không hợp lệ. Các khoa hợp lệ: ${VALID_DEPARTMENTS.join(', ')}`);
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: row._row,
        email: row.email || '',
        studentId: row.studentId || '',
        errors: rowErrors,
      });
    } else {
      validRows.push(row);
    }

    // Track for file-level duplicate detection
    if (row.email) fileEmails.set(row.email, row._row);
    if (row.studentId) fileStudentIds.set(row.studentId, row._row);
  }

  return {
    totalRows: rows.length,
    validCount: validRows.length,
    invalidCount: errors.length,
    validRows,
    errors,
  };
}

/**
 * Create users from valid rows
 */
async function commitImport(validRows) {
  const currentYear = new Date().getFullYear();
  const created = [];
  const commitErrors = [];

  for (const row of validRows) {
    try {
      const password = `${row.studentId}@${currentYear}`;
      const user = await User.create({
        name: row.name,
        email: row.email,
        studentId: row.studentId,
        department: row.department,
        password,
        role: 'student',
        isActive: true,
        mustChangePassword: true,
      });
      created.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
      });
    } catch (err) {
      // Handle duplicate key errors gracefully
      let message = 'Lỗi tạo tài khoản';
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        if (field === 'email') message = 'Email đã tồn tại (có thể vừa được import bởi người khác)';
        else if (field === 'studentId') message = 'Mã sinh viên đã tồn tại (có thể vừa được import bởi người khác)';
      }
      commitErrors.push({
        row: row._row,
        email: row.email,
        studentId: row.studentId,
        error: message,
      });
    }
  }

  return { created, commitErrors };
}

module.exports = { parseExcelBuffer, validateRows, commitImport };
