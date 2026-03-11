const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const requirePasswordChange = require('../middlewares/mustChangePasswordMiddleware');
const {
  addStudents,
  createClass,
  deleteClass,
  getAllClasses,
  getClassById,
  removeStudent,
  searchUnassignedStudents,
  updateClass,
} = require('../controllers/classController');

router.use(protect);
router.use(requirePasswordChange);

router.get('/unassigned-students', authorize('classes', 'edit'), searchUnassignedStudents);
router.get('/', authorize('classes', 'view'), getAllClasses);
router.get('/:id', authorize('classes', 'view'), getClassById);
router.post('/', authorize('classes', 'create'), createClass);
router.put('/:id', authorize('classes', 'edit'), updateClass);
router.delete('/:id', authorize('classes', 'delete'), deleteClass);
router.post('/:id/students', authorize('classes', 'edit'), addStudents);
router.delete('/:id/students/:userId', authorize('classes', 'edit'), removeStudent);

module.exports = router;
