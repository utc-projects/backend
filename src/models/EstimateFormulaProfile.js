const mongoose = require('mongoose');

const paymentRuleSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 200 },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  dueDaysFromStart: { type: Number, default: 0 },
}, { _id: false });

const adjustmentRuleSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 200 },
  direction: { type: String, enum: ['revenue', 'cost'], default: 'cost' },
  mode: {
    type: String,
    enum: ['fixed', 'per_guest', 'percent_of_revenue', 'percent_of_cost'],
    required: true,
  },
  value: { type: Number, default: 0 },
  guestBasis: { type: String, enum: ['total', 'paying'], default: 'total' },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const estimateFormulaProfileSchema = new mongoose.Schema({
  familyKey: {
    type: String,
    required: true,
    trim: true,
    index: true,
    maxlength: 120,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  version: {
    type: Number,
    default: 1,
    min: 1,
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },
  effectiveFrom: {
    type: Date,
    default: null,
  },
  effectiveTo: {
    type: Date,
    default: null,
  },
  rules: {
    revenue: {
      childPricePercent: { type: Number, default: 50, min: 0, max: 100 },
    },
    paymentSchedule: {
      type: [paymentRuleSchema],
      default: () => ([
        { label: 'Đặt cọc lần 1', percentage: 50, dueDaysFromStart: -30 },
        { label: 'Đặt cọc lần 2', percentage: 30, dueDaysFromStart: -7 },
        { label: 'Còn phải thu', percentage: 20, dueDaysFromStart: 0 },
      ]),
    },
    adjustments: {
      type: [adjustmentRuleSchema],
      default: [],
    },
  },
}, {
  timestamps: true,
});

estimateFormulaProfileSchema.index({ familyKey: 1, version: -1 }, { unique: true });
estimateFormulaProfileSchema.index(
  { isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDefault: true,
      status: 'active',
    },
  }
);

module.exports = mongoose.model('EstimateFormulaProfile', estimateFormulaProfileSchema);
