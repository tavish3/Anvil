const express = require('express');
const router = express.Router();
const { getEmployerDashboardHandler } = require('./dashboard.controller');
const verifyAccessToken = require('../../middlewares/auth');
const requireRole = require('../../middlewares/requireRole');

// GET /api/dashboard/employer - Get employer dashboard stats
router.get('/employer', verifyAccessToken, requireRole('EMPLOYER'), getEmployerDashboardHandler);

module.exports = router;
