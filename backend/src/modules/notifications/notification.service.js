const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const createNotification = async (userId, message) => {
  return await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });
};

const getNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

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