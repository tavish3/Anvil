import axiosInstance from './axios';

export const getMyResume = async () => {
  const response = await axiosInstance.get('/api/resumes/me');
  return response.data.data;
};

export const uploadResume = async (formData) => {
  const response = await axiosInstance.put('/api/resumes/me', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const deleteMyResume = async () => {
  const response = await axiosInstance.delete('/api/resumes/me');
  return response.data.data;
};

export const reprocessResume = async () => {
  const response = await axiosInstance.post('/api/resumes/me/reprocess');
  return response.data.data;
};
