const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên học phần là bắt buộc'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Mã học phần là bắt buộc'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  credits: {
    type: Number,
    default: 3,
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

// Virtual: count classes
courseSchema.virtual('classCount', {
  ref: 'Class',
  localField: '_id',
  foreignField: 'course',
  count: true,
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
