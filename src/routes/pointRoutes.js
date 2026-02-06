const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getAllPoints,
  getPointById,
  getPointsByCategory,
  getNearbyPoints,
  createPoint,
  updatePoint,
  deletePoint,
} = require('../controllers/pointController');

// All routes require authentication
router.use(protect);

// GET /api/points/nearby - must be before /:id
router.get('/nearby', getNearbyPoints);

// GET /api/points/category/:category
router.get('/category/:category', getPointsByCategory);

// GET /api/points
router.get('/', getAllPoints);

// GET /api/points/:id
router.get('/:id', getPointById);

// POST /api/points - create permission
const upload = require('../middlewares/uploadMiddleware');
const { interceptRequest } = require('../middlewares/approvalMiddleware');

router.post('/', authorize('points', 'create'), upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), interceptRequest('point'), createPoint);

// PUT /api/points/:id - edit permission
router.put('/:id', authorize('points', 'edit'), upload.fields([{ name: 'images', maxCount: 5 }, { name: 'videos', maxCount: 3 }]), interceptRequest('point'), updatePoint);

// DELETE /api/points/:id - delete permission
router.delete('/:id', authorize('points', 'delete'), interceptRequest('point'), deletePoint);

module.exports = router;

