const express = require('express');
const router = express.Router();
const {
  getAllAssignments,
  getAssignmentsByPoint,
  getAssignmentsByRoute,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getMyAssignments,
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getAllAssignments);
router.get('/point/:pointId', getAssignmentsByPoint);
router.get('/route/:routeId', getAssignmentsByRoute);
router.get('/:id', getAssignmentById);

// Lecturer/Admin routes
router.get('/my', protect, authorize('lecturer', 'admin'), getMyAssignments);
router.post('/', protect, authorize('lecturer', 'admin'), createAssignment);
router.put('/:id', protect, authorize('lecturer', 'admin'), updateAssignment);
router.delete('/:id', protect, authorize('lecturer', 'admin'), deleteAssignment);

module.exports = router;
