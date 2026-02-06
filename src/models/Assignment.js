const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề bài tập là bắt buộc'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Mô tả bài tập là bắt buộc'],
  },
  linkedModule: {
    type: String,
    default: 'Tuyến điểm du lịch Việt Nam',
  },
  linkedPoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPoint',
  },
  linkedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismRoute',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dueDate: {
    type: Date,
  },
  attachments: [{
    type: String,
  }],
  requirements: [{
    type: String,
  }],
  maxScore: {
    type: Number,
    default: 10,
  },
  assignedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: submission count
assignmentSchema.virtual('submissionCount', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'assignment',
  count: true,
});

// Index for queries
assignmentSchema.index({ linkedPoint: 1 });
assignmentSchema.index({ linkedRoute: 1 });
assignmentSchema.index({ createdBy: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
