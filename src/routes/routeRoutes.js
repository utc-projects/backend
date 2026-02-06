const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getAllRoutes,
  getRouteById,
  getRouteGeoJSON,
  getAllRoutesGeoJSON,
  createRoute,
  updateRoute,
  deleteRoute,
} = require('../controllers/routeController');

// All routes require authentication
router.use(protect);

// GET /api/routes/geojson - all routes as FeatureCollection
router.get('/geojson', getAllRoutesGeoJSON);

// GET /api/routes
router.get('/', getAllRoutes);

// GET /api/routes/:id
router.get('/:id', getRouteById);

// GET /api/routes/:id/geojson
router.get('/:id/geojson', getRouteGeoJSON);

// POST /api/routes - create permission
const { interceptRequest } = require('../middlewares/approvalMiddleware');
router.post('/', authorize('routes', 'create'), interceptRequest('route'), createRoute);

// PUT /api/routes/:id - edit permission
router.put('/:id', authorize('routes', 'edit'), interceptRequest('route'), updateRoute);

// DELETE /api/routes/:id - delete permission
router.delete('/:id', authorize('routes', 'delete'), interceptRequest('route'), deleteRoute);

module.exports = router;

