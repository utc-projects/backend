/**
 * Seed script for sample users
 * Run with: node src/scripts/seedUsers.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
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
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if users already exist
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️ Đã có ${existingCount} users trong database.`);
      console.log('Bạn có muốn xóa và tạo lại? (Ctrl+C để hủy, Enter để tiếp tục)');
      
      // Wait a bit then proceed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear existing users
      await User.deleteMany({});
      console.log('🗑️ Đã xóa users cũ');
    }

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await User.create(userData);
      createdUsers.push({
        email: user.email,
        role: user.role,
        roleLabel: user.roleLabel,
      });
    }

    console.log('\n✅ Đã tạo users mẫu:');
    console.table(createdUsers);

    console.log('\n📝 Thông tin đăng nhập:');
    console.log('-----------------------------------');
    console.log('Admin:     admin@tourism.edu.vn / admin123');
    console.log('Giảng viên: giangvien@tourism.edu.vn / lecturer123');
    console.log('Sinh viên:  sinhvien1@tourism.edu.vn / student123');
    console.log('-----------------------------------');

    mongoose.connection.close();
    console.log('\n✅ Hoàn thành!');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

seedUsers();
