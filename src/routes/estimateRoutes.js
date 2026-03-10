const express = require('express');
const router = express.Router();
const {
  createEstimate,
  getEstimates,
  getEstimateById,
  updateEstimate,
  deleteEstimate,
  cloneEstimate,
  previewEstimate,
} = require('../controllers/estimateController');
const { protect } = require('../middlewares/authMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimit');

const previewLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Bạn gửi quá nhiều yêu cầu xem trước. Vui lòng thử lại sau ít phút.',
});

router.use(protect);

router.post('/preview', previewLimiter, previewEstimate);

router.route('/')
  .get(getEstimates)
  .post(createEstimate);

router.route('/:id')
  .get(getEstimateById)
  .put(updateEstimate)
  .delete(deleteEstimate);

router.route('/:id/clone')
  .post(cloneEstimate);

module.exports = router;
