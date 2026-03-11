const ClassModel = require('../models/Class');
const User = require('../models/User');
const {
  canLecturerAccessClass,
  ensureStudentsNotInOtherActiveClasses,
  normalizeClassSummary,
  validateLecturerUser,
  validateStudentUsers,
} = require('../services/classScopeService');

function buildClassQuery(req) {
  const { search, semester, status } = req.query;
  const query = {};

  if (req.user.role === 'lecturer') {
    query.lecturer = req.user._id;
  }

  if (req.user.role === 'student') {
    query.students = req.user._id;
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [{ name: regex }, { code: regex }];
  }

  if (semester) {
    query.semester = semester;
  }

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  return query;
}

async function getScopedClassOr404(req, res) {
  const classDoc = await ClassModel.findById(req.params.id)
    .populate('lecturer', 'name email role isActive')
    .populate('students', 'name email role isActive studentId department');

  if (!classDoc) {
    res.status(404).json({ message: 'Không tìm thấy lớp học' });
    return null;
  }

  if (req.user.role === 'admin') {
    return classDoc;
  }

  if (req.user.role === 'lecturer') {
    if (await canLecturerAccessClass(req.user._id, classDoc)) {
      return classDoc;
    }
    res.status(403).json({ message: 'Bạn không có quyền truy cập lớp này' });
    return null;
  }

  const belongsToStudent = classDoc.students.some((student) => String(student._id) === String(req.user._id));
  if (!belongsToStudent) {
    res.status(403).json({ message: 'Bạn không có quyền truy cập lớp này' });
    return null;
  }

  return classDoc;
}

exports.getAllClasses = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;
    const query = buildClassQuery(req);

    const total = await ClassModel.countDocuments(query);
    const classes = await ClassModel.find(query)
      .populate('lecturer', 'name email role isActive')
      .populate('students', 'name email role isActive studentId department')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: classes.map((item) => ({
        ...item.toObject(),
        summary: normalizeClassSummary(item),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách lớp',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const classDoc = await getScopedClassOr404(req, res);
    if (!classDoc) {
      return;
    }

    res.json({
      success: true,
      data: classDoc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết lớp',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name, code, lecturer, semester = '', description = '', isActive = true } = req.body;
    await validateLecturerUser(lecturer);

    const classDoc = await ClassModel.create({
      name,
      code,
      lecturer,
      semester,
      description,
      isActive,
      students: [],
    });

    const populated = await ClassModel.findById(classDoc._id)
      .populate('lecturer', 'name email role isActive')
      .populate('students', 'name email role isActive studentId department');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Tạo lớp thất bại',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const classDoc = await getScopedClassOr404(req, res);
    if (!classDoc) {
      return;
    }

    if (req.user.role === 'lecturer' && req.body.lecturer && String(req.body.lecturer) !== String(classDoc.lecturer._id)) {
      return res.status(403).json({ message: 'Giảng viên không được đổi giảng viên phụ trách của lớp' });
    }

    if (req.body.lecturer) {
      await validateLecturerUser(req.body.lecturer);
      classDoc.lecturer = req.body.lecturer;
    }

    ['name', 'code', 'semester', 'description', 'isActive'].forEach((field) => {
      if (req.body[field] !== undefined) {
        classDoc[field] = req.body[field];
      }
    });

    await classDoc.save();
    await classDoc.populate('lecturer', 'name email role isActive');
    await classDoc.populate('students', 'name email role isActive studentId department');

    res.json({
      success: true,
      data: classDoc,
    });
  } catch (error) {
    res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Cập nhật lớp thất bại',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const classDoc = await getScopedClassOr404(req, res);
    if (!classDoc) {
      return;
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xóa lớp' });
    }

    if (Array.isArray(classDoc.students) && classDoc.students.length > 0) {
      return res.status(400).json({ message: 'Không thể xóa lớp còn sinh viên. Vui lòng xóa sinh viên khỏi lớp trước.' });
    }

    await classDoc.deleteOne();

    res.json({
      success: true,
      message: 'Xóa lớp thành công',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Xóa lớp thất bại',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.addStudents = async (req, res) => {
  try {
    const classDoc = await getScopedClassOr404(req, res);
    if (!classDoc) {
      return;
    }

    const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
    if (studentIds.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất một sinh viên' });
    }

    await validateStudentUsers(studentIds);
    await ensureStudentsNotInOtherActiveClasses(studentIds, classDoc._id);

    const currentIds = new Set(classDoc.students.map((student) => String(student._id || student)));
    const uniqueIds = [...new Set(studentIds.map(String))];
    const duplicates = uniqueIds.filter((id) => currentIds.has(id));

    if (duplicates.length > 0) {
      return res.status(400).json({ message: 'Có sinh viên đã thuộc lớp này' });
    }

    classDoc.students.push(...uniqueIds);
    await classDoc.save();
    await classDoc.populate('lecturer', 'name email role isActive');
    await classDoc.populate('students', 'name email role isActive studentId department');

    res.json({
      success: true,
      data: classDoc,
    });
  } catch (error) {
    res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Thêm sinh viên vào lớp thất bại',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.removeStudent = async (req, res) => {
  try {
    const classDoc = await getScopedClassOr404(req, res);
    if (!classDoc) {
      return;
    }

    const beforeCount = classDoc.students.length;
    classDoc.students = classDoc.students.filter((student) => String(student._id || student) !== String(req.params.userId));

    if (classDoc.students.length === beforeCount) {
      return res.status(404).json({ message: 'Sinh viên không thuộc lớp này' });
    }

    await classDoc.save();
    await classDoc.populate('lecturer', 'name email role isActive');
    await classDoc.populate('students', 'name email role isActive studentId department');

    res.json({
      success: true,
      data: classDoc,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Xóa sinh viên khỏi lớp thất bại',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.searchUnassignedStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const assignedClasses = await ClassModel.find({ isActive: true }).select('students');
    const assignedStudentIds = [...new Set(assignedClasses.flatMap((item) => item.students.map((id) => String(id))))];

    const query = {
      role: 'student',
      isActive: true,
      _id: { $nin: assignedStudentIds },
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { studentId: searchRegex },
      ];
    }

    const total = await User.countDocuments(query);
    const students = await User.find(query)
      .select('name email role studentId department isActive')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      users: students,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm sinh viên',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};
