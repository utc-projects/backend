const mongoose = require('mongoose');

const changeRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['point', 'route', 'provider'],
    required: true,
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    // ID of the item being updated/deleted. Null for create.
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // The proposed data payload
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedReviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  requesterClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null,
  },
  routingMode: {
    type: String,
    enum: ['lecturer_assigned', 'admin_fallback'],
    default: 'admin_fallback',
  },
  targetSnapshotBefore: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewNote: {
    type: String,
  },
}, {
  timestamps: true,
});

changeRequestSchema.index({ requester: 1, createdAt: -1 });
changeRequestSchema.index({ assignedReviewer: 1, status: 1, createdAt: -1 });
changeRequestSchema.index({ requesterClass: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
