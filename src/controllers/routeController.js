const TourismRoute = require('../models/TourismRoute');
const TourismPoint = require('../models/TourismPoint');

// OSRM public demo server (for development)
// In production, you should use your own OSRM server
const OSRM_API = 'https://router.project-osrm.org';

// Prevent duplicate concurrent backfill jobs for the same route
const pendingGeometryBackfills = new Set();

const scheduleGeometryBackfill = (routeId) => {
  if (!routeId) return;
  const key = routeId.toString();
  if (pendingGeometryBackfills.has(key)) return;

  pendingGeometryBackfills.add(key);

  (async () => {
    try {
      const route = await TourismRoute.findById(routeId).select('_id points geometry');
      if (!route || !Array.isArray(route.points) || route.points.length < 2) return;

      const hasGeometry = route.geometry && Array.isArray(route.geometry.coordinates) && route.geometry.coordinates.length > 1;
      if (hasGeometry) return;

      route.markModified('points');
      await route.save();
    } catch (error) {
      console.warn(`Route geometry backfill failed for ${key}:`, error.message);
    } finally {
      pendingGeometryBackfills.delete(key);
    }
  })();
};

// Helper: Get road route geometry from OSRM
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
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
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
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
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

    // Use cached geometry or fallback to straight lines
    let geometry = route.geometry;
    
    // Fallback if no geometry cached (e.g. old data)
    if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
      const coordinates = route.points
        .filter(p => p.location?.coordinates)
        .map(p => p.location.coordinates);
        
      geometry = {
        type: 'LineString',
        coordinates: coordinates,
      };

      if (coordinates.length > 1) {
        scheduleGeometryBackfill(route._id);
      }
    }

    const geoJSON = {
      type: 'Feature',
      geometry: geometry,
      properties: {
        _id: route._id,
        routeName: route.routeName,
        description: route.description,
        duration: route.duration,
        totalDistance: route.totalDistance,
        roadDuration: route.roadDuration, 
        pointsCount: route.points.length,
        points: route.points.map(p => ({
          _id: p._id,
          name: p.name,
          category: p.category,
        })),
        isRoadRoute: route.isRoadRoute || false,
      },
    };

    res.json(geoJSON);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get all routes as GeoJSON FeatureCollection with road geometry
// @route   GET /api/routes/geojson
// @access  Public
exports.getAllRoutesGeoJSON = async (req, res) => {
  try {
    const routes = await TourismRoute.find()
      .populate('points', 'name location category');

    const features = routes.map((route) => {
      // Use cached geometry or fallback
      let geometry = route.geometry;
      
      if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
        const coordinates = route.points
          .filter(p => p.location?.coordinates)
          .map(p => p.location.coordinates);
          
        geometry = {
          type: 'LineString',
          coordinates: coordinates,
        };

        if (coordinates.length > 1) {
          scheduleGeometryBackfill(route._id);
        }
      }

      return {
        type: 'Feature',
        geometry: geometry,
        properties: {
          _id: route._id,
          routeName: route.routeName,
          description: route.description,
          duration: route.duration,
          totalDistance: route.totalDistance,
          roadDuration: route.roadDuration,
          pointsCount: route.points.length,
          isRoadRoute: route.isRoadRoute || false,
        },
      };
    });

    res.json({
      type: 'FeatureCollection',
      features: features,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
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
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
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
    res.status(400).json({ message: 'Dữ liệu không hợp lệ', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
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
    res.status(500).json({ message: 'Lỗi server', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};
