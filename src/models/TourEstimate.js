const mongoose = require('mongoose');

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
    totalAmount: { type: Number, default: 0 }
  }],
  paymentSchedule: [{
    content: String,
    dueDate: Date,
    amount: Number,
    status: String
  }],

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
    qty: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }],

  // SECTION D: SUMMARY (Snapshot fields)
  totalRevenue: { type: Number, default: 0 },
  totalNtCost: { type: Number, default: 0 },
  expectedProfit: { type: Number, default: 0 },

}, {
  timestamps: true
});

module.exports = mongoose.model('TourEstimate', tourEstimateSchema);
