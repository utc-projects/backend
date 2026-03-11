const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên lớp là bắt buộc'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Mã lớp là bắt buộc'],
      trim: true,
      uppercase: true,
      unique: true,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Giảng viên phụ trách là bắt buộc'],
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    semester: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

classSchema.index({ lecturer: 1 });
classSchema.index({ students: 1 });
classSchema.index({ semester: 1 });

classSchema.virtual('studentCount').get(function studentCountGetter() {
  return Array.isArray(this.students) ? this.students.length : 0;
});

module.exports = mongoose.model('Class', classSchema);
