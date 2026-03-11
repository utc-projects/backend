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
  resetStudentPassword,
  createUser,
  updateUser,
  deleteUser,
  importStudentsPreview,
  importStudentsCommit,
  importStudentsTemplate,
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const requirePasswordChange = require('../middlewares/mustChangePasswordMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimit');

const getNormalizedLoginIdentity = (req) => String(req.body?.email || '').trim().toLowerCase() || 'anonymous';

// Rate limiters for auth endpoints
const loginLimiter = createRateLimiter({
  windowMs: 60_000, // 1 phút
  max: 5,
  message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 1 phút.',
  keyGenerator: (req) => `login:${req.ip}:${getNormalizedLoginIdentity(req)}`,
  skipSuccessfulRequests: true,
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 600_000, // 10 phút
  max: 3,
  message: 'Quá nhiều lần thay đổi mật khẩu. Vui lòng thử lại sau 10 phút.',
  keyGenerator: (req) => `reset-pwd:${req.user?._id?.toString() || req.ip}`,
});

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
router.post('/login', loginLimiter, login);

// Protected routes (exempt from mustChangePassword check)
router.get('/me', protect, getMe);
router.put('/update-password', protect, resetPasswordLimiter, updatePassword);

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
router.put('/users/:id/reset-student-password', protect, requirePasswordChange, authorize('classes', 'edit'), resetStudentPassword);
router.delete('/users/:id', protect, requirePasswordChange, authorize('users', 'delete'), deleteUser);

// Import students routes
router.get('/users/import-students/template', protect, requirePasswordChange, authorize('users', 'create'), importStudentsTemplate);
router.post('/users/import-students/preview', protect, requirePasswordChange, authorize('users', 'create'), excelUpload.single('file'), importStudentsPreview);
router.post('/users/import-students/commit', protect, requirePasswordChange, authorize('users', 'create'), excelUpload.single('file'), importStudentsCommit);

module.exports = router;
