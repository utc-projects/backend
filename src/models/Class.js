const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên lớp học là bắt buộc'], // e.g., "Tuyến điểm - K60A"
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Mã lớp là bắt buộc'],
    unique: true,
    trim: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Học phần là bắt buộc'],
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  semester: {
    type: String, // e.g., "HK1 2025-2026"
    trim: true,
  },
  description: {
    type: String,
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

// Virtual: count students
classSchema.virtual('studentCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'classes',
  count: true,
});

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
