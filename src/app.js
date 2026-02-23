const express = require('express');
const cors = require('cors');

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


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
