import axiosInstance from './axios';

export const getAiStatus = async () => {
  const response = await axiosInstance.get('/api/ai/status');
  return response.data.data;
};

export const getJobInsights = async (jobId) => {
  const response = await axiosInstance.get(`/api/ai/jobs/${jobId}/insights`);
  return response.data.data;
};

export const regenerateJobInsights = async (jobId) => {
  const response = await axiosInstance.post(`/api/ai/jobs/${jobId}/insights/regenerate`);
  return response.data.data;
};

export const aiSearchJobs = async ({ q, page, limit }) => {
  const response = await axiosInstance.get('/api/ai/search', {
    params: { q, page, limit },
  });
  return response.data.data;
};

export const getSimilarJobs = async (jobId, limit = 5) => {
  const response = await axiosInstance.get(`/api/ai/jobs/${jobId}/similar`, {
    params: { limit },
  });
  return response.data.data;
};

export const getRecommendations = async ({ page, limit }) => {
  const response = await axiosInstance.get('/api/ai/recommendations', {
    params: { page, limit },
  });
  return response.data.data;
};

export const analyzeFit = async (jobId) => {
  const response = await axiosInstance.post(`/api/ai/jobs/${jobId}/fit`);
  return response.data.data;
};

export const generateCoverLetter = async (jobId, { tone, notes } = {}) => {
  const response = await axiosInstance.post(
    `/api/ai/jobs/${jobId}/cover-letter`,
    { tone, notes },
    { timeout: 120000 }
  );
  return response.data.data;
};

export const getResumeTips = async (jobId) => {
  const response = await axiosInstance.post(
    `/api/ai/jobs/${jobId}/resume-tips`,
    {},
    { timeout: 120000 }
  );
  return response.data.data;
};
