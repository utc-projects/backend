const mongoose = require('mongoose');

const adjustmentBreakdownSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  direction: { type: String, enum: ['revenue', 'cost'], default: 'cost' },
  mode: {
    type: String,
    enum: ['fixed', 'per_guest', 'percent_of_revenue', 'percent_of_cost'],
    default: 'fixed',
  },
  value: { type: Number, default: 0 },
  guestBasis: { type: String, enum: ['total', 'paying'], default: 'total' },
  amount: { type: Number, default: 0 },
}, { _id: false });

const tourEstimateSchema = new mongoose.Schema({
  // META
  is_deleted: { type: Boolean, default: false },
  status: { type: String, enum: ['Draft', 'Official'], default: 'Draft' },

  // SECTION A: GENERAL INFO
  code: { type: String, required: true, trim: true }, // Mã đoàn (Unique checks handled in controller/index)
  name: { type: String, required: true, trim: true }, // Tên đoàn
  route: { type: String }, // Hành trình
  startDate: { type: Date },
  endDate: { type: Date },
  duration: { type: Number, default: 0 },
  
  guestsCount: { type: Number, default: 0 }, // Tổng khách
  paxAdult: { type: Number, default: 0 },
  paxChild: { type: Number, default: 0 },
  paxInfant: { type: Number, default: 0 },
  paxFOC: { type: Number, default: 0 }, // Khách FOC

  operator: { type: String }, // Người điều hành
  contactPerson: { type: String }, // Người liên hệ
  email: { type: String },
  phone: { type: String },

  // SECTION B: REVENUE
  revenueItems: [{
    name: { type: String, required: true },
    paxAdult: { type: Number, default: 0 },
    priceAdult: { type: Number, default: 0 },
    paxChild: { type: Number, default: 0 },
    priceChild: { type: Number, default: 0 },
    paxOther: { type: Number, default: 0 },
    priceOther: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }
  }],
  paymentSchedule: [{
    content: String,
    dueDate: Date,
    amount: Number,
    status: String
  }],

  formulaProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'EstimateFormulaProfile', default: null },
  formulaProfileKey: { type: String, default: '' },
  formulaProfileName: { type: String, default: '' },
  formulaVersion: { type: Number, default: 1 },
  formulaSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  adjustmentBreakdown: { type: [adjustmentBreakdownSchema], default: [] },

  // SECTION C: COST BREAKDOWN
  // C.1 Restaurants
  restaurants: [{
    provider: { type: String, required: true },
    mealType: { type: String, enum: ['Sáng', 'Trưa', 'Tối', 'Ăn nhẹ', 'Ăn chính', 'Khác'], default: 'Trưa' },
    pax: { type: Number, default: 0 },
    sessions: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],

  // C.2 Hotels
  hotels: [{
    hotel: { type: String, required: true },
    roomType: { type: String, default: 'TWN' },
    roomQty: { type: Number, default: 0 },
    nights: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],

  // C.3 Tickets (Vé tham quan)
  tickets: [{
    location: { type: String, required: true },
    object: { type: String, enum: ['NL', 'TE', 'EB', 'Khác'], default: 'NL' },
    pax: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],

  // C.4 Transport (Vận chuyển)
  transport: [{
    name: { type: String, required: true }, // Hãng xe / Tên xe
    type: { type: String }, // Loại xe (45 chỗ...)
    qty: { type: Number, default: 1 },
    days: { type: Number, default: 1 },
    price: { type: Number, default: 0 }, // Giá per xe or package
    total: { type: Number, default: 0 }
  }],

  // C.5 Others
  others: [{
    item: { type: String, required: true },
    pax: { type: Number, default: 0 },
    usePax: { type: Boolean, default: false },
    multiplier: { type: Number, default: 1 },
    qty: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],

  // SECTION D: SUMMARY (Snapshot fields)
  baseRevenue: { type: Number, default: 0 },
  baseCost: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalNtCost: { type: Number, default: 0 },
  expectedProfit: { type: Number, default: 0 },

}, {
  timestamps: true
});

tourEstimateSchema.index({ code: 1 });
tourEstimateSchema.index({ status: 1, createdAt: -1 });
tourEstimateSchema.index({ is_deleted: 1, createdAt: -1 });

module.exports = mongoose.model('TourEstimate', tourEstimateSchema);
