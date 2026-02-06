const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// Public routes (none for now, maybe read-only list?)
// router.get('/', getAllCourses);

// Protected routes
router.use(protect);

router.get('/', getAllCourses);
router.get('/:id', getCourseById);

// Admin only
router.post('/', authorize('admin'), createCourse);
router.put('/:id', authorize('admin'), updateCourse);
router.delete('/:id', authorize('admin'), deleteCourse);

module.exports = router;
