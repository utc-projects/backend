const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const TourismPoint = require('../models/TourismPoint');
const TourismRoute = require('../models/TourismRoute');

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Public
exports.getAllAssignments = async (req, res) => {
  try {
    const { linkedPoint, linkedRoute, createdBy, assignedClass } = req.query;
    const filter = { isActive: true };
    
    if (linkedPoint) filter.linkedPoint = linkedPoint;
    if (linkedRoute) filter.linkedRoute = linkedRoute;
    if (createdBy) filter.createdBy = createdBy;
    if (assignedClass) filter.assignedClass = assignedClass;

    const assignments = await Assignment.find(filter)
      .populate('createdBy', 'name email')
      .populate('linkedPoint', 'name category')
      .populate('linkedRoute', 'routeName')
      .populate('assignedClass', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get assignments by point
// @route   GET /api/assignments/point/:pointId
// @access  Public
exports.getAssignmentsByPoint = async (req, res) => {
  try {
    const assignments = await Assignment.find({ 
      linkedPoint: req.params.pointId,
      isActive: true 
    })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get assignments by route
// @route   GET /api/assignments/route/:routeId
// @access  Public
exports.getAssignmentsByRoute = async (req, res) => {
  try {
    const assignments = await Assignment.find({ 
      linkedRoute: req.params.routeId,
      isActive: true 
    })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Public
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('linkedPoint')
      .populate('linkedRoute')
      .populate('assignedClass', 'name code');

    if (!assignment) {
      return res.status(404).json({ message: 'Không tìm thấy bài tập' });
    }

    res.json({
      success: true,
      assignment,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private/Lecturer,Admin
exports.createAssignment = async (req, res) => {
  try {
    const assignmentData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const assignment = await Assignment.create(assignmentData);
    await assignment.populate(['createdBy', 'linkedPoint', 'linkedRoute', 'assignedClass']);

    res.status(201).json({
      success: true,
      assignment,
    });
  } catch (error) {
    res.status(400).json({ message: 'Tạo bài tập thất bại', error: error.message });
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private/Lecturer,Admin
exports.updateAssignment = async (req, res) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Không tìm thấy bài tập' });
    }

    // Only creator or admin can update
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa bài tập này' });
    }

    assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(['createdBy', 'linkedPoint', 'linkedRoute', 'assignedClass']);

    res.json({
      success: true,
      assignment,
    });
  } catch (error) {
    res.status(400).json({ message: 'Cập nhật thất bại', error: error.message });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private/Lecturer,Admin
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Không tìm thấy bài tập' });
    }

    // Only creator or admin can delete
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài tập này' });
    }

    await assignment.deleteOne();

    res.json({
      success: true,
      message: 'Đã xóa bài tập thành công',
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get my assignments (Lecturer)
// @route   GET /api/assignments/my
// @access  Private/Lecturer
exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ createdBy: req.user._id })
      .populate('linkedPoint', 'name')
      .populate('linkedRoute', 'routeName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
