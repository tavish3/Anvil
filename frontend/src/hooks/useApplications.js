import { useMutation, useQuery } from '@tanstack/react-query';
import { applyToJob, getMyApplications, withdrawApplication } from '../api/applications';

export const useApplyToJob = () => {
  return useMutation({
    mutationFn: ({ jobId, formData }) => applyToJob(jobId, formData),
  });
};

export const useMyApplications = () => {
  return useQuery({
    queryKey: ['myApplications'],
    queryFn: getMyApplications,
  });
};

export const useWithdrawApplication = () => {
  return useMutation({
    mutationFn: (id) => withdrawApplication(id),
  });
};
