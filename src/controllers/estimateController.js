const TourEstimate = require('../models/TourEstimate');

// @desc    Create new estimate
// @route   POST /api/estimates
// @access  Private
exports.createEstimate = async (req, res) => {
  try {
    const estimate = await TourEstimate.create(req.body);
    res.status(201).json({ success: true, data: estimate });
  } catch (error) {
    res.status(400).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get all estimates (Active only)
// @route   GET /api/estimates
// @access  Private
exports.getEstimates = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = { is_deleted: false };

    // Search filter (Code, Name, Customer)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { customer: searchRegex } // Assuming 'customer' field exists, or adjust as needed
      ];
    }

    // Status filter
    if (status && status !== 'All') {
      query.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
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
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
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
    res.status(500).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Update estimate
// @route   PUT /api/estimates/:id
// @access  Private
exports.updateEstimate = async (req, res) => {
  try {
    let estimate = await TourEstimate.findById(req.params.id);
    if (!estimate || estimate.is_deleted) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    estimate = await TourEstimate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: estimate });
  } catch (error) {
    res.status(400).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Soft Delete estimate
// @route   DELETE /api/estimates/:id
// @access  Private
exports.deleteEstimate = async (req, res) => {
  try {
    const estimate = await TourEstimate.findById(req.params.id);
    if (!estimate) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    // Soft delete
    estimate.is_deleted = true;
    await estimate.save();

    res.status(200).json({ success: true, message: 'Estimate deleted successfully (Soft)' });
  } catch (error) {
    res.status(500).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Clone estimate
// @route   POST /api/estimates/:id/clone
// @access  Private
exports.cloneEstimate = async (req, res) => {
  try {
    const source = await TourEstimate.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source estimate not found' });
    }

    const sourceObj = source.toObject();
    delete sourceObj._id;
    delete sourceObj.createdAt;
    delete sourceObj.updatedAt;
    delete sourceObj.__v;

    // Reset fields for Clone
    sourceObj.code = `${sourceObj.code}-COPY-${Date.now().toString().slice(-4)}`;
    sourceObj.name = `Copy of ${sourceObj.name}`;
    sourceObj.status = 'Draft';
    // Keep dates or reset? Spec says "XÓA TRẮNG: Ngày khởi hành". 
    // Mongoose Date can be null.
    sourceObj.startDate = null;
    sourceObj.endDate = null;
    sourceObj.duration = 0;

    const newEstimate = await TourEstimate.create(sourceObj);

    res.status(201).json({ success: true, data: newEstimate });
  } catch (error) {
    res.status(400).json({ success: false, ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};
