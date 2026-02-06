require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5001;

const { initPermissions } = require('./src/controllers/permissionController');

// Connect to MongoDB
connectDB().then(() => {
  initPermissions();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: ${process.env.SERVER_URL || `http://localhost:${PORT}`}/api/health`);
});
