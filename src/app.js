const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// API Routes
const { 
  pointRoutes, 
  routeRoutes, 
  providerRoutes,
  authRoutes,
  noteRoutes,
  permissionRoutes,
  changeRequestRoutes,
} = require('./routes');

app.use('/api/points', pointRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/change-requests', changeRequestRoutes);
app.use('/api/notifications', require('./routes').notificationRoutes);
app.use('/api/estimates', require('./routes').estimateRoutes);
app.use('/api/estimate-formulas', require('./routes').estimateFormulaRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  // Handle multer errors
  const multer = require('multer');
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File vượt quá giới hạn dung lượng cho phép (5MB)' });
    }
    return res.status(400).json({ message: `Lỗi upload file: ${err.message}` });
  }
  if (err.message && err.message.includes('Chỉ chấp nhận file')) {
    return res.status(400).json({ message: err.message });
  }

  logger.error('http.unhandled_error', {
    method: req.method,
    path: req.originalUrl,
    error: err,
  });
  res.status(500).json({
    message: 'Có lỗi xảy ra trong quá trình xử lý yêu cầu',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
