const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updatePassword,
  updateProfile,
  getAllUsers,
  updateUserRole,
  toggleUserActive,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);
router.put('/profile', protect, updateProfile);

// Admin routes
// Admin routes (now managed via permissions)
// Note: Admin role bypasses these checks automatically
router.get('/users', protect, authorize('users', 'view'), getAllUsers);
router.post('/users', protect, authorize('users', 'create'), createUser);
router.put('/users/:id', protect, authorize('users', 'edit'), updateUser);
router.put('/users/:id/role', protect, authorize('users', 'edit'), updateUserRole);
router.put('/users/:id/toggle-active', protect, authorize('users', 'edit'), toggleUserActive);
router.delete('/users/:id', protect, authorize('users', 'delete'), deleteUser);

module.exports = router;

