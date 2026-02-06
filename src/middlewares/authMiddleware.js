const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      message: 'Bạn cần đăng nhập để truy cập',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ 
        message: 'Người dùng không tồn tại',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({ 
        message: 'Tài khoản đã bị vô hiệu hóa',
        code: 'USER_INACTIVE'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ 
      message: 'Token không hợp lệ hoặc đã hết hạn',
      code: 'INVALID_TOKEN'
    });
  }
};

// Authorize by resource and action
exports.authorize = (resource, action) => {
  return async (req, res, next) => {
    // Admin is superuser, always allow
    if (req.user.role === 'admin') {
      return next();
    }
    
    // If we only passed 'admin' as argument (legacy support for admin-only routes), 
    // the check above handles it. If user is not admin and we required 'admin', reject.
    if (resource === 'admin' && !action) {
       return res.status(403).json({
          message: 'Hành động yêu cầu quyền Admin',
          code: 'FORBIDDEN_ADMIN_ONLY'
       });
    }

    try {
      const Permission = require('../models/Permission');
      const permission = await Permission.findOne({ role: req.user.role });
      
      if (!permission) {
        return res.status(403).json({ 
          message: 'Không tìm thấy cấu hình phân quyền cho vai trò này',
          code: 'PERMISSION_CONFIG_NOT_FOUND'
        });
      }

      // Check if permission exists for resource and action
      // e.g. permission.resources.points.create
      if (
        permission.resources && 
        permission.resources[resource] && 
        permission.resources[resource][action] === true
      ) {
        return next();
      }

      return res.status(403).json({ 
        message: `Bạn không có quyền '${action}' cho '${resource}'`,
        code: 'FORBIDDEN',
        required: `${resource}.${action}`
      });
      
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        message: 'Lỗi hệ thống khi kiểm tra quyền',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Optional auth - attach user if token provided, but don't require it
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
};
