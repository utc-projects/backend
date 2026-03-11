const Permission = require('../models/Permission');

// Default permissions configuration
const DEFAULT_PERMISSIONS = {
  lecturer: {
    points: { view: true, create: true, edit: true, delete: false },
    routes: { view: true, create: true, edit: true, delete: false },
    providers: { view: true, create: true, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    classes: { view: true, create: false, edit: true, delete: false }
  },
  student: {
    points: { view: true, create: false, edit: false, delete: false },
    routes: { view: true, create: false, edit: false, delete: false },
    providers: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    classes: { view: true, create: false, edit: false, delete: false }
  }
};

const mergeResourceDefaults = (resources = {}, defaults = {}) => {
  const merged = {};
  for (const [resourceKey, defaultActions] of Object.entries(defaults)) {
    merged[resourceKey] = {
      ...defaultActions,
      ...(resources[resourceKey] || {}),
    };
  }
  return merged;
};

// Initialize permissions if they don't exist
exports.initPermissions = async () => {
  try {
    for (const [role, resources] of Object.entries(DEFAULT_PERMISSIONS)) {
      const exists = await Permission.findOne({ role });
      if (!exists) {
        await Permission.create({ role, resources });
        console.log(`Initialized default permissions for role: ${role}`);
      } else {
        const mergedResources = mergeResourceDefaults(exists.resources || {}, resources);
        const changed = JSON.stringify(exists.resources || {}) !== JSON.stringify(mergedResources);
        if (changed) {
          exists.resources = mergedResources;
          exists.updatedAt = Date.now();
          await exists.save();
          console.log(`Merged default permissions for role: ${role}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize permissions:', error);
  }
};

// Get all permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({});
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách quyền',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Update permissions for a role
exports.updatePermission = async (req, res) => {
  try {
    const { role } = req.params;
    const { resources } = req.body;

    if (!['lecturer', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ'
      });
    }

    const permission = await Permission.findOneAndUpdate(
      { role },
      { resources: mergeResourceDefaults(resources, DEFAULT_PERMISSIONS[role]), updatedAt: Date.now() },
      { new: true, upsert: true } // Create if not exists
    );

    res.json({
      success: true,
      message: 'Cập nhật quyền thành công',
      data: permission
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Cập nhật quyền thất bại',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Get current user's permissions
exports.getMyPermissions = async (req, res) => {
  try {
    // Admin has full access
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        data: {
          role: 'admin',
          isAdmin: true,
          // Admin effectively has true for everything
        }
      });
    }

    const permission = await Permission.findOne({ role: req.user.role });
    
    if (!permission) {
        return res.json({
            success: true,
            data: {
                role: req.user.role,
                resources: {} // No permissions found
            }
        });
    }

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy quyền cá nhân',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};
