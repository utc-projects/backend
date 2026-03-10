require('dotenv').config();
const logger = require('./src/utils/logger');

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI', 'CLIENT_URL', 'SERVER_URL'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    logger.error('server.missing_env', { varName });
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
  logger.info('socket.connected', { socketId: socket.id });
  
  socket.on('join_room', (data) => {
    socket.join(data);
    logger.info('socket.join_room', { socketId: socket.id, room: data });
  });

  socket.on('disconnect', () => {
    logger.info('socket.disconnected', { socketId: socket.id });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('server.uncaught_exception', { error: err });
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('server.unhandled_rejection', { error: err });
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
  logger.info('server.started', {
    port: PORT,
    healthCheck: `${process.env.SERVER_URL}/api/health`,
  });
});
