const express = require('express');
const router = express.Router();
const {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} = require('../controllers/classController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// Protected routes
router.use(protect);

router.get('/', getAllClasses);
router.get('/:id', getClassById);

// Admin only (Lecturer might need creation permissions via Permissions system later)
router.post('/', authorize('admin'), createClass);
router.put('/:id', authorize('admin'), updateClass);
router.delete('/:id', authorize('admin'), deleteClass);

module.exports = router;
