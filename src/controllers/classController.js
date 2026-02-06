const Class = require('../models/Class');
const Course = require('../models/Course');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
exports.getAllClasses = async (req, res) => {
  try {
    let query = Class.find();

    // Filter by course
    if (req.query.courseId) {
      query = query.where('course').equals(req.query.courseId);
    }

    const classes = await query
      .populate('course', 'name code')
      .populate('lecturer', 'name email')
      .populate('studentCount')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: classes.length,
      classes,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
exports.getClassById = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('course')
      .populate('lecturer')
      .populate('studentCount');

    if (!classItem) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }

    res.json({
      success: true,
      class: classItem,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Create new class
// @route   POST /api/classes
// @access  Private/Admin
exports.createClass = async (req, res) => {
  try {
    const { course, code } = req.body;

    // Check if course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(400).json({ message: 'Học phần không tồn tại' });
    }

    const newClass = await Class.create(req.body);
    
    // Populate for response
    await newClass.populate(['course', 'lecturer']);

    res.status(201).json({
      success: true,
      class: newClass,
    });
  } catch (error) {
    res.status(400).json({ message: 'Tạo lớp học thất bại', error: error.message });
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private/Admin
exports.updateClass = async (req, res) => {
  try {
    const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(['course', 'lecturer']);

    if (!updatedClass) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }

    res.json({
      success: true,
      class: updatedClass,
    });
  } catch (error) {
    res.status(400).json({ message: 'Cập nhật thất bại', error: error.message });
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
exports.deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findByIdAndDelete(req.params.id);

    if (!classItem) {
      return res.status(404).json({ message: 'Không tìm thấy lớp học' });
    }

    res.json({
      success: true,
      message: 'Đã xóa lớp học',
    });
  } catch (error) {
    res.status(500).json({ message: 'Xóa thất bại', error: error.message });
  }
};
