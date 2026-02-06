const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getAllProviders,
  getProviderById,
  getProvidersByType,
  getProvidersBySubType,
  getProvidersByRoute,
  getNearbyProviders,
  getServiceTypes,
  getCategoriesWithSubTypes,
  createProvider,
  updateProvider,
  deleteProvider,
} = require('../controllers/providerController');
const createUploadMiddleware = require('../middlewares/uploadMiddleware');
const upload = createUploadMiddleware('providers', 'provider');

// All routes require authentication
router.use(protect);

// GET /api/providers/categories - full hierarchy with counts (for multi-level filter)
router.get('/categories', getCategoriesWithSubTypes);

// GET /api/providers/types - service type labels with counts
router.get('/types', getServiceTypes);

// GET /api/providers/nearby
router.get('/nearby', getNearbyProviders);

// GET /api/providers/type/:serviceType
router.get('/type/:serviceType', getProvidersByType);

// GET /api/providers/subtype/:subType
router.get('/subtype/:subType', getProvidersBySubType);

// GET /api/providers/route/:routeId - providers linked to a route
router.get('/route/:routeId', getProvidersByRoute);

// GET /api/providers
router.get('/', getAllProviders);

// GET /api/providers/:id
router.get('/:id', getProviderById);

// POST /api/providers - create permission
const { interceptRequest } = require('../middlewares/approvalMiddleware');
router.post('/', authorize('providers', 'create'), upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), interceptRequest('provider'), createProvider);

// PUT /api/providers/:id - edit permission
router.put('/:id', authorize('providers', 'edit'), upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), interceptRequest('provider'), updateProvider);

// DELETE /api/providers/:id - delete permission
router.delete('/:id', authorize('providers', 'delete'), interceptRequest('provider'), deleteProvider);

module.exports = router;

