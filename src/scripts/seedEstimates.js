/**
 * Seed script for tour estimates
 * Run with: node src/scripts/seedEstimates.js
 */

const mongoose = require('mongoose');
const TourEstimate = require('../models/TourEstimate');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calcRevenueItem = (item) => {
  const paxAdult = toNumber(item.paxAdult);
  const priceAdult = toNumber(item.priceAdult);
  const paxChild = toNumber(item.paxChild);
  const priceChild = toNumber(item.priceChild || priceAdult / 2);
  const paxOther = toNumber(item.paxOther);
  const priceOther = toNumber(item.priceOther);

  return {
    ...item,
    paxAdult,
    priceAdult,
    paxChild,
    priceChild,
    paxOther,
    priceOther,
    totalAmount: paxAdult * priceAdult + paxChild * priceChild + paxOther * priceOther,
  };
};

const calcRestaurantItem = (item) => {
  const pax = toNumber(item.pax);
  const sessions = toNumber(item.sessions || 1);
  const price = toNumber(item.price);
  return { ...item, pax, sessions, price, total: pax * sessions * price };
};

const calcHotelItem = (item) => {
  const roomQty = toNumber(item.roomQty);
  const nights = toNumber(item.nights);
  const price = toNumber(item.price);
  return { ...item, roomQty, nights, price, total: roomQty * nights * price };
};

const calcTicketItem = (item) => {
  const pax = toNumber(item.pax);
  const price = toNumber(item.price);
  return { ...item, pax, price, total: pax * price };
};

const calcTransportItem = (item) => {
  const qty = toNumber(item.qty || 1);
  const days = toNumber(item.days || 1);
  const price = toNumber(item.price);
  return { ...item, qty, days, price, total: qty * days * price };
};

const calcOtherItem = (item) => {
  const qty = toNumber(item.qty || 1);
  const pax = toNumber(item.pax);
  const price = toNumber(item.price);
  const multiplier = toNumber(item.multiplier || 1);
  const usePax = Boolean(item.usePax);
  const paxFactor = usePax ? pax : 1;
  return { ...item, qty, pax, price, multiplier, usePax, total: qty * price * paxFactor * multiplier };
};

const addDays = (date, days) => {
  const cloned = new Date(date);
  cloned.setDate(cloned.getDate() + days);
  return cloned;
};

const buildPaymentSchedule = (startDate, totalRevenue) => {
  const start = new Date(startDate);
  return [
    {
      content: 'Đặt cọc lần 1 (50%)',
      dueDate: addDays(start, -30),
      amount: totalRevenue * 0.5,
      status: 'pending',
    },
    {
      content: 'Đặt cọc lần 2 (30%)',
      dueDate: addDays(start, -7),
      amount: totalRevenue * 0.3,
      status: 'pending',
    },
    {
      content: 'Còn phải thu (20%)',
      dueDate: addDays(start, 0),
      amount: totalRevenue * 0.2,
      status: 'pending',
    },
  ];
};

const finalizeEstimate = (estimate) => {
  const revenueItems = (estimate.revenueItems || []).map(calcRevenueItem);
  const restaurants = (estimate.restaurants || []).map(calcRestaurantItem);
  const hotels = (estimate.hotels || []).map(calcHotelItem);
  const tickets = (estimate.tickets || []).map(calcTicketItem);
  const transport = (estimate.transport || []).map(calcTransportItem);
  const others = (estimate.others || []).map(calcOtherItem);

  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalNtCost =
    restaurants.reduce((sum, item) => sum + item.total, 0) +
    hotels.reduce((sum, item) => sum + item.total, 0) +
    tickets.reduce((sum, item) => sum + item.total, 0) +
    transport.reduce((sum, item) => sum + item.total, 0) +
    others.reduce((sum, item) => sum + item.total, 0);

  return {
    ...estimate,
    revenueItems,
    restaurants,
    hotels,
    tickets,
    transport,
    others,
    paymentSchedule: buildPaymentSchedule(estimate.startDate, totalRevenue),
    totalRevenue,
    totalNtCost,
    expectedProfit: totalRevenue - totalNtCost,
  };
};

