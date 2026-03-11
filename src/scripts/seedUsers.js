const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
const Permission = require('../models/Permission');
const { initPermissions } = require('../controllers/permissionController');

const seededUsers = [
  {
    key: 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@tourism.edu.vn',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    name: 'Admin He thong',
    role: 'admin',
    department: 'Phong Quan tri',
    mustChangePassword: false,
    isActive: true,
  },
  {
    key: 'lecturerA',
    email: process.env.LECTURER_A_EMAIL || process.env.LECTURER_EMAIL || 'giangvien2@tourism.edu.vn',
    password: process.env.LECTURER_A_PASSWORD || process.env.LECTURER_PASSWORD || 'lecturer123',
    name: 'ThS. Tran Thi B',
    role: 'lecturer',
    department: 'Khoa Du lich',
    mustChangePassword: false,
    isActive: true,
  },
  {
    key: 'lecturerB',
    email: process.env.LECTURER_B_EMAIL || 'giangvien3@tourism.edu.vn',
    password: process.env.LECTURER_B_PASSWORD || 'lecturer123',
    name: 'ThS. Nguyen Van D',
    role: 'lecturer',
    department: 'Khoa Du lich',
    mustChangePassword: false,
    isActive: true,
  },
  {
    key: 'studentA1',
    email: process.env.STUDENT_A1_EMAIL || process.env.STUDENT_EMAIL || 'sinhvien1@tourism.edu.vn',
    password: process.env.STUDENT_A1_PASSWORD || process.env.STUDENT_PASSWORD || 'student123',
    name: 'Le Van C',
    role: 'student',
    studentId: 'SV001',
    department: 'Khoa Du lich',
    mustChangePassword: false,
    isActive: true,
  },
  {
    key: 'studentA2',
    email: process.env.STUDENT_A2_EMAIL || 'sinhvien2@tourism.edu.vn',
    password: process.env.STUDENT_A2_PASSWORD || 'student123',
    name: 'Pham Thi E',
    role: 'student',
    studentId: 'SV002',
    department: 'Khoa Du lich',
    mustChangePassword: false,
    isActive: true,
  },
  {
    key: 'studentB1',
    email: process.env.STUDENT_B1_EMAIL || 'sinhvien3@tourism.edu.vn',
    password: process.env.STUDENT_B1_PASSWORD || 'student123',
    name: 'Nguyen Hoang F',
    role: 'student',
    studentId: 'SV003',
    department: 'Khoa Du lich',
    mustChangePassword: false,
    isActive: true,
  },
  {
    key: 'studentNoClass',
    email: process.env.STUDENT_NO_CLASS_EMAIL || 'sinhvien4@tourism.edu.vn',
    password: process.env.STUDENT_NO_CLASS_PASSWORD || 'student123',
    name: 'Do Minh G',
    role: 'student',
    studentId: 'SV004',
    department: 'Khoa Du lich',
    mustChangePassword: false,
    isActive: true,
  },
];

async function seedUsers() {
  console.log('\n👤 Seeding Users...');

  await User.deleteMany({});
  const createdUsers = await User.create(seededUsers);
  await initPermissions();
  await Permission.findOneAndUpdate(
    { role: 'lecturer' },
    {
      role: 'lecturer',
      resources: {
        points: { view: true, create: true, edit: true, delete: false },
        routes: { view: true, create: true, edit: true, delete: false },
        providers: { view: true, create: true, edit: true, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
        classes: { view: true, create: false, edit: true, delete: false },
      },
      updatedAt: Date.now(),
    },
    { upsert: true }
  );
  await Permission.findOneAndUpdate(
    { role: 'student' },
    {
      role: 'student',
      resources: {
        points: { view: true, create: false, edit: false, delete: false },
        routes: { view: true, create: false, edit: false, delete: false },
        providers: { view: true, create: false, edit: false, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
        classes: { view: true, create: false, edit: false, delete: false },
      },
      updatedAt: Date.now(),
    },
    { upsert: true }
  );

  console.log(`   ✅ Created ${createdUsers.length} users`);
  return createdUsers;
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });

  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB');
      await seedUsers();
      await mongoose.connection.close();
      console.log('🎉 Hoan thanh seed users');
    })
    .catch((error) => {
      console.error('❌ Seed users failed:', error);
      process.exit(1);
    });
}

module.exports = seedUsers;
module.exports.seededUsers = seededUsers;
