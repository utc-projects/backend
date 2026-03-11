const crypto = require('crypto');
const User = require('../models/User');
const { parseExcelBuffer, validateRows, commitImport } = require('../services/studentImportService');
const ClassModel = require('../models/Class');
const {
  attachCurrentClassToUsers,
  canLecturerManageStudent,
  ensureLecturerCanBeModified,
  ensureStudentCanBeModified,
} = require('../services/classScopeService');

function generateRandomPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

function assertStudentResetAllowed(user) {
  if (user?.role === 'student' && user.isActive === false) {
    const error = new Error('Không thể reset mật khẩu cho sinh viên đang bị vô hiệu hóa');
    error.status = 400;
    throw error;
  }
}

async function buildUserListQuery(req) {
  const { search, role, status, classId, unassignedOnly } = req.query;
  const query = {
    _id: { $ne: req.user._id },
  };

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { studentId: searchRegex }
    ];
  }

  if (role && role !== 'all') {
    query.role = role;
  }

  if (status && status !== 'all') {
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
  }

  if (classId && classId !== 'all') {
    const classDoc = await ClassModel.findById(classId).select('students');
    query._id = {
      ...query._id,
      $in: classDoc ? classDoc.students : [],
    };
  }

  if (String(unassignedOnly) === 'true') {
    query.role = 'student';
    const assignedClasses = await ClassModel.find({ isActive: true }).select('students');
    const assignedStudentIds = [...new Set(assignedClasses.flatMap((item) => item.students.map((id) => String(id))))];
    query._id = {
      ...query._id,
      $nin: assignedStudentIds,
    };
  }

  return query;
}

async function assertUserLifecycleConstraints(user, { nextRole = null, nextIsActive = null, mode = 'update' } = {}) {
  const resultingRole = nextRole || user.role;
  const resultingActive = nextIsActive === null || nextIsActive === undefined ? user.isActive : nextIsActive;
  const deactivatingLecturer = user.role === 'lecturer' && user.isActive === true && resultingActive === false;

  if (user.role === 'lecturer' && (mode === 'delete' || resultingRole !== 'lecturer' || deactivatingLecturer)) {
    await ensureLecturerCanBeModified(user._id);
  }

  if (user.role === 'student' && (mode === 'delete' || resultingRole !== 'student')) {
    await ensureStudentCanBeModified(user._id);
  }
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, password, name, role, studentId, department } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Create user (default role is student)
    const user = await User.create({
      email,
      password,
      name,
      role: role === 'admin' ? 'student' : role, // Prevent self-assign admin
      studentId,
      department,

    });

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        department: user.department,
      },
    });
  } catch (error) {
    res.status(400).json({ message: 'Đăng ký thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // Generate token
    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        department: user.department,
        avatar: user.avatar,
        mustChangePassword: user.mustChangePassword || false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Đăng nhập thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        studentId: user.studentId,
        department: user.department,
        avatar: user.avatar,
        mustChangePassword: user.mustChangePassword || false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    // Set new password and clear mustChangePassword
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    // Generate new token
    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        department: user.department,
        avatar: user.avatar,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Đổi mật khẩu thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, studentId, department, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, studentId, department, avatar },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        studentId: user.studentId,
        department: user.department,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(400).json({ message: 'Cập nhật thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = await buildUserListQuery(req);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);
    const usersWithClass = await attachCurrentClassToUsers(users);

    res.json({
      success: true,
      count: usersWithClass.length,
      users: usersWithClass,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Update user role (Admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'lecturer', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ' });
    }

    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await assertUserLifecycleConstraints(existingUser, { nextRole: role });

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Cập nhật thất bại' });
  }
};

// @desc    Toggle user active status (Admin only)
// @route   PUT /api/users/:id/toggle-active
// @access  Private/Admin
exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (user.isActive) {
      await assertUserLifecycleConstraints(user, { nextIsActive: false });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Cập nhật thất bại' });
  }
};

// @desc    Reset user password (Admin only)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
exports.resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    assertStudentResetAllowed(user);

    const newPassword = generateRandomPassword();

    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({
      success: true,
      newPassword,
    });
  } catch (error) {
    res.status(400).json({ message: 'Reset mật khẩu thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Reset student password within class scope
// @route   PUT /api/auth/users/:id/reset-student-password
// @access  Private/Admin,Lecturer with class edit permission
exports.resetStudentPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ message: 'Chỉ có thể reset mật khẩu cho tài khoản sinh viên' });
    }

    assertStudentResetAllowed(user);

    if (req.user.role === 'lecturer') {
      const canManageStudent = await canLecturerManageStudent(req.user._id, user._id);
      if (!canManageStudent) {
        return res.status(403).json({ message: 'Bạn chỉ có thể reset mật khẩu cho sinh viên thuộc lớp mình phụ trách' });
      }
    }

    const newPassword = generateRandomPassword();

    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({
      success: true,
      newPassword,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Reset mật khẩu sinh viên thất bại',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

// @desc    Create new user (Admin only)
// @route   POST /api/auth/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { email, password, name, role, studentId, department } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Admin can create any role
    const user = await User.create({
      email,
      password,
      name,
      role: role || 'student',
      studentId,
      department,
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        department: user.department,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(400).json({ message: 'Tạo người dùng thất bại', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, department, studentId, isActive } = req.body;

    // Check if email is being changed and already exists
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã được sử dụng' });
      }
    }

    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await assertUserLifecycleConstraints(existingUser, {
      nextRole: role || existingUser.role,
      nextIsActive: isActive,
    });

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role && ['admin', 'lecturer', 'student'].includes(role)) updateData.role = role;
    if (department) updateData.department = department;
    if (studentId !== undefined) updateData.studentId = studentId;
    if (isActive !== undefined) updateData.isActive = isActive;


    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Cập nhật thất bại' });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình' });
    }

    await assertUserLifecycleConstraints(user, { mode: 'delete' });

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Đã xóa người dùng thành công',
    });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || 'Xóa thất bại' });
  }
};

