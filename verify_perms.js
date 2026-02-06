const mongoose = require('mongoose');
const Permission = require('./src/models/Permission');
require('dotenv').config();

const verifyPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const permissions = await Permission.find({});
    console.log('Permissions found:', permissions.length);
    permissions.forEach(p => {
        console.log(`Role: ${p.role}`);
        console.log('Resources:', Object.keys(p.resources));
    });

    if (permissions.length === 0) {
        console.log('No permissions found! initialization failed?');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

verifyPermissions();
