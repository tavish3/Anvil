const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

/**
 * Create a notification for a user
 * @param {string} userId - The user ID to notify
 * @param {string} message - The notification message
 * @returns {Promise<Notification>}
 */
const createNotification = async (userId, message) => {
  return await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });
};

/**
 * Get all notifications for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Notification[]>}
 */
const getNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID
 * @param {string} userId - The user ID (for ownership verification)
 * @returns {Promise<Notification>}
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  if (notification.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to mark this notification as read');
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user ID
 * @returns {Promise<{count: number}>}
 */
const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { count: result.count };
};

/**
 * Get unread count for a user
 * @param {string} userId - The user ID
 * @returns {Promise<number>}
 */
const getUnreadCount = async (userId) => {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
