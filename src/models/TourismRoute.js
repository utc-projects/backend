const mongoose = require('mongoose');

const tourismRouteSchema = new mongoose.Schema({
  routeName: {
    type: String,
    required: [true, 'Tên tuyến du lịch là bắt buộc'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  points: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPoint',
  }],
  exploitationGuide: {
    type: String,
    required: [true, 'Gợi ý khai thác là bắt buộc'],
  },
  duration: {
    type: String,
    default: '1 ngày',
  },
  totalDistance: {
    type: Number,
    default: 0, // in kilometers
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

// Virtual: Total number of points
tourismRouteSchema.virtual('pointsCount').get(function() {
  return this.points ? this.points.length : 0;
});

// Helper function: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(coord1, coord2) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in km
}

// Middleware: Auto-calculate totalDistance before saving
tourismRouteSchema.pre('save', async function() {
  if (this.isModified('points') && this.points.length > 1) {
    try {
      const TourismPoint = mongoose.model('TourismPoint');
      const populatedPoints = await TourismPoint.find({
        _id: { $in: this.points }
      }).select('location');
      
      // Create a map for quick lookup
      const pointsMap = new Map();
      populatedPoints.forEach(p => pointsMap.set(p._id.toString(), p));
      
      // Calculate total distance following the order
      let totalDist = 0;
      for (let i = 0; i < this.points.length - 1; i++) {
        const currentPoint = pointsMap.get(this.points[i].toString());
        const nextPoint = pointsMap.get(this.points[i + 1].toString());
        
        if (currentPoint && nextPoint && 
            currentPoint.location?.coordinates && 
            nextPoint.location?.coordinates) {
          totalDist += calculateDistance(
            currentPoint.location.coordinates,
            nextPoint.location.coordinates
          );
        }
      }
      
      this.totalDistance = Math.round(totalDist * 10) / 10; // Round to 1 decimal
    } catch (error) {
      console.error('Error calculating distance:', error);
    }
  }
});

const TourismRoute = mongoose.model('TourismRoute', tourismRouteSchema);

module.exports = TourismRoute;