const rawEstimates = [
  {
    is_deleted: false,
    status: 'Official',
    code: 'T.176202X-ND',
    name: 'Tập đoàn TNR',
    route: 'HN - Lăng Cô - Huế - HN',
    operator: 'Mrs Hường',
    contactPerson: 'Nguyễn Đức Nam',
    phone: '0912345678',
    startDate: new Date('2026-06-17'),
    endDate: new Date('2026-06-21'),
    duration: 5,
    guestsCount: 61,
    paxFOC: 0,
    paxAdult: 48,
    paxChild: 7,
    paxInfant: 6,
    revenueItems: [
      { name: 'Tour trọn gói', paxAdult: 48, priceAdult: 4250000, paxChild: 7, paxOther: 6, priceOther: 0 },
    ],
    restaurants: [
      { provider: 'Lăng Cô Beach Resort', mealType: 'Trưa', pax: 52, sessions: 2, price: 150000 },
      { provider: 'Minh Tâm', mealType: 'Tối', pax: 52, sessions: 1, price: 150000 },
      { provider: 'Làng Chài', mealType: 'Trưa', pax: 52, sessions: 1, price: 150000 },
      { provider: 'Cơm niêu Khải Hoàn', mealType: 'Tối', pax: 52, sessions: 1, price: 150000 },
      { provider: 'Nhà hàng Nổi', mealType: 'Trưa', pax: 52, sessions: 1, price: 150000 },
      { provider: 'Năm Châu Hội Quán', mealType: 'Tối', pax: 52, sessions: 1, price: 150000 },
    ],
    hotels: [
      { hotel: 'Lăng Cô Beach Resort', roomType: 'TWN', roomQty: 12, nights: 2, price: 1250000 },
      { hotel: 'Lăng Cô Beach Resort', roomType: 'DBL', roomQty: 12, nights: 2, price: 1500000 },
      { hotel: 'Duy Tân', roomType: 'TWN', roomQty: 12, nights: 1, price: 850000 },
      { hotel: 'Duy Tân', roomType: 'DBL', roomQty: 12, nights: 1, price: 850000 },
    ],
    tickets: [
      { location: 'Thiền viện Trúc Lâm Bạch Mã', object: 'NL', pax: 48, price: 60000 },
      { location: 'Đại Nội', object: 'NL', pax: 48, price: 200000 },
      { location: 'Đại Nội', object: 'TE', pax: 7, price: 40000 },
      { location: 'Lăng Khải Định', object: 'NL', pax: 48, price: 150000 },
      { location: 'Lăng Khải Định', object: 'TE', pax: 7, price: 30000 },
    ],
    transport: [
      { name: 'Xe ô tô Kha Trần', type: '45 chỗ', qty: 1, days: 1, price: 17000000 },
      { name: 'Xe ô tô Hồ Lộc', type: '35 chỗ', qty: 1, days: 1, price: 13500000 },
      { name: 'Thuyền sông Hương', type: 'Thuyền', qty: 2, days: 1, price: 1200000 },
      { name: 'Thuyền thiền viện', type: 'Thuyền', qty: 55, days: 1, price: 20000 },
    ],
    others: [
      { item: 'Công tác phí HDV (đợt 1)', qty: 1, usePax: false, pax: 1, multiplier: 4, price: 800000 },
      { item: 'Công tác phí HDV (đợt 2)', qty: 1, usePax: false, pax: 1, multiplier: 5, price: 800000 },
      { item: 'Tàu hướng dẫn', qty: 1, usePax: false, pax: 1, multiplier: 1, price: 2900000 },
      { item: 'Bảo hiểm', qty: 5, usePax: true, pax: 61, multiplier: 1, price: 3000 },
      { item: 'Mũ', qty: 1, usePax: true, pax: 61, multiplier: 1, price: 20000 },
      { item: 'Nước', qty: 5, usePax: true, pax: 61, multiplier: 1, price: 5000 },
      { item: 'Văn phòng', qty: 1, usePax: false, pax: 0, multiplier: 1, price: 500000 },
    ],
  },
  {
    is_deleted: false,
    status: 'Draft',
    code: 'T.20062026-HUE',
    name: 'Đoàn Khoa Du lịch K66',
    route: 'Đà Nẵng - Huế - Đà Nẵng',
    operator: 'Mr Quang',
    contactPerson: 'Lê Minh Quang',
    phone: '0988111222',
    startDate: new Date('2026-06-20'),
    endDate: new Date('2026-06-22'),
    duration: 3,
    guestsCount: 45,
    paxFOC: 1,
    paxAdult: 40,
    paxChild: 5,
    paxInfant: 0,
    revenueItems: [
      { name: 'Tour trải nghiệm Huế', paxAdult: 40, priceAdult: 3200000, paxChild: 5, paxOther: 0, priceOther: 0 },
    ],
    restaurants: [
      { provider: 'Nhà hàng Cung Đình', mealType: 'Trưa', pax: 44, sessions: 1, price: 170000 },
      { provider: 'Nhà hàng Sông Hương', mealType: 'Tối', pax: 44, sessions: 2, price: 180000 },
    ],
    hotels: [
      { hotel: 'Century Riverside', roomType: 'TWN', roomQty: 20, nights: 2, price: 780000 },
      { hotel: 'Century Riverside', roomType: 'DBL', roomQty: 2, nights: 2, price: 950000 },
    ],
    tickets: [
      { location: 'Đại Nội', object: 'NL', pax: 40, price: 200000 },
      { location: 'Đại Nội', object: 'TE', pax: 5, price: 40000 },
      { location: 'Lăng Tự Đức', object: 'NL', pax: 40, price: 150000 },
    ],
    transport: [
      { name: 'Xe 45 chỗ', type: 'Bus', qty: 1, days: 3, price: 5500000 },
      { name: 'Thuyền rồng', type: 'Boat', qty: 1, days: 1, price: 3200000 },
    ],
    others: [
      { item: 'HDV địa phương', qty: 1, usePax: false, pax: 0, multiplier: 3, price: 900000 },
      { item: 'Bảo hiểm', qty: 1, usePax: true, pax: 45, multiplier: 1, price: 5000 },
      { item: 'Nước uống', qty: 3, usePax: true, pax: 45, multiplier: 1, price: 4000 },
      { item: 'Banner đoàn', qty: 1, usePax: false, pax: 0, multiplier: 1, price: 600000 },
    ],
  },
  {
    is_deleted: false,
    status: 'Official',
    code: 'T.01072026-DN',
    name: 'Công ty Vận tải Phương Bắc',
    route: 'Hà Nội - Đà Nẵng - Hội An - Hà Nội',
    operator: 'Ms Linh',
    contactPerson: 'Trần Thu Linh',
    phone: '0906555444',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-04'),
    duration: 4,
    guestsCount: 32,
    paxFOC: 0,
    paxAdult: 30,
    paxChild: 2,
    paxInfant: 0,
    revenueItems: [
      { name: 'Combo miền Trung', paxAdult: 30, priceAdult: 5100000, paxChild: 2, paxOther: 0, priceOther: 0 },
      { name: 'Phụ thu phòng đơn', paxAdult: 5, priceAdult: 900000, paxChild: 0, paxOther: 0, priceOther: 0 },
    ],
    restaurants: [
      { provider: 'Bếp Trần Hội An', mealType: 'Trưa', pax: 32, sessions: 2, price: 180000 },
      { provider: 'A La Carte Danang', mealType: 'Tối', pax: 32, sessions: 2, price: 220000 },
    ],
    hotels: [
      { hotel: 'Sala Danang', roomType: 'TWN', roomQty: 14, nights: 3, price: 980000 },
      { hotel: 'Sala Danang', roomType: 'SGL', roomQty: 4, nights: 3, price: 1350000 },
    ],
    tickets: [
      { location: 'Bà Nà Hills', object: 'NL', pax: 30, price: 850000 },
      { location: 'Bà Nà Hills', object: 'TE', pax: 2, price: 650000 },
      { location: 'Rừng dừa Cẩm Thanh', object: 'NL', pax: 32, price: 150000 },
    ],
    transport: [
      { name: 'Xe 35 chỗ', type: 'Bus', qty: 1, days: 4, price: 4800000 },
      { name: 'Xe điện Hội An', type: 'Shuttle', qty: 2, days: 1, price: 700000 },
    ],
    others: [
      { item: 'HDV tuyến', qty: 1, usePax: false, pax: 0, multiplier: 4, price: 1200000 },
      { item: 'Bảo hiểm', qty: 1, usePax: true, pax: 32, multiplier: 1, price: 7000 },
      { item: 'Nước uống', qty: 4, usePax: true, pax: 32, multiplier: 1, price: 3500 },
      { item: 'Vé gửi xe', qty: 4, usePax: false, pax: 0, multiplier: 1, price: 250000 },
    ],
  },
  {
    is_deleted: false,
    status: 'Draft',
    code: 'T.15072026-SG',
    name: 'Đoàn Sinh viên Thực tập',
    route: 'TP.HCM - Vũng Tàu - TP.HCM',
    operator: 'Mr Thành',
    contactPerson: 'Phạm Đức Thành',
    phone: '0977333111',
    startDate: new Date('2026-07-15'),
    endDate: new Date('2026-07-16'),
    duration: 2,
    guestsCount: 52,
    paxFOC: 2,
    paxAdult: 48,
    paxChild: 4,
    paxInfant: 0,
    revenueItems: [
      { name: 'Tour biển Vũng Tàu', paxAdult: 48, priceAdult: 1950000, paxChild: 4, paxOther: 0, priceOther: 0 },
      { name: 'Phụ thu cuối tuần', paxAdult: 50, priceAdult: 150000, paxChild: 0, paxOther: 0, priceOther: 0 },
    ],
    restaurants: [
      { provider: 'Gành Hào', mealType: 'Trưa', pax: 50, sessions: 1, price: 220000 },
      { provider: 'Lẩu Cá Đuối Trương Công Định', mealType: 'Tối', pax: 50, sessions: 1, price: 160000 },
    ],
    hotels: [
      { hotel: 'The Coast Hotel', roomType: 'TWN', roomQty: 20, nights: 1, price: 720000 },
      { hotel: 'The Coast Hotel', roomType: 'TRP', roomQty: 4, nights: 1, price: 980000 },
    ],
    tickets: [
      { location: 'Cáp treo Hồ Mây', object: 'NL', pax: 48, price: 500000 },
      { location: 'Cáp treo Hồ Mây', object: 'TE', pax: 4, price: 350000 },
    ],
    transport: [
      { name: 'Xe 45 chỗ', type: 'Bus', qty: 1, days: 2, price: 4200000 },
      { name: 'Xe trung chuyển nội đô', type: 'Shuttle', qty: 2, days: 1, price: 600000 },
    ],
    others: [
      { item: 'HDV đoàn', qty: 1, usePax: false, pax: 0, multiplier: 2, price: 900000 },
      { item: 'Bảo hiểm', qty: 1, usePax: true, pax: 52, multiplier: 1, price: 5000 },
      { item: 'Nước uống', qty: 2, usePax: true, pax: 52, multiplier: 1, price: 3000 },
      { item: 'Quà tặng lưu niệm', qty: 50, usePax: false, pax: 0, multiplier: 1, price: 25000 },
    ],
  },
];

const seedEstimates = async () => {
  console.log('\n💰 Seeding Estimates...');

  await TourEstimate.deleteMany({});

  const estimates = rawEstimates.map(finalizeEstimate);
  await TourEstimate.insertMany(estimates);

  console.log(`   ✅ Created ${estimates.length} sample estimates`);
};

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { console.log('✅ Connected to MongoDB'); return seedEstimates(); })
    .then(() => { mongoose.connection.close(); console.log('✅ Hoàn thành!'); })
    .catch(err => { console.error('❌ Lỗi:', err); process.exit(1); });
}

module.exports = seedEstimates;
