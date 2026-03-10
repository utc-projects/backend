const mongoose = require('mongoose');
const EstimateFormulaProfile = require('../models/EstimateFormulaProfile');

const formulaProfiles = [
  {
    familyKey: 'standard-tour-formula',
    name: 'Công thức chuẩn 2026',
    version: 1,
    description: 'Bộ công thức mặc định, bám theo file dự toán gốc hiện tại.',
    status: 'active',
    isDefault: true,
    effectiveFrom: new Date('2026-01-01'),
    rules: {
      revenue: {
        childPricePercent: 50,
      },
      paymentSchedule: [
        { label: 'Đặt cọc lần 1', percentage: 50, dueDaysFromStart: -30 },
        { label: 'Đặt cọc lần 2', percentage: 30, dueDaysFromStart: -7 },
        { label: 'Còn phải thu', percentage: 20, dueDaysFromStart: 0 },
      ],
      adjustments: [],
    },
  },
  {
    familyKey: 'summer-peak-tour-formula',
    name: 'Cao điểm hè 2026',
    version: 1,
    description: 'Áp dụng cho giai đoạn cao điểm hè, có phụ phí vận hành và lịch thu linh hoạt hơn.',
    status: 'active',
    isDefault: false,
    effectiveFrom: new Date('2026-06-01'),
    effectiveTo: new Date('2026-08-31'),
    rules: {
      revenue: {
        childPricePercent: 60,
      },
      paymentSchedule: [
        { label: 'Đặt cọc giai đoạn 1', percentage: 40, dueDaysFromStart: -35 },
        { label: 'Đặt cọc giai đoạn 2', percentage: 40, dueDaysFromStart: -10 },
        { label: 'Thu nốt', percentage: 20, dueDaysFromStart: 0 },
      ],
      adjustments: [
        {
          label: 'Phụ phí cao điểm',
          direction: 'cost',
          mode: 'percent_of_cost',
          value: 3,
          guestBasis: 'total',
          isActive: true,
        },
        {
          label: 'Dự phòng vận hành',
          direction: 'cost',
          mode: 'per_guest',
          value: 20000,
          guestBasis: 'paying',
          isActive: true,
        },
      ],
    },
  },
  {
    familyKey: 'summer-peak-tour-formula',
    name: 'Cao điểm hè 2026 v2',
    version: 2,
    description: 'Phiên bản 2 cho giai đoạn cao điểm hè, tăng biên doanh thu và điều chỉnh phụ phí linh hoạt hơn.',
    status: 'active',
    isDefault: false,
    effectiveFrom: new Date('2026-06-01'),
    effectiveTo: new Date('2026-08-31'),
    rules: {
      revenue: {
        childPricePercent: 65,
      },
      paymentSchedule: [
        { label: 'Đặt cọc giai đoạn 1', percentage: 50, dueDaysFromStart: -40 },
        { label: 'Đặt cọc giai đoạn 2', percentage: 25, dueDaysFromStart: -12 },
        { label: 'Thu nốt', percentage: 25, dueDaysFromStart: 0 },
      ],
      adjustments: [
        {
          label: 'Biên độ doanh thu cao điểm',
          direction: 'revenue',
          mode: 'percent_of_revenue',
          value: 4,
          guestBasis: 'total',
          isActive: true,
        },
        {
          label: 'Phụ phí cao điểm nâng cao',
          direction: 'cost',
          mode: 'percent_of_cost',
          value: 2,
          guestBasis: 'total',
          isActive: true,
        },
        {
          label: 'Dự phòng vận hành mở rộng',
          direction: 'cost',
          mode: 'per_guest',
          value: 25000,
          guestBasis: 'paying',
          isActive: true,
        },
      ],
    },
  },
];

const ensureEstimateFormulaProfiles = async () => {
  const persistedProfiles = [];

  for (const profile of formulaProfiles) {
    const persisted = await EstimateFormulaProfile.findOneAndUpdate(
      { familyKey: profile.familyKey, version: profile.version },
      { $set: profile },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    persistedProfiles.push(persisted);
  }

  return persistedProfiles;
};

const seedEstimateFormulaProfiles = async ({ reset = true } = {}) => {
  console.log('\n🧮 Seeding Estimate Formula Profiles...');

  if (reset) {
    await EstimateFormulaProfile.deleteMany({});
  }

  const persistedProfiles = await ensureEstimateFormulaProfiles();

  console.log(`   ✅ Created ${persistedProfiles.length} estimate formula profiles`);
};

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });

  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return seedEstimateFormulaProfiles();
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

module.exports = seedEstimateFormulaProfiles;
module.exports.formulaProfiles = formulaProfiles;
module.exports.ensureEstimateFormulaProfiles = ensureEstimateFormulaProfiles;
