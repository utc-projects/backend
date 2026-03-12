const AuditLog = require('../models/AuditLog');

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInt(value, fallback, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

exports.getAuditLogs = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 20);
    const query = {};

    if (req.query.module) query.module = req.query.module;
    if (req.query.event) query.event = req.query.event;
    if (req.query.status) query.status = req.query.status;
    if (req.query.actorId) query['actor.id'] = req.query.actorId;
    if (req.query.targetType) query['target.type'] = req.query.targetType;
    if (req.query.targetId) query['target.id'] = req.query.targetId;

    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) query.createdAt.$lte = new Date(req.query.to);
    }

    if (String(req.query.search || '').trim()) {
      const searchValue = String(req.query.search).trim();
      const keyword = new RegExp(escapeRegex(searchValue), 'i');
      query.$or = [
        { 'actor.email': keyword },
        { 'actor.name': keyword },
        { 'target.label': keyword },
        { 'target.secondaryId': keyword },
        { summary: keyword },
        { 'context.requestId': keyword },
        { 'target.id': searchValue },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, totalItems] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể tải audit logs',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.getAuditLogById = async (req, res) => {
  try {
    const auditLog = await AuditLog.findById(req.params.id);
    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy audit log',
      });
    }

    res.json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Không thể tải chi tiết audit log',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};
