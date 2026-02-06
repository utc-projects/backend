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

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
