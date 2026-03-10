const EstimateFormulaProfile = require('../models/EstimateFormulaProfile');
const logger = require('../utils/logger');

const DEFAULT_FORMULA_FAMILY_KEY = 'standard-tour-formula';
const ALLOWED_ESTIMATE_STATUSES = new Set(['Draft', 'Official']);

const EMPTY_FORMULA_SNAPSHOT = {
  profileId: null,
  familyKey: DEFAULT_FORMULA_FAMILY_KEY,
  name: '',
  version: null,
  revenue: {
    childPricePercent: 0,
  },
  paymentSchedule: [],
  adjustments: [],
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => Math.round(toNumber(value));

const clonePlain = (value) => JSON.parse(JSON.stringify(value ?? null));

const addDays = (inputDate, days) => {
  if (!inputDate) return null;
  const date = new Date(inputDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + toNumber(days));
  return date;
};

const deriveDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const normalizePaymentScheduleRules = (rules = []) => (
  (rules || [])
    .map((rule) => ({
      label: String(rule?.label || '').trim(),
      percentage: toNumber(rule?.percentage),
      dueDaysFromStart: toNumber(rule?.dueDaysFromStart),
    }))
    .filter((rule) => rule.label && rule.percentage > 0)
);

const normalizeAdjustmentRules = (adjustments = []) => (
  (adjustments || [])
    .map((adjustment) => ({
      label: String(adjustment?.label || '').trim(),
      direction: adjustment?.direction === 'revenue' ? 'revenue' : 'cost',
      mode: adjustment?.mode || 'fixed',
      value: toNumber(adjustment?.value),
      guestBasis: adjustment?.guestBasis === 'paying' ? 'paying' : 'total',
      isActive: adjustment?.isActive !== false,
    }))
    .filter((adjustment) => adjustment.label)
);

const normalizeFormulaSnapshot = (formula) => {
  const snapshot = formula || {};

  return {
    profileId: snapshot.profileId || snapshot._id || EMPTY_FORMULA_SNAPSHOT.profileId,
    familyKey: snapshot.familyKey || EMPTY_FORMULA_SNAPSHOT.familyKey,
    name: snapshot.name || EMPTY_FORMULA_SNAPSHOT.name,
    version: snapshot.version !== undefined && snapshot.version !== null
      ? toNumber(snapshot.version)
      : EMPTY_FORMULA_SNAPSHOT.version,
    revenue: {
      childPricePercent: toNumber(
        snapshot?.revenue?.childPricePercent
          ?? snapshot?.rules?.revenue?.childPricePercent
          ?? EMPTY_FORMULA_SNAPSHOT.revenue.childPricePercent
      ),
    },
    paymentSchedule: normalizePaymentScheduleRules(
      snapshot?.paymentSchedule || snapshot?.rules?.paymentSchedule
    ),
    adjustments: normalizeAdjustmentRules(
      snapshot?.adjustments || snapshot?.rules?.adjustments
    ),
  };
};

const buildFormulaSnapshotFromProfile = (profile) => normalizeFormulaSnapshot({
  profileId: profile?._id ? String(profile._id) : null,
  familyKey: profile?.familyKey,
  name: profile?.name,
  version: profile?.version,
  rules: clonePlain(profile?.rules),
});

const normalizeRevenueItem = (item = {}, childPricePercent) => {
  const paxAdult = toNumber(item.paxAdult);
  const priceAdult = toNumber(item.priceAdult);
  const paxChild = toNumber(item.paxChild);
  const priceChild = roundMoney(priceAdult * toNumber(childPricePercent) / 100);
  const paxOther = toNumber(item.paxOther);
  const priceOther = toNumber(item.priceOther);

  return {
    name: item.name || '',
    paxAdult,
    priceAdult,
    paxChild,
    priceChild,
    paxOther,
    priceOther,
    totalAmount: roundMoney(
      (paxAdult * priceAdult) +
      (paxChild * priceChild) +
      (paxOther * priceOther)
    ),
  };
};

const normalizeRestaurantItem = (item = {}) => {
  const pax = toNumber(item.pax);
  const sessions = toNumber(item.sessions || 1);
  const price = toNumber(item.price);

  return {
    provider: item.provider || '',
    mealType: item.mealType || 'Trưa',
    pax,
    sessions,
    price,
    total: roundMoney(pax * sessions * price),
  };
};

const normalizeHotelItem = (item = {}) => {
  const roomQty = toNumber(item.roomQty || 1);
  const nights = toNumber(item.nights || 1);
  const price = toNumber(item.price);

  return {
    hotel: item.hotel || '',
    roomType: item.roomType || 'TWN',
    roomQty,
    nights,
    price,
    total: roundMoney(roomQty * nights * price),
  };
};

const normalizeTicketItem = (item = {}) => {
  const pax = toNumber(item.pax);
  const price = toNumber(item.price);

  return {
    location: item.location || '',
    object: item.object || 'NL',
    pax,
    price,
    total: roundMoney(pax * price),
  };
};

const normalizeTransportItem = (item = {}) => {
  const qty = toNumber(item.qty || 1);
  const days = toNumber(item.days || 1);
  const price = toNumber(item.price);

  return {
    name: item.name || '',
    type: item.type || '',
    qty,
    days,
    price,
    total: roundMoney(qty * days * price),
  };
};

const normalizeOtherItem = (item = {}) => {
  const qty = toNumber(item.qty || 1);
  const pax = toNumber(item.pax);
  const usePax = Boolean(item.usePax);
  const multiplier = toNumber(item.multiplier || 1);
  const price = toNumber(item.price);
  const paxFactor = usePax ? pax : 1;

  return {
    item: item.item || '',
    qty,
    pax,
    usePax,
    multiplier,
    price,
    total: roundMoney(qty * price * paxFactor * multiplier),
  };
};

const calculateAdjustmentAmount = (adjustment, context) => {
  switch (adjustment.mode) {
    case 'fixed':
      return roundMoney(adjustment.value);
    case 'per_guest': {
      const guestCount = adjustment.guestBasis === 'paying'
        ? context.payingGuests
        : context.totalGuests;
      return roundMoney(guestCount * adjustment.value);
    }
    case 'percent_of_revenue':
      return roundMoney(context.baseRevenue * adjustment.value / 100);
    case 'percent_of_cost':
      return roundMoney(context.baseCost * adjustment.value / 100);
    default:
      return 0;
  }
};

const buildPaymentSchedule = (rules, startDate, totalRevenue) => {
  const normalizedRules = normalizePaymentScheduleRules(rules);
  const amounts = [];
  let allocated = 0;

  normalizedRules.forEach((rule, index) => {
    if (index === normalizedRules.length - 1) {
      amounts.push(roundMoney(totalRevenue - allocated));
      return;
    }

    const amount = roundMoney(totalRevenue * rule.percentage / 100);
    amounts.push(amount);
    allocated += amount;
  });

  return normalizedRules.map((rule, index) => ({
    content: `${rule.label} (${rule.percentage}%)`,
    dueDate: addDays(startDate, rule.dueDaysFromStart),
    amount: amounts[index],
    status: 'pending',
  }));
};

const findPreferredFormulaProfile = async (startDate) => {
  const conditions = { status: 'active' };

  if (startDate) {
    const effectiveDate = new Date(startDate);
    if (!Number.isNaN(effectiveDate.getTime())) {
      conditions.$and = [
        {
          $or: [
            { effectiveFrom: null },
            { effectiveFrom: { $lte: effectiveDate } },
          ],
        },
        {
          $or: [
            { effectiveTo: null },
            { effectiveTo: { $gte: effectiveDate } },
          ],
        },
      ];
    }
  }

  const preferred = await EstimateFormulaProfile.findOne(conditions)
    .sort({ effectiveFrom: -1, isDefault: -1, version: -1, createdAt: -1 });

  if (preferred) {
    return preferred;
  }

  return ensureDefaultEstimateFormulaProfile();
};

const ensureDefaultEstimateFormulaProfile = async () => {
  let profile = await EstimateFormulaProfile.findOne({ isDefault: true, status: 'active' })
    .sort({ version: -1, createdAt: -1 });

  if (profile) {
    return profile;
  }

  profile = await EstimateFormulaProfile.findOne({ status: 'active' })
    .sort({ version: -1, createdAt: -1 });

  if (profile) {
    if (!profile.isDefault) {
      profile.isDefault = true;
      await profile.save();
    }
    return profile;
  }

  return null;
};

const resolveFormulaSnapshot = async ({ payload, existingEstimate = null, forcedFormulaSnapshot = null }) => {
  if (forcedFormulaSnapshot) {
    return normalizeFormulaSnapshot(forcedFormulaSnapshot);
  }

  if (payload?.formulaProfileId) {
    const profile = await EstimateFormulaProfile.findById(payload.formulaProfileId);
    if (!profile) {
      const error = new Error('Không tìm thấy chính sách báo giá được chọn');
      error.statusCode = 404;
      throw error;
    }
    return buildFormulaSnapshotFromProfile(profile);
  }

  if (existingEstimate?.formulaSnapshot) {
    return normalizeFormulaSnapshot(existingEstimate.formulaSnapshot);
  }

  const preferredProfile = await findPreferredFormulaProfile(payload?.startDate);
  if (!preferredProfile) {
    const error = new Error('Chưa có chính sách báo giá nào đang hoạt động. Vui lòng tạo hoặc kích hoạt ít nhất 1 chính sách.');
    error.statusCode = 400;
    throw error;
  }
  return buildFormulaSnapshotFromProfile(preferredProfile);
};

const mergeWithExistingEstimate = (payload = {}, existingEstimate = null) => {
  if (!existingEstimate) {
    return payload || {};
  }

  const existingPlain = typeof existingEstimate.toObject === 'function'
    ? existingEstimate.toObject()
    : existingEstimate;

  return {
    ...existingPlain,
    ...payload,
  };
};

const calculateEstimate = async (payload = {}, options = {}) => {
  if (payload?.status !== undefined && payload?.status !== null && !ALLOWED_ESTIMATE_STATUSES.has(payload.status)) {
    const error = new Error('Trạng thái dự toán không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const sourcePayload = mergeWithExistingEstimate(payload, options.existingEstimate);
  const formulaSnapshot = await resolveFormulaSnapshot({
    payload: sourcePayload,
    existingEstimate: options.existingEstimate,
    forcedFormulaSnapshot: options.forcedFormulaSnapshot,
  });

  const childPricePercent = toNumber(formulaSnapshot?.revenue?.childPricePercent);
  const revenueItems = (sourcePayload.revenueItems || []).map((item) => normalizeRevenueItem(item, childPricePercent));
  const restaurants = (sourcePayload.restaurants || []).map(normalizeRestaurantItem);
  const hotels = (sourcePayload.hotels || []).map(normalizeHotelItem);
  const tickets = (sourcePayload.tickets || []).map(normalizeTicketItem);
  const transport = (sourcePayload.transport || []).map(normalizeTransportItem);
  const others = (sourcePayload.others || []).map(normalizeOtherItem);

  const baseRevenue = roundMoney(revenueItems.reduce((sum, item) => sum + item.totalAmount, 0));
  const baseCost = roundMoney(
    restaurants.reduce((sum, item) => sum + item.total, 0) +
    hotels.reduce((sum, item) => sum + item.total, 0) +
    tickets.reduce((sum, item) => sum + item.total, 0) +
    transport.reduce((sum, item) => sum + item.total, 0) +
    others.reduce((sum, item) => sum + item.total, 0)
  );

  const guestsCountInput = toNumber(sourcePayload.guestsCount);
  const paxAdult = roundMoney(revenueItems.reduce((sum, item) => sum + item.paxAdult, 0));
  const paxChild = roundMoney(revenueItems.reduce((sum, item) => sum + item.paxChild, 0));
  const paxInfant = roundMoney(revenueItems.reduce((sum, item) => sum + item.paxOther, 0));
  const derivedPayingGuests = paxAdult + paxChild + paxInfant;
  const paxFOC = toNumber(sourcePayload.paxFOC);
  const payingGuestsInput = Math.max(0, guestsCountInput - paxFOC);

  if (payingGuestsInput > 0 && derivedPayingGuests > 0 && payingGuestsInput !== derivedPayingGuests) {
    logger.warn('estimate.guests_count_mismatch', {
      code: sourcePayload.code || '',
      guestsCountInput,
      paxFOC,
      payingGuestsInput,
      derivedPayingGuests,
    });
  }

  const payingGuests = derivedPayingGuests > 0 ? derivedPayingGuests : payingGuestsInput;
  const guestsCount = Math.max(guestsCountInput, payingGuests + paxFOC);

  const adjustmentContext = {
    baseRevenue,
    baseCost,
    totalGuests: guestsCount,
    payingGuests,
  };

  const adjustmentBreakdown = formulaSnapshot.adjustments
    .filter((adjustment) => adjustment.isActive)
    .map((adjustment) => ({
      label: adjustment.label,
      direction: adjustment.direction,
      mode: adjustment.mode,
      value: adjustment.value,
      guestBasis: adjustment.guestBasis,
      amount: calculateAdjustmentAmount(adjustment, adjustmentContext),
    }));

  const revenueAdjustmentTotal = roundMoney(
    adjustmentBreakdown
      .filter((adjustment) => adjustment.direction === 'revenue')
      .reduce((sum, adjustment) => sum + adjustment.amount, 0)
  );

  const costAdjustmentTotal = roundMoney(
    adjustmentBreakdown
      .filter((adjustment) => adjustment.direction === 'cost')
      .reduce((sum, adjustment) => sum + adjustment.amount, 0)
  );

  const totalRevenue = roundMoney(baseRevenue + revenueAdjustmentTotal);
  const totalNtCost = roundMoney(baseCost + costAdjustmentTotal);
  const expectedProfit = roundMoney(totalRevenue - totalNtCost);

  const normalizedStartDate = sourcePayload.startDate ? new Date(sourcePayload.startDate) : null;
  const normalizedEndDate = sourcePayload.endDate ? new Date(sourcePayload.endDate) : null;
  const duration = toNumber(sourcePayload.duration || sourcePayload.days) || deriveDuration(normalizedStartDate, normalizedEndDate);

  return {
    is_deleted: Boolean(sourcePayload.is_deleted),
    status: sourcePayload.status === 'Official' ? 'Official' : 'Draft',
    code: sourcePayload.code,
    name: sourcePayload.name,
    route: sourcePayload.route || '',
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    duration,
    guestsCount,
    paxAdult,
    paxChild,
    paxInfant,
    paxFOC,
    operator: sourcePayload.operator || '',
    contactPerson: sourcePayload.contactPerson || '',
    email: sourcePayload.email || '',
    phone: sourcePayload.phone || sourcePayload.contact || '',
    revenueItems,
    paymentSchedule: buildPaymentSchedule(
      formulaSnapshot.paymentSchedule,
      normalizedStartDate,
      totalRevenue
    ),
    restaurants,
    hotels,
    tickets,
    transport,
    others,
    formulaProfileId: formulaSnapshot.profileId || null,
    formulaProfileKey: formulaSnapshot.familyKey,
    formulaProfileName: formulaSnapshot.name,
    formulaVersion: formulaSnapshot.version,
    formulaSnapshot,
    adjustmentBreakdown,
    baseRevenue,
    baseCost,
    totalRevenue,
    totalNtCost,
    expectedProfit,
  };
};

module.exports = {
  buildFormulaSnapshotFromProfile,
  calculateEstimate,
  ensureDefaultEstimateFormulaProfile,
  findPreferredFormulaProfile,
  normalizeFormulaSnapshot,
};
