const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['success', 'denied', 'failed'],
      required: true,
    },
    actor: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      email: {
        type: String,
        default: 'anonymous',
      },
      role: {
        type: String,
        default: 'anonymous',
      },
      name: {
        type: String,
        default: '',
      },
    },
    target: {
      type: {
        type: String,
        default: '',
      },
      id: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      label: {
        type: String,
        default: '',
      },
      secondaryId: {
        type: String,
        default: '',
      },
    },
    context: {
      requestId: {
        type: String,
        required: true,
        trim: true,
      },
      method: {
        type: String,
        default: '',
      },
      path: {
        type: String,
        default: '',
      },
      ip: {
        type: String,
        default: '',
      },
      userAgent: {
        type: String,
        default: '',
      },
      clientRoute: {
        type: String,
        default: '',
      },
    },
    summary: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      name: {
        type: String,
        default: '',
      },
      code: {
        type: String,
        default: '',
      },
      message: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ event: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.id': 1, createdAt: -1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
