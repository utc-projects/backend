/**
 * Middleware chặn user có mustChangePassword = true
 * Chỉ cho phép: GET /auth/me, PUT /auth/update-password
 */
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

  return res.status(403).json({
    message: 'Bạn cần đổi mật khẩu trước khi sử dụng hệ thống',
    code: 'MUST_CHANGE_PASSWORD',
    mustChangePassword: true,
  });
};

module.exports = requirePasswordChange;
