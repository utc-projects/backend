const mongoose = require('mongoose');
const EstimateFormulaProfile = require('../models/EstimateFormulaProfile');
const TourEstimate = require('../models/TourEstimate');
const {
  buildFormulaSnapshotFromProfile,
  ensureDefaultEstimateFormulaProfile,
} = require('../services/estimateCalculationService');
const logger = require('../utils/logger');
const { auditSuccess, auditDenied, auditFailed } = require('../services/auditLogService');

const MAX_PAGINATION_LIMIT = 100;
const MAX_POLICY_NAME_LENGTH = 200;
const MAX_POLICY_DESCRIPTION_LENGTH = 2000;
const MAX_RULE_LABEL_LENGTH = 200;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const slugify = (value = '') => {
  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `estimate-formula-${Date.now()}`;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parsePositiveInt = (value, fallback, max = MAX_PAGINATION_LIMIT) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeProfilePayload = (body = {}, options = {}) => {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const familyKey = options.familyKey || slugify(body.familyKey || name);
  const paymentSchedule = (body.rules?.paymentSchedule || [])
    .map((item) => ({
      label: String(item?.label || '').trim(),
      percentage: toNumber(item?.percentage),
      dueDaysFromStart: toNumber(item?.dueDaysFromStart),
    }))
    .filter((item) => item.label && item.percentage > 0);
  const adjustments = (body.rules?.adjustments || [])
    .map((item) => ({
      label: String(item?.label || '').trim(),
      direction: item?.direction === 'revenue' ? 'revenue' : 'cost',
      mode: item?.mode || 'fixed',
      value: toNumber(item?.value),
      guestBasis: item?.guestBasis === 'paying' ? 'paying' : 'total',
      isActive: item?.isActive !== false,
    }))
    .filter((item) => item.label);

  return {
    familyKey,
    name,
    description,
    status: body.status || 'draft',
    isDefault: Boolean(body.isDefault),
    effectiveFrom: normalizeDate(body.effectiveFrom),
    effectiveTo: normalizeDate(body.effectiveTo),
    rules: {
      revenue: {
        childPricePercent: toNumber(body.rules?.revenue?.childPricePercent),
      },
      paymentSchedule,
      adjustments,
    },
  };
};

const validateProfilePayload = (payload) => {
  const errors = [];

  if (!payload.name) {
    errors.push('Tên chính sách là bắt buộc');
  }

  if (payload.name.length > MAX_POLICY_NAME_LENGTH) {
    errors.push(`Tên chính sách không được vượt quá ${MAX_POLICY_NAME_LENGTH} ký tự`);
  }

  if (payload.description.length > MAX_POLICY_DESCRIPTION_LENGTH) {
    errors.push(`Mô tả không được vượt quá ${MAX_POLICY_DESCRIPTION_LENGTH} ký tự`);
  }

  if (payload.status === 'active' && payload.isDefault === false) {
    // Allowed.
  }

  if (payload.isDefault && payload.status !== 'active') {
    errors.push('Chính sách mặc định phải ở trạng thái active');
  }

  const childPricePercent = toNumber(payload.rules?.revenue?.childPricePercent);
  if (childPricePercent < 0 || childPricePercent > 100) {
    errors.push('Tỷ lệ giá trẻ em phải nằm trong khoảng 0-100');
  }

  if (!payload.rules?.paymentSchedule?.length) {
    errors.push('Lịch thanh toán phải có ít nhất 1 đợt');
  }

  const totalPercentage = payload.rules.paymentSchedule.reduce((sum, item) => sum + item.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push('Tổng tỷ lệ lịch thanh toán phải bằng 100%');
  }

  payload.rules.paymentSchedule.forEach((item, index) => {
    if (item.label.length > MAX_RULE_LABEL_LENGTH) {
      errors.push(`Tên đợt thanh toán #${index + 1} không được vượt quá ${MAX_RULE_LABEL_LENGTH} ký tự`);
    }
  });

  payload.rules.adjustments.forEach((item, index) => {
    if (item.label.length > MAX_RULE_LABEL_LENGTH) {
      errors.push(`Tên khoản điều chỉnh #${index + 1} không được vượt quá ${MAX_RULE_LABEL_LENGTH} ký tự`);
    }
  });

  if (payload.effectiveFrom && payload.effectiveTo && payload.effectiveFrom > payload.effectiveTo) {
    errors.push('Ngày hiệu lực bắt đầu không được lớn hơn ngày kết thúc');
  }

  return errors;
};

const unsetDefaultFromOthers = async (profileId) => {
  await EstimateFormulaProfile.updateMany(
    { _id: { $ne: profileId }, isDefault: true },
    { $set: { isDefault: false } }
  );
};

const isDefaultConflictError = (error) => (
  error?.code === 11000 && Boolean(error?.keyPattern?.isDefault)
);

const getErrorStatusCode = (error, fallback = 500) => {
  if (error?.statusCode) {
    return error.statusCode;
  }

  if (error?.name === 'CastError' || error instanceof mongoose.Error.CastError) {
    return 400;
  }

  if (isDefaultConflictError(error)) {
    return 409;
  }

  return fallback;
};

exports.getEstimateFormulaProfiles = async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const status = req.query.status;
    const search = String(req.query.search || '').trim();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10);
    const shouldPaginate = req.query.page !== undefined || req.query.limit !== undefined;
    const query = {};

    if (req.user.role !== 'admin') {
      query.status = 'active';
    } else if (status && status !== 'all') {
      query.status = status;
    } else if (!includeArchived) {
      query.status = { $ne: 'archived' };
    }

    if (search) {
      const keyword = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: keyword },
        { description: keyword },
        { familyKey: keyword },
      ];
    }

    const queryBuilder = EstimateFormulaProfile.find(query)
      .sort({ isDefault: -1, familyKey: 1, version: -1, createdAt: -1 });

    if (shouldPaginate) {
      queryBuilder.skip((page - 1) * limit).limit(limit);
    }

    const [profiles, totalItems] = await Promise.all([
      queryBuilder,
      shouldPaginate ? EstimateFormulaProfile.countDocuments(query) : Promise.resolve(null),
    ]);

    res.json({
      success: true,
      data: profiles,
      ...(shouldPaginate && {
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      }),
    });
  } catch (error) {
    logger.error('estimate_formula.list_failed', {
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách chính sách báo giá',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.getEstimateFormulaProfileById = async (req, res) => {
  try {
    const profile = await EstimateFormulaProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách báo giá',
      });
    }

    if (req.user.role !== 'admin' && profile.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chính sách này',
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('estimate_formula.get_failed', {
      formulaProfileId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(500).json({
      success: false,
      message: 'Không thể tải chi tiết chính sách báo giá',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.createEstimateFormulaProfile = async (req, res) => {
  try {
    const payload = normalizeProfilePayload(req.body);
    const errors = validateProfilePayload(payload);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu chính sách không hợp lệ',
        errors,
      });
    }

    const latestProfile = await EstimateFormulaProfile.findOne({ familyKey: payload.familyKey })
      .sort({ version: -1, createdAt: -1 });

    if (payload.isDefault && payload.status === 'active') {
      await unsetDefaultFromOthers(null);
    }

    const profile = await EstimateFormulaProfile.create({
      ...payload,
      version: latestProfile ? latestProfile.version + 1 : 1,
    });
    logger.info('estimate_formula.created', {
      formulaProfileId: profile._id?.toString(),
      familyKey: profile.familyKey,
      version: profile.version,
      userId: req.user?._id?.toString(),
    });
    await auditSuccess(req, {
      event: 'estimate_formula.created',
      module: 'estimate_formula',
      action: 'create',
      target: { type: 'estimate_formula', id: profile._id, label: profile.name, secondaryId: profile.familyKey },
      summary: `${req.user.email} đã tạo chính sách báo giá ${profile.name}`,
      changes: { version: profile.version, status: profile.status, isDefault: profile.isDefault },
    });

    res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('estimate_formula.create_failed', {
      userId: req.user?._id?.toString(),
      error,
    });
    await auditFailed(req, {
      event: 'estimate_formula.created',
      module: 'estimate_formula',
      action: 'create',
      target: { type: 'estimate_formula', label: req.body?.name || '' },
      summary: 'Tạo chính sách báo giá thất bại',
      error,
    });
    res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: isDefaultConflictError(error)
        ? 'Đã có một chính sách mặc định đang hoạt động. Vui lòng thử lại.'
        : 'Không thể tạo chính sách báo giá',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.updateEstimateFormulaProfile = async (req, res) => {
  try {
    const sourceProfile = await EstimateFormulaProfile.findById(req.params.id);
    if (!sourceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách cần cập nhật',
      });
    }

    const payload = normalizeProfilePayload(req.body, { familyKey: sourceProfile.familyKey });
    const errors = validateProfilePayload(payload);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu chính sách không hợp lệ',
        errors,
      });
    }

    const latestVersion = await EstimateFormulaProfile.findOne({ familyKey: sourceProfile.familyKey })
      .sort({ version: -1, createdAt: -1 });

    if (payload.isDefault && payload.status === 'active') {
      await unsetDefaultFromOthers(sourceProfile._id);
    }

    const nextProfile = await EstimateFormulaProfile.create({
      ...payload,
      version: (latestVersion?.version || sourceProfile.version || 1) + 1,
    });

    if (sourceProfile.status === 'active' && nextProfile.status === 'active') {
      sourceProfile.status = 'archived';
      sourceProfile.isDefault = false;
      await sourceProfile.save();
    }

    logger.info('estimate_formula.updated', {
      sourceFormulaProfileId: sourceProfile._id?.toString(),
      nextFormulaProfileId: nextProfile._id?.toString(),
      familyKey: nextProfile.familyKey,
      version: nextProfile.version,
      userId: req.user?._id?.toString(),
    });
    await auditSuccess(req, {
      event: 'estimate_formula.updated',
      module: 'estimate_formula',
      action: 'update',
      target: { type: 'estimate_formula', id: nextProfile._id, label: nextProfile.name, secondaryId: nextProfile.familyKey },
      summary: `${req.user.email} đã cập nhật chính sách báo giá ${nextProfile.name}`,
      metadata: { sourceFormulaProfileId: sourceProfile._id },
      changes: { version: nextProfile.version, status: nextProfile.status, isDefault: nextProfile.isDefault },
    });

    res.json({
      success: true,
      message: 'Đã tạo phiên bản chính sách mới',
      data: nextProfile,
    });
  } catch (error) {
    logger.error('estimate_formula.update_failed', {
      formulaProfileId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    await auditFailed(req, {
      event: 'estimate_formula.updated',
      module: 'estimate_formula',
      action: 'update',
      target: { type: 'estimate_formula', id: req.params.id, label: req.params.id },
      summary: 'Cập nhật chính sách báo giá thất bại',
      error,
    });
    res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: isDefaultConflictError(error)
        ? 'Đã có một chính sách mặc định đang hoạt động. Vui lòng thử lại.'
        : 'Không thể cập nhật chính sách báo giá',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.activateEstimateFormulaProfile = async (req, res) => {
  try {
    const profile = await EstimateFormulaProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách báo giá',
      });
    }

    profile.status = 'active';
    const shouldMakeDefault = req.body?.isDefault === true
      || !await EstimateFormulaProfile.exists({ isDefault: true, status: 'active', _id: { $ne: profile._id } });

    if (shouldMakeDefault) {
      await unsetDefaultFromOthers(profile._id);
      profile.isDefault = true;
    } else {
      profile.isDefault = false;
    }
    await profile.save();
    logger.info('estimate_formula.activated', {
      formulaProfileId: profile._id?.toString(),
      familyKey: profile.familyKey,
      version: profile.version,
      isDefault: profile.isDefault,
      userId: req.user?._id?.toString(),
    });
    await auditSuccess(req, {
      event: 'estimate_formula.activated',
      module: 'estimate_formula',
      action: 'activate',
      target: { type: 'estimate_formula', id: profile._id, label: profile.name, secondaryId: profile.familyKey },
      summary: `${req.user.email} đã kích hoạt chính sách báo giá ${profile.name}`,
      changes: { status: profile.status, isDefault: profile.isDefault },
    });

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('estimate_formula.activate_failed', {
      formulaProfileId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    await auditFailed(req, {
      event: 'estimate_formula.activated',
      module: 'estimate_formula',
      action: 'activate',
      target: { type: 'estimate_formula', id: req.params.id, label: req.params.id },
      summary: 'Kích hoạt chính sách báo giá thất bại',
      error,
    });
    res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: isDefaultConflictError(error)
        ? 'Đã có một chính sách mặc định đang hoạt động. Vui lòng thử lại.'
        : 'Không thể kích hoạt chính sách báo giá',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.archiveEstimateFormulaProfile = async (req, res) => {
  try {
    const profile = await EstimateFormulaProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chính sách báo giá',
      });
    }

    const inUseCount = await TourEstimate.countDocuments({
      formulaProfileId: profile._id,
      is_deleted: false,
    });

    if (inUseCount > 0 && req.body?.force !== true) {
      await auditDenied(req, {
        event: 'estimate_formula.archived',
        module: 'estimate_formula',
        action: 'archive',
        target: { type: 'estimate_formula', id: profile._id, label: profile.name, secondaryId: profile.familyKey },
        summary: `Từ chối lưu trữ chính sách ${profile.name} vì đang được sử dụng`,
        reason: 'IN_USE',
        changes: { inUseCount },
      });
      return res.status(409).json({
        success: false,
        message: `Chính sách này đang được ${inUseCount} dự toán sử dụng. Bạn có chắc chắn vẫn muốn lưu trữ không?`,
        inUseCount,
        requireConfirmation: true,
      });
    }

    profile.status = 'archived';
    profile.isDefault = false;
    await profile.save();
    await ensureDefaultEstimateFormulaProfile();
    logger.info('estimate_formula.archived', {
      formulaProfileId: profile._id?.toString(),
      familyKey: profile.familyKey,
      version: profile.version,
      inUseCount,
      userId: req.user?._id?.toString(),
    });
    await auditSuccess(req, {
      event: 'estimate_formula.archived',
      module: 'estimate_formula',
      action: 'archive',
      target: { type: 'estimate_formula', id: profile._id, label: profile.name, secondaryId: profile.familyKey },
      summary: `${req.user.email} đã lưu trữ chính sách báo giá ${profile.name}`,
      changes: { inUseCount, status: profile.status },
    });

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('estimate_formula.archive_failed', {
      formulaProfileId: req.params.id,
      userId: req.user?._id?.toString(),
      error,
    });
    await auditFailed(req, {
      event: 'estimate_formula.archived',
      module: 'estimate_formula',
      action: 'archive',
      target: { type: 'estimate_formula', id: req.params.id, label: req.params.id },
      summary: 'Lưu trữ chính sách báo giá thất bại',
      error,
    });
    res.status(getErrorStatusCode(error, 400)).json({
      success: false,
      message: 'Không thể lưu trữ chính sách báo giá',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

exports.getEstimateFormulaSnapshot = async (req, res) => {
  try {
    const profile = await ensureDefaultEstimateFormulaProfile();
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có chính sách mặc định hoặc chính sách đang hoạt động',
      });
    }

    res.json({
      success: true,
      data: buildFormulaSnapshotFromProfile(profile),
    });
  } catch (error) {
    logger.error('estimate_formula.default_snapshot_failed', {
      userId: req.user?._id?.toString(),
      error,
    });
    res.status(getErrorStatusCode(error, 500)).json({
      success: false,
      message: 'Không thể tải chính sách mặc định',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};
