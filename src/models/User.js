const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false, // Don't return password by default
  },
  name: {
    type: String,
    required: [true, 'Họ tên là bắt buộc'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'lecturer', 'student'],
    default: 'student',
  },
  studentId: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    default: 'Khoa Du lịch',
  },
  avatar: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Get role label in Vietnamese
userSchema.methods.getRoleLabel = function() {
  const labels = {
    admin: 'Quản trị viên',
    lecturer: 'Giảng viên',
    student: 'Sinh viên',
  };
  return labels[this.role] || this.role;
};

// Virtual for full info
userSchema.virtual('roleLabel').get(function() {
  const labels = {
    admin: 'Quản trị viên',
    lecturer: 'Giảng viên',
    student: 'Sinh viên',
  };
  return labels[this.role] || this.role;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
