/**
 * Seed script for sample users
 * Run with: node src/scripts/seedUsers.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');

const sampleUsers = [
  {
    email: 'admin@tourism.edu.vn',
    password: 'admin123',
    name: 'Admin Hệ thống',
    role: 'admin',
    department: 'Phòng Quản trị',
  },
  {
    email: 'giangvien@tourism.edu.vn',
    password: 'lecturer123',
    name: 'ThS. Nguyễn Văn A',
    role: 'lecturer',
    department: 'Khoa Du lịch',
  },
  {
    email: 'giangvien2@tourism.edu.vn',
    password: 'lecturer123',
    name: 'ThS. Trần Thị B',
    role: 'lecturer',
    department: 'Khoa Du lịch',
  },
  {
    email: 'sinhvien1@tourism.edu.vn',
    password: 'student123',
    name: 'Lê Văn C',
    role: 'student',
    studentId: 'SV001',
    department: 'Khoa Du lịch',
  },
  {
    email: 'sinhvien2@tourism.edu.vn',
    password: 'student123',
    name: 'Phạm Thị D',
    role: 'student',
    studentId: 'SV002',
    department: 'Khoa Du lịch',
  },
  {
    email: 'sinhvien3@tourism.edu.vn',
    password: 'student123',
    name: 'Hoàng Văn E',
    role: 'student',
    studentId: 'SV003',
    department: 'Khoa Du lịch',
  },
];

async function seedUsers() {
  console.log('\n👤 Seeding Users...');

  const existingCount = await User.countDocuments();
  if (existingCount > 0) {
    await User.deleteMany({});
    console.log(`   🗑️ Đã xóa ${existingCount} users cũ`);
  }

  const createdUsers = [];
  for (const userData of sampleUsers) {
    const user = await User.create(userData);
    createdUsers.push({
      email: user.email,
      role: user.role,
      roleLabel: user.roleLabel,
    });
  }

  console.log(`   ✅ Đã tạo ${createdUsers.length} users mẫu`);
  console.log('   📝 Login: admin@tourism.edu.vn / admin123');
}

if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { console.log('✅ Connected to MongoDB'); return seedUsers(); })
    .then(() => { mongoose.connection.close(); console.log('✅ Hoàn thành!'); })
    .catch(err => { console.error('❌ Lỗi:', err.message); process.exit(1); });
}

module.exports = seedUsers;