// @desc    Preview import students from Excel
// @route   POST /api/auth/users/import-students/preview
// @access  Private/Admin
exports.importStudentsPreview = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file Excel' });
    }

    const rows = parseExcelBuffer(req.file.buffer);
    const result = await validateRows(rows);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const status = error.status || 400;
    res.status(status).json({ message: error.message || 'Lỗi xử lý file', ...(process.env.NODE_ENV === 'development' && !error.status && { error: error.message }) });
  }
};

// @desc    Commit import students from Excel
// @route   POST /api/auth/users/import-students/commit
// @access  Private/Admin
exports.importStudentsCommit = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file Excel' });
    }

    const rows = parseExcelBuffer(req.file.buffer);
    const validation = await validateRows(rows);

    if (validation.validCount === 0) {
      return res.status(400).json({
        message: 'Không có dòng hợp lệ để import',
        errors: validation.errors,
      });
    }

    const { created, commitErrors } = await commitImport(validation.validRows);

    res.json({
      success: true,
      createdCount: created.length,
      created,
      commitErrors,
      skippedErrors: validation.errors,
    });
  } catch (error) {
    const status = error.status || 400;
    res.status(status).json({ message: error.message || 'Lỗi import', ...(process.env.NODE_ENV === 'development' && !error.status && { error: error.message }) });
  }
};

// @desc    Download import template
// @route   GET /api/auth/users/import-students/template
// @access  Private/Admin
exports.importStudentsTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const data = [
      { 'Họ và tên': 'Nguyễn Văn A', 'Email': 'nguyenvana@tourism.edu.vn', 'Mã sinh viên': 'SV2026001', 'Khoa': 'Khoa Du lịch' },
      { 'Họ và tên': 'Trần Thị B', 'Email': 'tranthib@tourism.edu.vn', 'Mã sinh viên': 'SV2026002', 'Khoa': 'Khoa Du lịch' },
      { 'Họ và tên': 'Lê Văn C', 'Email': 'levanc@tourism.edu.vn', 'Mã sinh viên': 'SV2026003', 'Khoa': 'Khoa Khách sạn' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách sinh viên');

    // Set column widths
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=mau_import_sinh_vien.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo file mẫu' });
  }
};
