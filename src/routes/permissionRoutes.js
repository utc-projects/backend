const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getAllPermissions, updatePermission, getMyPermissions } = require('../controllers/permissionController');

// All routes require login
router.use(protect);

// GET /api/permissions - Get all permissions (Admin only)
// Note: We use existing 'admin' string check here because permissions system manages other roles
// admin is always superuser.
router.get('/', authorize('admin'), getAllPermissions);

// GET /api/permissions/my-permissions - Get current user's permissions
router.get('/my-permissions', getMyPermissions);

// PUT /api/permissions/:role - Update permissions for a role (Admin only)
router.put('/:role', authorize('admin'), updatePermission);

module.exports = router;
