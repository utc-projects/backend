const crypto = require('crypto');
const TourEstimate = require('../models/TourEstimate');
const { calculateEstimate } = require('../services/estimateCalculationService');
const logger = require('../utils/logger');

const MAX_PAGINATION_LIMIT = 100;

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value, fallback, max = MAX_PAGINATION_LIMIT) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const getErrorStatusCode = (error, fallback = 500) => {
  if (error?.statusCode) {
    return error.statusCode;
  }

  if (error?.name === 'CastError') {
    return 400;
  }

  return fallback;
};

// @desc    Create new estimate
// @route   POST /api/estimates
// @access  Private
exports.createEstimate = async (req, res) => {
  try {
    const calculatedPayload = await calculateEstimate(req.body);
    const estimate = await TourEstimate.create(calculatedPayload);
    logger.info('estimate.created', {
      estimateId: estimate._id?.toString(),
      code: estimate.code,
      userId: req.user?._id?.toString(),
      formulaProfileId: estimate.formulaProfileId?.toString() || null,
    });
    res.status(201).json({ success: true, data: estimate });
  } catch (error) {
    logger.error('estimate.create_failed', {
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(error.statusCode || 400).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get all estimates (Active only)
// @route   GET /api/estimates
// @access  Private
exports.getEstimates = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = { is_deleted: false };

    // Search filter
    if (String(search || '').trim()) {
      const searchRegex = new RegExp(escapeRegex(String(search).trim()), 'i');
      query.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { route: searchRegex },
        { operator: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    // Status filter
    if (status && status !== 'All') {
      query.status = status;
    }

    const pageNum = parsePositiveInt(page, 1);
    const limitNum = parsePositiveInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await TourEstimate.countDocuments(query);
    const estimates = await TourEstimate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: estimates.length,
      data: estimates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      }
    });
  } catch (error) {
    logger.error('estimate.list_failed', {
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(getErrorStatusCode(error, 500)).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get estimate by ID
// @route   GET /api/estimates/:id
// @access  Private
exports.getEstimateById = async (req, res) => {
  try {
    const estimate = await TourEstimate.findById(req.params.id);
    if (!estimate || estimate.is_deleted) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }
    res.status(200).json({ success: true, data: estimate });
  } catch (error) {
    logger.error('estimate.get_failed', {
      estimateId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(getErrorStatusCode(error, 500)).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Update estimate
// @route   PUT /api/estimates/:id
// @access  Private
exports.updateEstimate = async (req, res) => {
  try {
    const existingEstimate = await TourEstimate.findById(req.params.id);
    let estimate = existingEstimate;
    if (!estimate || estimate.is_deleted) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    const calculatedPayload = await calculateEstimate(req.body, { existingEstimate });

    estimate = await TourEstimate.findByIdAndUpdate(req.params.id, calculatedPayload, {
      new: true,
      runValidators: true
    });

    logger.info('estimate.updated', {
      estimateId: estimate._id?.toString(),
      code: estimate.code,
      userId: req.user?._id?.toString(),
      formulaProfileId: estimate.formulaProfileId?.toString() || null,
    });
    res.status(200).json({ success: true, data: estimate });
  } catch (error) {
    logger.error('estimate.update_failed', {
      estimateId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(error.statusCode || 400).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Preview estimate calculation using selected formula profile
// @route   POST /api/estimates/preview
// @access  Private
exports.previewEstimate = async (req, res) => {
  try {
    const calculatedPayload = await calculateEstimate(req.body);
    res.status(200).json({ success: true, data: calculatedPayload });
  } catch (error) {
    logger.warn('estimate.preview_failed', {
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(error.statusCode || 400).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Soft Delete estimate
// @route   DELETE /api/estimates/:id
// @access  Private
exports.deleteEstimate = async (req, res) => {
  try {
    const estimate = await TourEstimate.findById(req.params.id);
    if (!estimate || estimate.is_deleted) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    // Soft delete
    estimate.is_deleted = true;
    await estimate.save();
    logger.info('estimate.deleted', {
      estimateId: estimate._id?.toString(),
      code: estimate.code,
      userId: req.user?._id?.toString(),
    });

    res.status(200).json({ success: true, message: 'Estimate deleted successfully (Soft)' });
  } catch (error) {
    logger.error('estimate.delete_failed', {
      estimateId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(getErrorStatusCode(error, 500)).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Clone estimate
// @route   POST /api/estimates/:id/clone
// @access  Private
exports.cloneEstimate = async (req, res) => {
  try {
    const source = await TourEstimate.findById(req.params.id);
    if (!source || source.is_deleted) {
      return res.status(404).json({ success: false, message: 'Source estimate not found' });
    }

    const sourceObj = source.toObject();
    delete sourceObj._id;
    delete sourceObj.createdAt;
    delete sourceObj.updatedAt;
    delete sourceObj.__v;

    // Reset fields for Clone
    sourceObj.code = `${sourceObj.code}-COPY-${crypto.randomBytes(4).toString('hex')}`;
    sourceObj.name = `Copy of ${sourceObj.name}`;
    sourceObj.status = 'Draft';
    // Keep dates or reset? Spec says "XÓA TRẮNG: Ngày khởi hành". 
    // Mongoose Date can be null.
    sourceObj.startDate = null;
    sourceObj.endDate = null;
    sourceObj.duration = 0;
    sourceObj.paymentSchedule = [];

    const recalculatedClone = await calculateEstimate(sourceObj, {
      forcedFormulaSnapshot: sourceObj.formulaSnapshot,
    });
    recalculatedClone.paymentSchedule = [];

    const newEstimate = await TourEstimate.create(recalculatedClone);
    logger.info('estimate.cloned', {
      sourceEstimateId: source._id?.toString(),
      estimateId: newEstimate._id?.toString(),
      code: newEstimate.code,
      userId: req.user?._id?.toString(),
    });

    res.status(201).json({ success: true, data: newEstimate });
  } catch (error) {
    logger.error('estimate.clone_failed', {
      sourceEstimateId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(error.statusCode || 400).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};
