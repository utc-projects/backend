const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  linkedPoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPoint',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Nội dung ghi chú là bắt buộc'],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  visitDate: {
    type: Date,
  },
  photos: [{
    type: String,
  }],
  isPublic: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for queries
noteSchema.index({ user: 1, linkedPoint: 1 });
noteSchema.index({ linkedPoint: 1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
