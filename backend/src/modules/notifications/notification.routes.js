const express = require('express');
const router = express.Router();
const verifyAccessToken = require('../../middlewares/auth');
const {
  getNotificationsController,
  markAsReadController,
  markAllAsReadController,
  getUnreadCountController,
} = require('./notification.controller');

// All routes require authentication (no role restriction - both roles receive notifications)
router.use(verifyAccessToken);

// GET /api/notifications - Get all notifications for the logged-in user
router.get('/', getNotificationsController);

// GET /api/notifications/unread-count - Get unread count for the logged-in user
router.get('/unread-count', getUnreadCountController);

// PATCH /api/notifications/:id/read - Mark a specific notification as read
router.patch('/:id/read', markAsReadController);

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', markAllAsReadController);

module.exports = router;
