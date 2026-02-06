const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Admin
    const adminEmail = 'admin@test.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        admin = await User.create({
            name: 'Test Admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            isActive: true
        });
        console.log('Admin created');
    } else {
        console.log('Admin already exists');
    }

    // Create Student
    const studentEmail = 'student@test.com';
    let student = await User.findOne({ email: studentEmail });
    if (!student) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        student = await User.create({
            name: 'Test Student',
            email: studentEmail,
            password: hashedPassword,
            role: 'student',
            isActive: true
        });
        console.log('Student created');
    } else {
        console.log('Student already exists');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

seedUsers();
