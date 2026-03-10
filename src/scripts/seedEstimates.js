/**
 * Seed script for tour estimates
 * Run with: node src/scripts/seedEstimates.js
 */

const mongoose = require('mongoose');
const TourEstimate = require('../models/TourEstimate');
const EstimateFormulaProfile = require('../models/EstimateFormulaProfile');
const { calculateEstimate } = require('../services/estimateCalculationService');
const { ensureEstimateFormulaProfiles } = require('./seedEstimateFormulaProfiles');

const rawEstimates = [
  {
    formulaSeedRef: { familyKey: 'standard-tour-formula', version: 1 },
    is_deleted: false,
    status: 'Official',
    code: 'EST-APR-2026-01',
    name: 'Doan Khao Sat Ninh Binh',
    route: 'Ha Noi - Bai Dinh - Trang An - Ha Noi',
    operator: 'Ms Huyen',
    contactPerson: 'Nguyen Thi Mai',
    phone: '0912000001',
    startDate: new Date('2026-04-12'),
    endDate: new Date('2026-04-13'),
    duration: 2,
    guestsCount: 28,
    paxFOC: 1,
    revenueItems: [
      { name: 'Tour tron goi', paxAdult: 24, priceAdult: 1970000, paxChild: 3, paxOther: 1, priceOther: 250000 },
    ],
    restaurants: [
      { provider: 'Nha hang Co Do', mealType: 'Trưa', pax: 27, sessions: 1, price: 160000 },
      { provider: 'Nha hang Trang An', mealType: 'Tối', pax: 27, sessions: 1, price: 170000 },
      { provider: 'Buffet khach san', mealType: 'Sáng', pax: 27, sessions: 1, price: 80000 },
    ],
    hotels: [
      { hotel: 'Ninh Binh Legend', roomType: 'TWN', roomQty: 12, nights: 1, price: 820000 },
      { hotel: 'Ninh Binh Legend', roomType: 'DBL', roomQty: 2, nights: 1, price: 980000 },
    ],
    tickets: [
      { location: 'Chua Bai Dinh', object: 'NL', pax: 24, price: 180000 },
      { location: 'Chua Bai Dinh', object: 'TE', pax: 3, price: 90000 },
      { location: 'Trang An', object: 'NL', pax: 24, price: 250000 },
      { location: 'Trang An', object: 'TE', pax: 3, price: 120000 },
    ],
    transport: [
      { name: 'Xe 29 cho', type: 'Bus', qty: 1, days: 2, price: 3600000 },
      { name: 'Xe dien Bai Dinh', type: 'Shuttle', qty: 1, days: 1, price: 900000 },
    ],
    others: [
      { item: 'HDV tuyen', qty: 1, usePax: false, pax: 0, multiplier: 2, price: 900000 },
      { item: 'Bao hiem', qty: 1, usePax: true, pax: 28, multiplier: 1, price: 5000 },
      { item: 'Nuoc uong', qty: 2, usePax: true, pax: 28, multiplier: 1, price: 3500 },
      { item: 'Van phong pham', qty: 1, usePax: false, pax: 0, multiplier: 1, price: 350000 },
    ],
  },
  {
    formulaSeedRef: { familyKey: 'summer-peak-tour-formula', version: 1 },
    is_deleted: false,
    status: 'Official',
    code: 'EST-JUN-2026-02',
    name: 'Cong ty Tien Phong Summer Retreat',
    route: 'Ha Noi - Hue - Lang Co - Ha Noi',
    operator: 'Mrs Huong',
    contactPerson: 'Tran Duc Huy',
    phone: '0912000002',
    startDate: new Date('2026-06-25'),
    endDate: new Date('2026-06-28'),
    duration: 4,
    guestsCount: 42,
    paxFOC: 2,
    revenueItems: [
      { name: 'Tour co do mua he', paxAdult: 34, priceAdult: 4550000, paxChild: 4, paxOther: 2, priceOther: 450000 },
      { name: 'Phu thu phong don', paxAdult: 4, priceAdult: 850000, paxChild: 0, paxOther: 0, priceOther: 0 },
    ],
    restaurants: [
      { provider: 'Nha hang Song Huong', mealType: 'Trưa', pax: 40, sessions: 2, price: 185000 },
      { provider: 'Nha hang Lang Co', mealType: 'Tối', pax: 40, sessions: 2, price: 210000 },
      { provider: 'Buffet khach san', mealType: 'Sáng', pax: 40, sessions: 3, price: 90000 },
    ],
    hotels: [
      { hotel: 'Duy Tan Hue', roomType: 'TWN', roomQty: 16, nights: 3, price: 940000 },
      { hotel: 'Duy Tan Hue', roomType: 'DBL', roomQty: 4, nights: 3, price: 1120000 },
    ],
    tickets: [
      { location: 'Dai Noi', object: 'NL', pax: 34, price: 220000 },
      { location: 'Dai Noi', object: 'TE', pax: 4, price: 60000 },
      { location: 'Lang Khai Dinh', object: 'NL', pax: 34, price: 150000 },
      { location: 'Lang Khai Dinh', object: 'TE', pax: 4, price: 40000 },
    ],
    transport: [
      { name: 'Xe 45 cho', type: 'Bus', qty: 1, days: 4, price: 5200000 },
      { name: 'Thuyen song Huong', type: 'Boat', qty: 2, days: 1, price: 1500000 },
    ],
    others: [
      { item: 'HDV tuyen', qty: 1, usePax: false, pax: 0, multiplier: 4, price: 1100000 },
      { item: 'Qua tang', qty: 40, usePax: false, pax: 0, multiplier: 1, price: 30000 },
      { item: 'Nuoc uong', qty: 4, usePax: true, pax: 42, multiplier: 1, price: 4000 },
    ],
  },
  {
    formulaSeedRef: { familyKey: 'summer-peak-tour-formula', version: 1 },
    is_deleted: false,
    status: 'Draft',
    code: 'EST-JUL-2026-03',
    name: 'Doan Sinh Vien Khao Sat Mien Trung',
    route: 'Da Nang - Hoi An - Ba Na - Da Nang',
    operator: 'Mr Quang',
    contactPerson: 'Le Minh Quang',
    phone: '0912000003',
    startDate: new Date('2026-07-18'),
    endDate: new Date('2026-07-20'),
    duration: 3,
    guestsCount: 36,
    paxFOC: 1,
    revenueItems: [
      { name: 'Tour hoc tap', paxAdult: 30, priceAdult: 4000000, paxChild: 6, paxOther: 0, priceOther: 0 },
    ],
    restaurants: [
      { provider: 'Nha hang Pho Co', mealType: 'Trưa', pax: 35, sessions: 2, price: 165000 },
      { provider: 'Nha hang Bien Da Nang', mealType: 'Tối', pax: 35, sessions: 2, price: 195000 },
    ],
    hotels: [
      { hotel: 'Sala Da Nang', roomType: 'TWN', roomQty: 14, nights: 2, price: 920000 },
      { hotel: 'Sala Da Nang', roomType: 'TRP', roomQty: 3, nights: 2, price: 1250000 },
    ],
    tickets: [
      { location: 'Ba Na Hills', object: 'NL', pax: 30, price: 850000 },
      { location: 'Ba Na Hills', object: 'TE', pax: 6, price: 650000 },
      { location: 'Rung dua Cam Thanh', object: 'NL', pax: 35, price: 160000 },
    ],
    transport: [
      { name: 'Xe 35 cho', type: 'Bus', qty: 1, days: 3, price: 4700000 },
      { name: 'Xe dien Hoi An', type: 'Shuttle', qty: 2, days: 1, price: 650000 },
    ],
    others: [
      { item: 'HDV doan', qty: 1, usePax: false, pax: 0, multiplier: 3, price: 950000 },
      { item: 'Bao hiem', qty: 1, usePax: true, pax: 36, multiplier: 1, price: 6000 },
      { item: 'Nuoc uong', qty: 3, usePax: true, pax: 36, multiplier: 1, price: 3500 },
      { item: 'Banner doan', qty: 1, usePax: false, pax: 0, multiplier: 1, price: 550000 },
    ],
  },
  {
    formulaSeedRef: { familyKey: 'standard-tour-formula', version: 1 },
    is_deleted: false,
    status: 'Official',
    code: 'EST-NOV-2026-04',
    name: 'Hoi Nghi Khach Hang Quang Ninh',
    route: 'Ha Noi - Ha Long - Yen Tu - Ha Noi',
    operator: 'Ms Linh',
    contactPerson: 'Pham Thu Linh',
    phone: '0912000004',
    startDate: new Date('2026-11-10'),
    endDate: new Date('2026-11-12'),
    duration: 3,
    guestsCount: 24,
    paxFOC: 0,
    revenueItems: [
      { name: 'Tour Ha Long premium', paxAdult: 20, priceAdult: 4800000, paxChild: 3, paxOther: 1, priceOther: 500000 },
    ],
    restaurants: [
      { provider: 'Nha hang Hong Hanh', mealType: 'Trưa', pax: 24, sessions: 2, price: 210000 },
      { provider: 'Nha hang du thuyen', mealType: 'Tối', pax: 24, sessions: 1, price: 260000 },
      { provider: 'Buffet khach san', mealType: 'Sáng', pax: 24, sessions: 2, price: 95000 },
    ],
    hotels: [
      { hotel: 'Muong Thanh Ha Long', roomType: 'TWN', roomQty: 10, nights: 2, price: 1080000 },
      { hotel: 'Muong Thanh Ha Long', roomType: 'SGL', roomQty: 4, nights: 2, price: 1480000 },
    ],
    tickets: [
      { location: 'Du thuyen Ha Long', object: 'NL', pax: 20, price: 650000 },
      { location: 'Du thuyen Ha Long', object: 'TE', pax: 3, price: 480000 },
      { location: 'Yen Tu', object: 'NL', pax: 20, price: 280000 },
    ],
    transport: [
      { name: 'Xe 29 cho', type: 'Bus', qty: 1, days: 3, price: 4300000 },
      { name: 'Xe dien ben cang', type: 'Shuttle', qty: 1, days: 1, price: 600000 },
    ],
    others: [
      { item: 'HDV tuyen', qty: 1, usePax: false, pax: 0, multiplier: 3, price: 1000000 },
      { item: 'Bao hiem', qty: 1, usePax: true, pax: 24, multiplier: 1, price: 6000 },
      { item: 'Nuoc uong', qty: 3, usePax: true, pax: 24, multiplier: 1, price: 4000 },
      { item: 'Backdrop hoi nghi', qty: 1, usePax: false, pax: 0, multiplier: 1, price: 900000 },
    ],
  },
  {
    formulaSeedRef: { familyKey: 'summer-peak-tour-formula', version: 2 },
    is_deleted: false,
    status: 'Draft',
    code: 'EST-AUG-2026-05',
    name: 'Doan Khao Sat Cao Diem He V2',
    route: 'Ha Noi - Da Nang - Ba Na - Hoi An - Ha Noi',
    operator: 'Ms Hoa',
    contactPerson: 'Nguyen Thanh Hoa',
    phone: '0912000005',
    startDate: new Date('2026-08-08'),
    endDate: new Date('2026-08-11'),
    duration: 4,
    guestsCount: 30,
    paxFOC: 1,
    revenueItems: [
      { name: 'Tour cao diem he v2', paxAdult: 25, priceAdult: 5800000, paxChild: 4, paxOther: 1, priceOther: 900000 },
      { name: 'Phu thu cuoi tuan', paxAdult: 29, priceAdult: 320000, paxChild: 0, paxOther: 0, priceOther: 0 },
    ],
    restaurants: [
      { provider: 'Nha hang Bien Dong', mealType: 'Trưa', pax: 29, sessions: 2, price: 210000 },
      { provider: 'Nha hang Pho Co', mealType: 'Tối', pax: 29, sessions: 2, price: 230000 },
      { provider: 'Buffet khach san', mealType: 'Sáng', pax: 29, sessions: 3, price: 95000 },
    ],
    hotels: [
      { hotel: 'A La Carte Da Nang', roomType: 'TWN', roomQty: 10, nights: 3, price: 1280000 },
      { hotel: 'A La Carte Da Nang', roomType: 'DBL', roomQty: 3, nights: 3, price: 1450000 },
    ],
    tickets: [
      { location: 'Ba Na Hills', object: 'NL', pax: 25, price: 900000 },
      { location: 'Ba Na Hills', object: 'TE', pax: 4, price: 720000 },
      { location: 'Rung dua Cam Thanh', object: 'NL', pax: 29, price: 180000 },
      { location: 'Hoi An Ky Uc', object: 'NL', pax: 20, price: 550000 },
    ],
    transport: [
      { name: 'Xe 35 cho', type: 'Bus', qty: 1, days: 4, price: 5400000 },
      { name: 'Xe dien Hoi An', type: 'Shuttle', qty: 2, days: 1, price: 700000 },
    ],
    others: [
      { item: 'HDV tuyen cao diem', qty: 1, usePax: false, pax: 0, multiplier: 4, price: 1150000 },
      { item: 'Bao hiem', qty: 1, usePax: true, pax: 30, multiplier: 1, price: 7000 },
      { item: 'Nuoc uong', qty: 4, usePax: true, pax: 30, multiplier: 1, price: 4000 },
      { item: 'Qua tang check-in', qty: 29, usePax: false, pax: 0, multiplier: 1, price: 35000 },
    ],
  },
];

