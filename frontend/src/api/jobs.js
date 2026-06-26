import axiosInstance from './axios';

export const getJobs = async (params) => {
  const response = await axiosInstance.get('/api/jobs', { params });
  return response.data.data;
};

export const getJobById = async (id) => {
  const response = await axiosInstance.get(`/api/jobs/${id}`);
  return response.data.data;
};

export const createJob = async (jobData) => {
  const response = await axiosInstance.post('/api/jobs', jobData);
  return response.data.data;
};

export const updateJob = async (id, jobData) => {
  const response = await axiosInstance.patch(`/api/jobs/${id}`, jobData);
  return response.data.data;
};

export const deleteJob = async (id) => {
  const response = await axiosInstance.delete(`/api/jobs/${id}`);
  return response.data.data;
};

export const getMyListings = async () => {
  const response = await axiosInstance.get('/api/jobs/my/listings');
  return response.data.data;
};
