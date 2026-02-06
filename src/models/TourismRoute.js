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
  roadDuration: {
    type: Number, // in minutes
  },
  isRoadRoute: {
    type: Boolean,
    default: false,
  },
  geometry: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString',
    },
    coordinates: {
      type: [[Number]], // Array of [lng, lat]
    },
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

// Helper function: Fetch OSRM geometry
async function getRoutingGeometry(coordinates) {
  try {
    const OSRM_API = 'https://router.project-osrm.org';
    const coordString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `${OSRM_API}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return {
        geometry: data.routes[0].geometry,
        distance: data.routes[0].distance / 1000, // km
        duration: data.routes[0].duration / 60, // minutes
      };
    }
    return null;
  } catch (error) {
    console.warn('OSRM fetching failed:', error.message);
    return null;
  }
}

// Middleware: Auto-calculate totalDistance and Geometry before saving
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
      
      // Get chronological coordinates
      const coordinates = [];
      for (const pointId of this.points) {
        const point = pointsMap.get(pointId.toString());
        if (point?.location?.coordinates) {
          coordinates.push(point.location.coordinates);
        }
      }

      if (coordinates.length >= 2) {
        // 1. Calculate straight line distance (fallback)
        let straightDist = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
          straightDist += calculateDistance(coordinates[i], coordinates[i+1]);
        }
        
        // 2. Try to get road geometry
        const routingData = await getRoutingGeometry(coordinates);
        
        if (routingData) {
          this.geometry = routingData.geometry;
          this.totalDistance = Math.round(routingData.distance * 10) / 10;
          this.roadDuration = Math.round(routingData.duration);
          this.isRoadRoute = true;
        } else {
          // Fallback to straight line
          this.geometry = {
            type: 'LineString',
            coordinates: coordinates
          };
          this.totalDistance = Math.round(straightDist * 10) / 10;
          this.roadDuration = null;
          this.isRoadRoute = false;
        }
      }
    } catch (error) {
      console.error('Error calculating route geometry:', error);
      // Don't block save on error, just log it
    }
  }
});

const TourismRoute = mongoose.model('TourismRoute', tourismRouteSchema);

module.exports = TourismRoute;
