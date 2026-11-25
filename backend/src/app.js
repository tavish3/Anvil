const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const hops = parseInt(process.env.TRUST_PROXY, 10);
if (hops > 0) app.set('trust proxy', hops);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Anvil API is running' });
});

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/user.routes'));
app.use('/api/jobs', require('./modules/jobs/job.routes'));
app.use('/api/applications', require('./modules/applications/application.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/notifications', require('./modules/notifications/notification.routes'));
app.use('/api/ai', require('./modules/ai/ai.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: err.success || false,
      statusCode: err.statusCode,
      message: err.message,
      data: err.data || null,
      errors: err.errors || null
    });
  }

  res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Internal server error',
    data: null,
    errors: null
  });
});

module.exports = app;
