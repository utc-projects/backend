/**
 * Middleware chặn user có mustChangePassword = true
 * Chỉ cho phép: GET /auth/me, PUT /auth/update-password
 */
const { auditDenied } = require('../services/auditLogService');

const requirePasswordChange = (req, res, next) => {
  if (!req.user || !req.user.mustChangePassword) {
    return next();
  }

  // Whitelist các route được phép
  const allowed = [
    { method: 'GET', path: '/api/auth/me' },
    { method: 'PUT', path: '/api/auth/update-password' },
  ];

  const isAllowed = allowed.some(
    r => req.method === r.method && req.originalUrl.startsWith(r.path)
  );

  if (isAllowed) {
    return next();
  }

  auditDenied(req, {
    event: 'auth.password_change_required_blocked',
    module: 'security',
    action: 'enforce_password_change',
    target: { type: 'user', id: req.user._id, label: req.user.email },
    summary: `Chặn truy cập vì ${req.user.email} chưa đổi mật khẩu bắt buộc`,
    reason: 'MUST_CHANGE_PASSWORD',
  });

  return res.status(403).json({
    message: 'Bạn cần đổi mật khẩu trước khi sử dụng hệ thống',
    code: 'MUST_CHANGE_PASSWORD',
    mustChangePassword: true,
  });
};

module.exports = requirePasswordChange;
