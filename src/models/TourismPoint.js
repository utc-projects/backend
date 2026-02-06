const mongoose = require('mongoose');

const tourismPointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên điểm du lịch là bắt buộc'],
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Tọa độ là bắt buộc'],
    },
  },
  category: {
    type: String,
    enum: ['Tự nhiên', 'Văn hóa', 'Lịch sử', 'Tâm linh', 'Sinh thái'],
    required: [true, 'Phân loại là bắt buộc'],
  },
  highlights: {
    type: String,
    required: [true, 'Giá trị nổi bật là bắt buộc'],
  },
  description: {
    type: String,
    default: '',
  },
  images: [{
    type: String,
  }],
  videos: [{
    type: String, // Paths to video files
  }],
  role: {
    type: String,
    enum: ['Điểm tham quan chính', 'Điểm dừng chân', 'Điểm trung chuyển'],
    default: 'Điểm tham quan chính',
  },
  // Educational Links
  linkedModule: {
    type: String,
    default: 'Tuyến điểm du lịch Việt Nam',
  },
  assignments: [{
    type: String,
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// GeoJSON index for geospatial queries
tourismPointSchema.index({ location: '2dsphere' });

// Virtual: Count routes containing this point
tourismPointSchema.virtual('routeCount', {
  ref: 'TourismRoute',
  localField: '_id',
  foreignField: 'points',
  count: true,
});

// Static method: Find points within radius (km)
tourismPointSchema.statics.findWithinRadius = function(lng, lat, radiusKm) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radiusKm * 1000, // Convert to meters
      },
    },
  });
};

const TourismPoint = mongoose.model('TourismPoint', tourismPointSchema);

module.exports = TourismPoint;
