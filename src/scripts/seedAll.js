/**
 * Seed All — Chạy tất cả seed scripts theo đúng thứ tự
 * Run with: node src/scripts/seedAll.js  (or: npm run seed)
 *
 * Order:
 *   1. Users      — tạo tài khoản mẫu
 *   2. Database   — tạo Points, Routes, Providers demo (từ sampleData.js)
 *   3. Formulae   — tạo bộ công thức dự toán mẫu
 *   4. Estimates  — tạo dự toán mẫu
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const seedUsers = require('./seedUsers');
const seedClasses = require('./seedClasses');
const seedDatabase = require('./seedDatabase');
const seedEstimateFormulaProfiles = require('./seedEstimateFormulaProfiles');
const seedEstimates = require('./seedEstimates');

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🌱 Starting full database seed...\n');

    await seedUsers();
    await seedClasses();
    await seedDatabase();
    await seedEstimateFormulaProfiles();
    await seedEstimates();

    console.log('\n🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

seedAll();
