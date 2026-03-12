const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const REDACTED_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'token',
  'refreshToken',
  'authorization',
  'buffer',
]);

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 3;

function truncateString(value) {
  const normalized = String(value);
  if (normalized.length <= MAX_STRING_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_STRING_LENGTH)}...`;
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    code: error.code || error.statusCode || '',
    message: error.message || String(error),
  };
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) {
      return { count: value.length };
    }

    if (typeof value === 'object') {
      return '[Truncated Object]';
    }
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return {
      count: value.length,
      items: value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1)),
    };
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      if (REDACTED_KEYS.has(key)) {
        return acc;
      }

      acc[key] = sanitizeValue(nestedValue, depth + 1);
      return acc;
    }, {});
  }

  return String(value);
}

function buildActor(req, overrides = {}) {
  if (overrides && Object.keys(overrides).length > 0) {
    return {
      id: overrides.id || null,
      email: overrides.email || 'anonymous',
      role: overrides.role || 'anonymous',
      name: overrides.name || '',
    };
  }

  return {
    id: req.user?._id || null,
    email: req.user?.email || 'anonymous',
    role: req.user?.role || 'anonymous',
    name: req.user?.name || '',
  };
}

function buildTarget(target = {}) {
  return {
    type: target.type || '',
    id: target.id || null,
    label: target.label || '',
    secondaryId: target.secondaryId || '',
  };
}

function buildContext(req) {
  return {
    requestId: req.auditContext?.requestId || req.requestId || `${Date.now()}`,
    method: req.auditContext?.method || req.method || '',
    path: req.auditContext?.path || req.originalUrl || '',
    ip: req.auditContext?.ip || req.ip || '',
    userAgent: req.auditContext?.userAgent || req.get?.('user-agent') || '',
    clientRoute: req.auditContext?.clientRoute || '',
  };
}

function diffSelectedFields(before = {}, after = {}, fields = []) {
  return fields.reduce((acc, field) => {
    const from = before ? before[field] : undefined;
    const to = after ? after[field] : undefined;

    if (JSON.stringify(from) !== JSON.stringify(to)) {
      acc[field] = {
        from: sanitizeValue(from),
        to: sanitizeValue(to),
      };
    }

    return acc;
  }, {});
}

async function writeAudit(status, req, payload = {}) {
  const entry = {
    event: payload.event,
    module: payload.module,
    action: payload.action,
    status,
    actor: buildActor(req, payload.actor),
    target: buildTarget(payload.target),
    context: buildContext(req),
    summary: truncateString(payload.summary || ''),
    reason: truncateString(payload.reason || ''),
    changes: sanitizeValue(payload.changes),
    metadata: sanitizeValue(payload.metadata),
    error: normalizeError(payload.error),
  };

  try {
    await AuditLog.create(entry);
    const logMethod = status === 'failed' ? 'error' : status === 'denied' ? 'warn' : 'info';
    logger[logMethod]('audit.recorded', {
      requestId: entry.context.requestId,
      event: entry.event,
      status: entry.status,
      actorId: entry.actor.id?.toString?.() || null,
      targetType: entry.target.type,
      targetId: entry.target.id?.toString?.() || entry.target.id || null,
    });
  } catch (error) {
    logger.error('audit.persistence_failed', {
      requestId: entry.context.requestId,
      event: entry.event,
      status: entry.status,
      error,
    });
  }
}

module.exports = {
  buildActor,
  buildTarget,
  buildContext,
  sanitizeValue,
  diffSelectedFields,
  auditSuccess(req, payload) {
    return writeAudit('success', req, payload);
  },
  auditDenied(req, payload) {
    return writeAudit('denied', req, payload);
  },
  auditFailed(req, payload) {
    return writeAudit('failed', req, payload);
  },
};
