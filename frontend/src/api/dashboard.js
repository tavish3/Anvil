import axiosInstance from './axios';

export const getEmployerDashboard = async () => {
  const response = await axiosInstance.get('/api/dashboard/employer');
  return response.data.message;
};
