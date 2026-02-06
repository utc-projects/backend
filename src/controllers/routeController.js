const TourismRoute = require('../models/TourismRoute');
const TourismPoint = require('../models/TourismPoint');

// OSRM public demo server (for development)
// In production, you should use your own OSRM server
const OSRM_API = 'https://router.project-osrm.org';

// Helper: Get road route geometry from OSRM
async function getRoutingGeometry(coordinates) {
  try {
    // Format coordinates for OSRM: lng,lat;lng,lat;...
    const coordString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    
    const url = `${OSRM_API}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return {
        geometry: data.routes[0].geometry,
        distance: data.routes[0].distance / 1000, // Convert to km
        duration: data.routes[0].duration / 60, // Convert to minutes
      };
    }
    
    return null;
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
}

// @desc    Get all routes
// @route   GET /api/routes
// @access  Public
exports.getAllRoutes = async (req, res) => {
  try {
    const routes = await TourismRoute.find()
      .populate('points', 'name location category role')
      .sort({ routeName: 1 });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get single route with populated points
// @route   GET /api/routes/:id
// @access  Public
exports.getRouteById = async (req, res) => {
  try {
    const route = await TourismRoute.findById(req.params.id)
      .populate('points');
    if (!route) {
      return res.status(404).json({ message: 'Không tìm thấy tuyến du lịch' });
    }
    res.json(route);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get route as GeoJSON with actual road geometry
// @route   GET /api/routes/:id/geojson
// @access  Public
exports.getRouteGeoJSON = async (req, res) => {
  try {
    const route = await TourismRoute.findById(req.params.id)
      .populate('points', 'name location category');
    
    if (!route) {
      return res.status(404).json({ message: 'Không tìm thấy tuyến du lịch' });
    }

    // Get coordinates from points
    const coordinates = route.points
      .filter(p => p.location?.coordinates)
      .map(p => p.location.coordinates);

    // Try to get actual road geometry from OSRM
    let geometry;
    let roadDistance = null;
    let roadDuration = null;

    if (coordinates.length >= 2) {
      const routingResult = await getRoutingGeometry(coordinates);
      
      if (routingResult) {
        geometry = routingResult.geometry;
        roadDistance = Math.round(routingResult.distance * 10) / 10;
        roadDuration = Math.round(routingResult.duration);
      }
    }

    // Fallback to straight lines if OSRM fails
    if (!geometry) {
      geometry = {
        type: 'LineString',
        coordinates: coordinates,
      };
    }

    const geoJSON = {
      type: 'Feature',
      geometry: geometry,
      properties: {
        _id: route._id,
        routeName: route.routeName,
        description: route.description,
        duration: route.duration,
        totalDistance: roadDistance || route.totalDistance,
        roadDuration: roadDuration, // Driving time in minutes
        pointsCount: route.points.length,
        points: route.points.map(p => ({
          _id: p._id,
          name: p.name,
          category: p.category,
        })),
        isRoadRoute: !!roadDistance, // Flag to indicate if this is actual road routing
      },
    };

    res.json(geoJSON);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Get all routes as GeoJSON FeatureCollection with road geometry
// @route   GET /api/routes/geojson
// @access  Public
exports.getAllRoutesGeoJSON = async (req, res) => {
  try {
    const routes = await TourismRoute.find()
      .populate('points', 'name location category');

    const features = await Promise.all(routes.map(async (route) => {
      const coordinates = route.points
        .filter(p => p.location?.coordinates)
        .map(p => p.location.coordinates);

      // Try to get actual road geometry
      let geometry;
      let roadDistance = null;
      let roadDuration = null;

      if (coordinates.length >= 2) {
        const routingResult = await getRoutingGeometry(coordinates);
        
        if (routingResult) {
          geometry = routingResult.geometry;
          roadDistance = Math.round(routingResult.distance * 10) / 10;
          roadDuration = Math.round(routingResult.duration);
        }
      }

      // Fallback to straight lines
      if (!geometry) {
        geometry = {
          type: 'LineString',
          coordinates: coordinates,
        };
      }

      return {
        type: 'Feature',
        geometry: geometry,
        properties: {
          _id: route._id,
          routeName: route.routeName,
          description: route.description,
          duration: route.duration,
          totalDistance: roadDistance || route.totalDistance,
          roadDuration: roadDuration,
          pointsCount: route.points.length,
          isRoadRoute: !!roadDistance,
        },
      };
    }));

    res.json({
      type: 'FeatureCollection',
      features: features,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Create new route
// @route   POST /api/routes
// @access  Public (should be protected in production)
exports.createRoute = async (req, res) => {
  try {
    const route = new TourismRoute(req.body);
    await route.save();
    
    // Populate points before returning
    await route.populate('points', 'name location category');
    res.status(201).json(route);
  } catch (error) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
  }
};

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Public (should be protected in production)
exports.updateRoute = async (req, res) => {
  try {
    // Use save() to trigger middleware for distance calculation
    const route = await TourismRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Không tìm thấy tuyến du lịch' });
    }

    Object.assign(route, req.body);
    await route.save();
    await route.populate('points', 'name location category');
    
    res.json(route);
  } catch (error) {
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', error: error.message });
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Public (should be protected in production)
exports.deleteRoute = async (req, res) => {
  try {
    const route = await TourismRoute.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Không tìm thấy tuyến du lịch' });
    }
    res.json({ message: 'Đã xóa tuyến du lịch thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
