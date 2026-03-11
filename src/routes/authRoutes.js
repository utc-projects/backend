const express = require('express');
const multer = require('multer');
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
  resetUserPassword,
  createUser,
  updateUser,
  deleteUser,
  importStudentsPreview,
  importStudentsCommit,
  importStudentsTemplate,
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const requirePasswordChange = require('../middlewares/mustChangePasswordMiddleware');

// Multer config for Excel upload (memory storage, 5MB limit)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false);
    }
  },
});

// Public routes
// router.post('/register', register); // temporarily disabled public self-registration
router.post('/login', login);

// Protected routes (exempt from mustChangePassword check)
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);

// Protected routes (require password changed)
router.put('/profile', protect, requirePasswordChange, updateProfile);

// Admin routes (now managed via permissions)
// Note: Admin role bypasses these checks automatically
router.get('/users', protect, requirePasswordChange, authorize('users', 'view'), getAllUsers);
router.post('/users', protect, requirePasswordChange, authorize('users', 'create'), createUser);
router.put('/users/:id', protect, requirePasswordChange, authorize('users', 'edit'), updateUser);
router.put('/users/:id/role', protect, requirePasswordChange, authorize('users', 'edit'), updateUserRole);
router.put('/users/:id/toggle-active', protect, requirePasswordChange, authorize('users', 'edit'), toggleUserActive);
router.put('/users/:id/reset-password', protect, requirePasswordChange, authorize('users', 'edit'), resetUserPassword);
router.delete('/users/:id', protect, requirePasswordChange, authorize('users', 'delete'), deleteUser);

// Import students routes
router.get('/users/import-students/template', protect, requirePasswordChange, authorize('users', 'create'), importStudentsTemplate);
router.post('/users/import-students/preview', protect, requirePasswordChange, authorize('users', 'create'), excelUpload.single('file'), importStudentsPreview);
router.post('/users/import-students/commit', protect, requirePasswordChange, authorize('users', 'create'), excelUpload.single('file'), importStudentsCommit);

module.exports = router;
