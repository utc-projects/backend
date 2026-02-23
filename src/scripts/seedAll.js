/**
 * Seed All — Chạy tất cả seed scripts theo đúng thứ tự
 * Run with: node src/scripts/seedAll.js  (or: npm run seed)
 *
 * Order:
 *   1. Users      — tạo tài khoản mẫu
 *   2. Database   — tạo Points, Routes, Providers (từ sampleData.js)
 *   3. Providers  — tạo Providers nâng cao với sub-types và route links
 *   4. Estimates  — tạo dự toán mẫu
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const seedUsers = require('./seedUsers');
const seedDatabase = require('./seedDatabase');
const seedProviders = require('./seedProviders');
const seedEstimates = require('./seedEstimates');

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🌱 Starting full database seed...\n');

    await seedUsers();
    await seedDatabase();
    await seedProviders();
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