const resolveSeedFormulaProfileIds = async () => {
  const requiredRefs = rawEstimates
    .map((estimate) => estimate.formulaSeedRef)
    .filter(Boolean);

  const uniqueKeys = [...new Set(requiredRefs.map((ref) => `${ref.familyKey}:${ref.version}`))];
  const profileIdMap = new Map();

  for (const key of uniqueKeys) {
    const [familyKey, versionRaw] = key.split(':');
    const version = Number(versionRaw);
    const profile = await EstimateFormulaProfile.findOne({ familyKey, version }).lean();

    if (!profile?._id) {
      throw new Error(`Không tìm thấy formula profile để seed: ${familyKey} v${version}`);
    }

    profileIdMap.set(key, String(profile._id));
  }

  return profileIdMap;
};

const seedEstimates = async () => {
  console.log('\n💰 Seeding Estimates...');

  await ensureEstimateFormulaProfiles();
  await TourEstimate.deleteMany({});
  const formulaProfileIds = await resolveSeedFormulaProfileIds();

  const estimates = [];
  for (const estimate of rawEstimates) {
    const formulaKey = estimate.formulaSeedRef
      ? `${estimate.formulaSeedRef.familyKey}:${estimate.formulaSeedRef.version}`
      : null;
    const formulaProfileId = formulaKey ? formulaProfileIds.get(formulaKey) : null;
    const { formulaSeedRef, ...estimatePayload } = estimate;

    estimates.push(await calculateEstimate({
      ...estimatePayload,
      ...(formulaProfileId ? { formulaProfileId } : {}),
    }));
  }

  await TourEstimate.insertMany(estimates);

  console.log(`   ✅ Recreated ${estimates.length} sample estimates`);
};

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });

  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return seedEstimates();
    })
    .then(() => {
      mongoose.connection.close();
      console.log('✅ Hoàn thành!');
    })
    .catch((error) => {
      console.error('❌ Lỗi:', error);
      process.exit(1);
    });
}

module.exports = seedEstimates;
