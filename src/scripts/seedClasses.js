const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
const ClassModel = require('../models/Class');
const ChangeRequest = require('../models/ChangeRequest');
const Notification = require('../models/Notification');

async function seedClasses() {
  console.log('\n🏫 Seeding Classes...');

  const [
    lecturerA,
    lecturerB,
    studentA1,
    studentA2,
    studentB1,
  ] = await Promise.all([
    User.findOne({ email: process.env.LECTURER_A_EMAIL || process.env.LECTURER_EMAIL || 'giangvien2@tourism.edu.vn' }),
    User.findOne({ email: process.env.LECTURER_B_EMAIL || 'giangvien3@tourism.edu.vn' }),
    User.findOne({ email: process.env.STUDENT_A1_EMAIL || process.env.STUDENT_EMAIL || 'sinhvien1@tourism.edu.vn' }),
    User.findOne({ email: process.env.STUDENT_A2_EMAIL || 'sinhvien2@tourism.edu.vn' }),
    User.findOne({ email: process.env.STUDENT_B1_EMAIL || 'sinhvien3@tourism.edu.vn' }),
  ]);

  if (!lecturerA || !lecturerB || !studentA1 || !studentA2 || !studentB1) {
    throw new Error('Khong tim thay du user seed de tao lop. Hay chay seedUsers truoc.');
  }

  await Promise.all([
    ClassModel.deleteMany({}),
    ChangeRequest.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const classDocs = await ClassModel.create([
    {
      name: 'Lop Du lich A',
      code: 'DLA-2026',
      lecturer: lecturerA._id,
      students: [studentA1._id, studentA2._id],
      semester: 'HK1-2026',
      description: 'Lop demo phuc vu approval scope cho lecturer A',
      isActive: true,
    },
    {
      name: 'Lop Du lich B',
      code: 'DLB-2026',
      lecturer: lecturerB._id,
      students: [studentB1._id],
      semester: 'HK1-2026',
      description: 'Lop demo phuc vu approval scope cho lecturer B',
      isActive: true,
    },
  ]);

  console.log(`   ✅ Created ${classDocs.length} classes`);
  return classDocs;
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });

  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB');
      await seedClasses();
      await mongoose.connection.close();
      console.log('🎉 Hoan thanh seed classes');
    })
    .catch((error) => {
      console.error('❌ Seed classes failed:', error);
      process.exit(1);
    });
}

module.exports = seedClasses;
