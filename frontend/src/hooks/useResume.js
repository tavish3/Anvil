import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyResume,
  uploadResume,
  deleteMyResume,
  reprocessResume,
} from '../api/resumes';
import useAuthStore from '../store/authStore';

export const useMyResume = ({ enabled } = {}) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['resume', 'me'],
    queryFn: getMyResume,
    enabled: enabled !== false && !!accessToken,
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' && query.state.dataUpdateCount < 40
        ? 3000
        : false,
    retry: false,
  });
};

const useResumeCacheInvalidation = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['resume', 'me'] });
    queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] });
  };
};

export const useUploadResume = () => {
  const invalidate = useResumeCacheInvalidation();

  return useMutation({
    mutationFn: (formData) => uploadResume(formData),
    onSuccess: invalidate,
  });
};

export const useDeleteResume = () => {
  const invalidate = useResumeCacheInvalidation();

  return useMutation({
    mutationFn: () => deleteMyResume(),
    onSuccess: invalidate,
  });
};

export const useReprocessResume = () => {
  const invalidate = useResumeCacheInvalidation();

  return useMutation({
    mutationFn: () => reprocessResume(),
    onSuccess: invalidate,
  });
};
