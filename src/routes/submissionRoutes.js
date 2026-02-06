const express = require('express');
const router = express.Router();
const {
  getMySubmissions,
  createSubmission,
  getSubmissionsByAssignment,
  gradeSubmission,
  getSubmissionById,
} = require('../controllers/submissionController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// Student routes
router.get('/my', getMySubmissions);
router.post('/', authorize('student'), createSubmission);

// Lecturer/Admin routes
router.get('/assignment/:assignmentId', authorize('lecturer', 'admin'), getSubmissionsByAssignment);
router.put('/:id/grade', authorize('lecturer', 'admin'), gradeSubmission);

// Common route
router.get('/:id', getSubmissionById);

module.exports = router;
