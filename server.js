require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI', 'CLIENT_URL', 'SERVER_URL'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required env var: ${varName}`);
    process.exit(1);
  }
}

const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5001;

const { initPermissions } = require('./src/controllers/permissionController');

// Connect to MongoDB
connectDB().then(() => {
  initPermissions();
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// Make io accessible to our router
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  
  socket.on('join_room', (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on('disconnect', () => {
    console.log('🔥: A user disconnected');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  } 
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: ${process.env.SERVER_URL}/api/health`);
});
