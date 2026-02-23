/**
 * Seed script for tour estimates
 * Run with: node src/scripts/seedEstimates.js
 */

const mongoose = require('mongoose');
const TourEstimate = require('../models/TourEstimate');

const seedEstimates = async () => {
  console.log('\n💰 Seeding Estimates...');

  await TourEstimate.deleteMany({});

  const estimate = {
    is_deleted: false,
    status: 'Official',
    code: 'T.176202X-ND',
    name: 'Tập đoàn TNR',
    route: 'HN-HLC-H-HN',
    operator: 'Mrs Hường',
    startDate: new Date('2026-06-17'),
    endDate: new Date('2026-06-21'),
    duration: 5,
    guestsCount: 61,
    paxFOC: 0,
    paxAdult: 48,
    paxChild: 7,

    revenueItems: [
      { name: 'Tour (Người lớn)', paxAdult: 48, priceAdult: 4250000, paxChild: 0, priceChild: 0, totalAmount: 204000000 },
      { name: 'Tour (Trẻ em)', paxAdult: 0, priceAdult: 0, paxChild: 7, priceChild: 2125000, totalAmount: 14875000 }
    ],

    restaurants: [
      { provider: 'Lăng Cô Beach Resort', mealType: 'Trưa', pax: 52, sessions: 2, price: 150000, total: 15600000 },
      { provider: 'Minh Tâm', mealType: 'Tối', pax: 52, sessions: 1, price: 150000, total: 7800000 },
      { provider: 'Làng Chài', mealType: 'Trưa', pax: 52, sessions: 1, price: 150000, total: 7800000 },
      { provider: 'Cơm niêu Khải Hoàn', mealType: 'Tối', pax: 52, sessions: 1, price: 150000, total: 7800000 },
      { provider: 'Nhà hàng Nổi', mealType: 'Trưa', pax: 52, sessions: 1, price: 150000, total: 7800000 },
      { provider: 'Năm Châu Hội Quán', mealType: 'Tối', pax: 52, sessions: 1, price: 150000, total: 7800000 },
    ],

    hotels: [
      { hotel: 'Lăng Cô Beach Resort', roomType: 'TWN', roomQty: 12, nights: 2, price: 1250000, total: 30000000 },
      { hotel: 'Lăng Cô Beach Resort', roomType: 'DBL', roomQty: 12, nights: 2, price: 1500000, total: 36000000 },
      { hotel: 'Duy Tân', roomType: 'TWN', roomQty: 12, nights: 1, price: 850000, total: 10200000 },
      { hotel: 'Duy Tân', roomType: 'DBL', roomQty: 12, nights: 1, price: 850000, total: 10200000 },
    ],

    tickets: [
      { location: 'Thiền viện Trúc Lâm Bạch Mã', object: 'NL', pax: 48, price: 60000, total: 2880000 },
      { location: 'Đại Nội', object: 'NL', pax: 48, price: 200000, total: 9600000 },
      { location: 'Đại Nội/TE', object: 'TE', pax: 7, price: 40000, total: 280000 },
      { location: 'Lăng Khải Định', object: 'NL', pax: 48, price: 150000, total: 7200000 },
      { location: 'Lăng Khải Định/TE', object: 'TE', pax: 7, price: 30000, total: 210000 },
    ],

    transport: [
      { name: 'Xe ô tô', type: '45 chỗ', qty: 1, price: 17000000, total: 17000000 },
      { name: 'Kha Trần - Hồ Lộc', type: '35 chỗ', qty: 1, price: 13500000, total: 13500000 },
      { name: 'Thuyền sông Hương', type: '', qty: 2, price: 1200000, total: 2400000 },
      { name: 'Thuyền thiền viện', type: '', qty: 55, price: 20000, total: 1100000 },
    ],

    others: [
      { item: 'Công tác phí HDV', qty: 4, pax: 1, price: 800000, total: 3200000 },
      { item: 'Công tác phí HDV (Đội 2)', qty: 5, pax: 1, price: 800000, total: 4000000 },
      { item: 'Tàu hướng dẫn', qty: 1, pax: 1, price: 2900000, total: 2900000 },
      { item: 'Bảo hiểm', qty: 305, pax: 61, price: 3000, total: 915000 },
      { item: 'Mũ', qty: 61, pax: 61, price: 20000, total: 1220000 },
      { item: 'Nước', qty: 305, pax: 61, price: 5000, total: 1525000 },
      { item: 'Văn phòng', qty: 1, pax: 0, price: 500000, total: 500000 },
    ],

    totalRevenue: 218875000,
    totalNetCost: 209430000,
    expectedProfit: 9445000,
  };

  await TourEstimate.create(estimate);
  console.log('   ✅ Created 1 sample estimate');
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
