import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getAiStatus,
  getJobInsights,
  regenerateJobInsights,
  aiSearchJobs,
  getSimilarJobs,
  getRecommendations,
  analyzeFit,
  generateCoverLetter,
  getResumeTips,
} from '../api/ai';
import useAuthStore from '../store/authStore';

export const useAiStatus = () => {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: getAiStatus,
    staleTime: Infinity,
    retry: false,
  });
};

export const useJobInsights = (jobId, { enabled } = {}) => {
  return useQuery({
    queryKey: ['ai', 'insights', jobId],
    queryFn: () => getJobInsights(jobId),
    enabled: enabled !== false && !!jobId,
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' && query.state.dataUpdateCount < 20
        ? 4000
        : false,
    retry: false,
  });
};

export const useRegenerateInsights = (jobId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => regenerateJobInsights(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'insights', jobId] });
      toast.success('AI summary regeneration started');
    },
  });
};

export const useAiSearch = (params, enabled = true) => {
  return useQuery({
    queryKey: ['ai', 'search', params],
    queryFn: () => aiSearchJobs(params),
    enabled: !!enabled && !!params?.q,
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  });
};

export const useSimilarJobs = (jobId, enabled = true) => {
  return useQuery({
    queryKey: ['ai', 'similar', jobId],
    queryFn: () => getSimilarJobs(jobId),
    enabled: !!enabled && !!jobId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
};

export const useRecommendations = (params, enabled = true) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['ai', 'recommendations', params],
    queryFn: () => getRecommendations(params),
    enabled: !!enabled && !!accessToken,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.ready === false &&
      query.state.data?.resumeStatus === 'PENDING' &&
      query.state.dataUpdateCount < 20
        ? 4000
        : false,
  });
};

export const useAnalyzeFit = () => {
  return useMutation({
    mutationFn: (jobId) => analyzeFit(jobId),
  });
};

export const useCoverLetter = () => {
  return useMutation({
    mutationFn: ({ jobId, tone, notes }) => generateCoverLetter(jobId, { tone, notes }),
  });
};

export const useResumeTips = () => {
  return useMutation({
    mutationFn: (jobId) => getResumeTips(jobId),
  });
};
