const express = require('express');
const router = express.Router();
const {
  createEstimate,
  getEstimates,
  getEstimateById,
  updateEstimate,
  deleteEstimate,
  cloneEstimate
} = require('../controllers/estimateController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

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
