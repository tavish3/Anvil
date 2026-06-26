import { useQuery } from '@tanstack/react-query';
import { getJobs, getJobById } from '../api/jobs';

export const useJobs = (params) => {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => getJobs(params),
  });
};

export const useJob = (id) => {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobById(id),
    enabled: !!id,
  });
};
