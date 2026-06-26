const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require('./notification.service');

/**
 * Get all notifications for the logged-in user
 */
const getNotificationsController = asyncHandler(async (req, res) => {
  const notifications = await getNotifications(req.user.userId);
  res.status(200).json(
    new ApiResponse(200, notifications, 'Notifications retrieved successfully')
  );
});

/**
 * Mark a specific notification as read
 */
const markAsReadController = asyncHandler(async (req, res) => {
  const notification = await markAsRead(req.params.id, req.user.userId);
  res.status(200).json(
    new ApiResponse(200, notification, 'Notification marked as read')
  );
});

/**
 * Mark all notifications as read for the logged-in user
 */
const markAllAsReadController = asyncHandler(async (req, res) => {
  const result = await markAllAsRead(req.user.userId);
  res.status(200).json(
    new ApiResponse(200, result, 'All notifications marked as read')
  );
});

/**
 * Get unread count for the logged-in user
 */
const getUnreadCountController = asyncHandler(async (req, res) => {
  const count = await getUnreadCount(req.user.userId);
  res.status(200).json(
    new ApiResponse(200, { count }, 'Unread count retrieved successfully')
  );
});

module.exports = {
  getNotificationsController,
  markAsReadController,
  markAllAsReadController,
  getUnreadCountController,
};
