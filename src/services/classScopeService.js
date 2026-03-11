const ClassModel = require('../models/Class');
const User = require('../models/User');

const CLASS_SUMMARY_SELECT = '_id name code semester isActive lecturer students';

function normalizeClassSummary(classDoc) {
  if (!classDoc) {
    return null;
  }

  const lecturer = classDoc.lecturer && typeof classDoc.lecturer === 'object'
    ? {
        _id: classDoc.lecturer._id,
        name: classDoc.lecturer.name,
        email: classDoc.lecturer.email,
        role: classDoc.lecturer.role,
        isActive: classDoc.lecturer.isActive,
      }
    : classDoc.lecturer;

  return {
    _id: classDoc._id,
    name: classDoc.name,
    code: classDoc.code,
    semester: classDoc.semester || '',
    isActive: classDoc.isActive,
    lecturer,
    studentCount: Array.isArray(classDoc.students) ? classDoc.students.length : classDoc.studentCount || 0,
  };
}

async function findClassOfStudent(studentId, { includeInactive = false, populateLecturer = false } = {}) {
  if (!studentId) {
    return null;
  }

  const query = {
    students: studentId,
    ...(includeInactive ? {} : { isActive: true }),
  };

  let cursor = ClassModel.findOne(query).select(CLASS_SUMMARY_SELECT);
  if (populateLecturer) {
    cursor = cursor.populate('lecturer', 'name email role isActive');
  }

  return cursor;
}

async function findClassesForStudents(studentIds, { includeInactive = false } = {}) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return [];
  }

  return ClassModel.find({
    students: { $in: studentIds },
    ...(includeInactive ? {} : { isActive: true }),
  })
    .select(CLASS_SUMMARY_SELECT)
    .populate('lecturer', 'name email role isActive');
}

async function resolveReviewerForStudent(studentId) {
  const classDoc = await findClassOfStudent(studentId, { populateLecturer: true });
  if (!classDoc) {
    return {
      classDoc: null,
      lecturer: null,
      routingMode: 'admin_fallback',
      assignedReviewer: null,
    };
  }

  const lecturer = classDoc.lecturer;
  const lecturerIsEligible =
    lecturer &&
    lecturer.role === 'lecturer' &&
    lecturer.isActive === true &&
    classDoc.isActive === true;

  if (!lecturerIsEligible) {
    return {
      classDoc,
      lecturer: null,
      routingMode: 'admin_fallback',
      assignedReviewer: null,
    };
  }

  return {
    classDoc,
    lecturer,
    routingMode: 'lecturer_assigned',
    assignedReviewer: lecturer._id,
  };
}

async function canLecturerAccessClass(lecturerId, classIdOrDoc) {
  if (!lecturerId || !classIdOrDoc) {
    return false;
  }

  if (classIdOrDoc.lecturer) {
    return String(classIdOrDoc.lecturer._id || classIdOrDoc.lecturer) === String(lecturerId);
  }

  const count = await ClassModel.countDocuments({
    _id: classIdOrDoc,
    lecturer: lecturerId,
  });
  return count > 0;
}

async function canLecturerManageStudent(lecturerId, studentId) {
  if (!lecturerId || !studentId) {
    return false;
  }

  const count = await ClassModel.countDocuments({
    lecturer: lecturerId,
    students: studentId,
    isActive: true,
  });

  return count > 0;
}

function canLecturerReviewRequest(lecturerId, changeRequest) {
  if (!lecturerId || !changeRequest) {
    return false;
  }
  return String(changeRequest.assignedReviewer?._id || changeRequest.assignedReviewer || '') === String(lecturerId);
}

async function getLecturerOwnedActiveClasses(lecturerId) {
  if (!lecturerId) {
    return [];
  }

  return ClassModel.find({ lecturer: lecturerId, isActive: true }).select('_id name code');
}

async function getStudentActiveClasses(studentId) {
  if (!studentId) {
    return [];
  }

  return ClassModel.find({ students: studentId, isActive: true }).select('_id name code');
}

async function ensureLecturerCanBeModified(userId) {
  const classes = await getLecturerOwnedActiveClasses(userId);
  if (classes.length === 0) {
    return;
  }

  const classNames = classes.map((item) => `${item.name} (${item.code})`).join(', ');
  const error = new Error(`Người dùng đang phụ trách lớp active: ${classNames}. Vui lòng đổi giảng viên phụ trách trước.`);
  error.status = 400;
  throw error;
}

async function ensureStudentCanBeModified(userId) {
  const classes = await getStudentActiveClasses(userId);
  if (classes.length === 0) {
    return;
  }

  const classNames = classes.map((item) => `${item.name} (${item.code})`).join(', ');
  const error = new Error(`Sinh viên đang thuộc lớp active: ${classNames}. Vui lòng xóa khỏi lớp trước.`);
  error.status = 400;
  throw error;
}

async function attachCurrentClassToUsers(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return users;
  }

  const studentIds = users.filter((user) => user.role === 'student').map((user) => user._id);
  const classes = await findClassesForStudents(studentIds);
  const classByStudentId = new Map();

  classes.forEach((classDoc) => {
    const summary = normalizeClassSummary(classDoc);
    classDoc.students.forEach((studentId) => {
      classByStudentId.set(String(studentId), summary);
    });
  });

  return users.map((user) => ({
    ...user.toObject(),
    currentClass: user.role === 'student' ? classByStudentId.get(String(user._id)) || null : null,
  }));
}

async function validateLecturerUser(userId) {
  const user = await User.findById(userId).select('role isActive name email');
  if (!user || user.role !== 'lecturer') {
    const error = new Error('Giảng viên phụ trách không hợp lệ');
    error.status = 400;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Giảng viên phụ trách đang bị vô hiệu hóa');
    error.status = 400;
    throw error;
  }

  return user;
}

async function validateStudentUsers(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(studentIds.map(String))];
  const users = await User.find({ _id: { $in: uniqueIds } }).select('role name email isActive');

  if (users.length !== uniqueIds.length) {
    const error = new Error('Có sinh viên không tồn tại');
    error.status = 400;
    throw error;
  }

  const invalid = users.find((user) => user.role !== 'student');
  if (invalid) {
    const error = new Error('Chỉ có thể thêm người dùng role sinh viên vào lớp');
    error.status = 400;
    throw error;
  }

  return users;
}

async function ensureStudentsNotInOtherActiveClasses(studentIds, targetClassId = null) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return;
  }

  const clashes = await ClassModel.find({
    _id: targetClassId ? { $ne: targetClassId } : { $exists: true },
    isActive: true,
    students: { $in: studentIds },
  }).select('name code students');

  if (clashes.length === 0) {
    return;
  }

  const clash = clashes[0];
  const error = new Error(`Sinh viên đã thuộc lớp active khác: ${clash.name} (${clash.code})`);
  error.status = 400;
  throw error;
}

module.exports = {
  attachCurrentClassToUsers,
  canLecturerAccessClass,
  canLecturerManageStudent,
  canLecturerReviewRequest,
  ensureLecturerCanBeModified,
  ensureStudentCanBeModified,
  ensureStudentsNotInOtherActiveClasses,
  findClassOfStudent,
  findClassesForStudents,
  getLecturerOwnedActiveClasses,
  getStudentActiveClasses,
  normalizeClassSummary,
  resolveReviewerForStudent,
  validateLecturerUser,
  validateStudentUsers,
};
