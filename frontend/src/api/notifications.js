import axiosInstance from './axios';

export const getNotifications = async () => {
  const response = await axiosInstance.get('/api/notifications');
  return response.data.data;
};

export const getUnreadCount = async () => {
  const response = await axiosInstance.get('/api/notifications/unread-count');
  return response.data.data.count;
};

export const markAsRead = async (id) => {
  const response = await axiosInstance.patch(`/api/notifications/${id}/read`);
  return response.data.data;
};

export const markAllAsRead = async () => {
  const response = await axiosInstance.patch('/api/notifications/read-all');
  return response.data.data;
};
