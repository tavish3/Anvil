import axiosInstance from './axios';
import useAuthStore from '../store/authStore';

export const register = async (data) => {
  const response = await axiosInstance.post('/api/auth/register', data);
  return response.data.data;
};

export const login = async (data) => {
  const response = await axiosInstance.post('/api/auth/login', data);
  return response.data.data;
};

export const logout = async () => {
  const response = await axiosInstance.post('/api/auth/logout');
  return response.data.data;
};

export const forgotPassword = async (data) => {
  const response = await axiosInstance.post('/api/auth/forgot-password', data);
  return response.data.data;
};

export const resetPassword = async (data) => {
  const response = await axiosInstance.post('/api/auth/reset-password', data);
  return response.data.data;
};
