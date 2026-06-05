require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { requestLogger, logger } = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const enrollmentRoutes = require('./routes/enrollments');
const logRoutes = require('./routes/logs');

const app = express();
const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/face-auth';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Increase JSON body parser limit to 50MB for base64 image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger
app.use(requestLogger);

async function startServer() {
  // Check if we need to start MongoMemoryServer (if local MongoDB is not running)
  if (process.env.USE_IN_MEMORY_DB === 'true' || !process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
    try {
      logger.info('Checking MongoDB connectivity...');
      // We will try to start mongodb-memory-server to guarantee it works out of the box
      logger.info('Starting in-memory MongoDB server (mongodb-memory-server)...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      MONGODB_URI = mongoServer.getUri();
      logger.info(`In-memory MongoDB started at: ${MONGODB_URI}`);
    } catch (err) {
      logger.error('Failed to start in-memory MongoDB, attempting standard connect:', err.message);
    }
  }

  // Database Connection
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => logger.info('Connected to MongoDB successfully'))
  .catch(err => {
    logger.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/enrollments', enrollmentRoutes);
  app.use('/api/logs', logRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date()
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  // Start Server
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();

