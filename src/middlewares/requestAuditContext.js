const crypto = require('crypto');

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

module.exports = (req, res, next) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || '').split(',')[0].trim() || req.ip || '';

  const requestId = req.headers['x-request-id'] || generateRequestId();

  req.requestId = requestId;
  req.auditContext = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip,
    userAgent: req.get('user-agent') || '',
    clientRoute: req.get('x-client-route') || '',
  };

  res.setHeader('X-Request-Id', requestId);
  next();
};
