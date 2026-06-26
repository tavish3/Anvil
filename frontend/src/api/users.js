import axiosInstance from './axios';

export const getMe = async () => {
  const response = await axiosInstance.get('/api/users/me');
  return response.data.data;
};

export const updateMe = async (data) => {
  const response = await axiosInstance.patch('/api/users/me', data);
  return response.data.data;
};

export const updateAvatar = async (formData) => {
  const response = await axiosInstance.patch('/api/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};
