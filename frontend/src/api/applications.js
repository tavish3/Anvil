import axiosInstance from './axios';

export const applyToJob = async (jobId, formData) => {
  const response = await axiosInstance.post(`/api/applications/jobs/${jobId}/apply`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const getMyApplications = async () => {
  const response = await axiosInstance.get('/api/applications/my');
  return response.data.data;
};

export const withdrawApplication = async (id) => {
  const response = await axiosInstance.delete(`/api/applications/${id}/withdraw`);
  return response.data.data;
};

export const getJobApplicants = async (jobId) => {
  const response = await axiosInstance.get(`/api/applications/jobs/${jobId}`);
  return response.data.data;
};

export const updateApplicationStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/api/applications/${id}/status`, { status });
  return response.data.data;
};
