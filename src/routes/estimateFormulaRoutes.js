const express = require('express');
const router = express.Router();

const {
  activateEstimateFormulaProfile,
  archiveEstimateFormulaProfile,
  createEstimateFormulaProfile,
  getEstimateFormulaProfileById,
  getEstimateFormulaProfiles,
  getEstimateFormulaSnapshot,
  updateEstimateFormulaProfile,
} = require('../controllers/estimateFormulaController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/default-snapshot', getEstimateFormulaSnapshot);

router.route('/')
  .get(getEstimateFormulaProfiles)
  .post(authorize('admin'), createEstimateFormulaProfile);

router.route('/:id')
  .get(getEstimateFormulaProfileById)
  .put(authorize('admin'), updateEstimateFormulaProfile)
  .delete(authorize('admin'), archiveEstimateFormulaProfile);

router.post('/:id/activate', authorize('admin'), activateEstimateFormulaProfile);

module.exports = router;
