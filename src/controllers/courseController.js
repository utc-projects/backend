const Course = require('../models/Course');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private (Public for viewing?)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('classCount') // Virtual
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('classCount');

    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy học phần' });
    }

    res.json({
      success: true,
      course,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({
      success: true,
      course,
    });
  } catch (error) {
    res.status(400).json({ message: 'Tạo học phần thất bại', error: error.message });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy học phần' });
    }

    res.json({
      success: true,
      course,
    });
  } catch (error) {
    res.status(400).json({ message: 'Cập nhật thất bại', error: error.message });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Không tìm thấy học phần' });
    }

    res.json({
      success: true,
      message: 'Đã xóa học phần',
    });
  } catch (error) {
    res.status(500).json({ message: 'Xóa thất bại', error: error.message });
  }
};
