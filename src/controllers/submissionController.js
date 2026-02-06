const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');

// @desc    Get my submissions (Student)
// @route   GET /api/submissions/my
// @access  Private/Student
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate({
        path: 'assignment',
        populate: [
          { path: 'linkedPoint', select: 'name' },
          { path: 'linkedRoute', select: 'routeName' },
        ],
      })
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Create submission
// @route   POST /api/submissions
// @access  Private/Student
exports.createSubmission = async (req, res) => {
  try {
    const { assignment, content, attachments } = req.body;

    // Check if assignment exists
    const assignmentDoc = await Assignment.findById(assignment);
    if (!assignmentDoc) {
      return res.status(404).json({ message: 'Không tìm thấy bài tập' });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      assignment,
      student: req.user._id,
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'Bạn đã nộp bài tập này rồi' });
    }

    // Check due date
    if (assignmentDoc.dueDate && new Date() > assignmentDoc.dueDate) {
      return res.status(400).json({ message: 'Bài tập đã quá hạn nộp' });
    }

    const submission = await Submission.create({
      assignment,
      student: req.user._id,
      content,
      attachments,
    });

    await submission.populate('assignment');

    res.status(201).json({
      success: true,
      submission,
    });
  } catch (error) {
    res.status(400).json({ message: 'Nộp bài thất bại', error: error.message });
  }
};

// @desc    Get submissions for an assignment (Lecturer)
// @route   GET /api/submissions/assignment/:assignmentId
// @access  Private/Lecturer,Admin
exports.getSubmissionsByAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Không tìm thấy bài tập' });
    }

    // Only creator or admin can view
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xem bài nộp của bài tập này' });
    }

    const submissions = await Submission.find({ assignment: req.params.assignmentId })
      .populate('student', 'name email studentId')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Grade submission (Lecturer)
// @route   PUT /api/submissions/:id/grade
// @access  Private/Lecturer,Admin
exports.gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    if (grade < 0 || grade > 10) {
      return res.status(400).json({ message: 'Điểm phải từ 0 đến 10' });
    }

    const submission = await Submission.findById(req.params.id)
      .populate('assignment');

    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp' });
    }

    // Only assignment creator or admin can grade
    if (submission.assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền chấm điểm bài này' });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await submission.save();
    await submission.populate('student', 'name email');

    res.json({
      success: true,
      submission,
    });
  } catch (error) {
    res.status(400).json({ message: 'Chấm điểm thất bại', error: error.message });
  }
};

// @desc    Get submission by id
// @route   GET /api/submissions/:id
// @access  Private
exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('student', 'name email studentId')
      .populate({
        path: 'assignment',
        populate: [
          { path: 'linkedPoint', select: 'name' },
          { path: 'linkedRoute', select: 'routeName' },
          { path: 'createdBy', select: 'name' },
        ],
      })
      .populate('gradedBy', 'name');

    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài nộp' });
    }

    // Only student owner, assignment creator, or admin can view
    if (
      submission.student._id.toString() !== req.user._id.toString() &&
      submission.assignment.createdBy._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Bạn không có quyền xem bài nộp này' });
    }

    res.json({
      success: true,
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
