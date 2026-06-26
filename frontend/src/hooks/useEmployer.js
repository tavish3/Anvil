import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createJob,
  updateJob,
  deleteJob,
  getMyListings,
} from '../api/jobs';
import {
  getJobApplicants,
  updateApplicationStatus,
} from '../api/applications';
import { getEmployerDashboard } from '../api/dashboard';

export const useMyListings = () => {
  return useQuery({
    queryKey: ['myListings'],
    queryFn: getMyListings,
  });
};

export const useCreateJob = () => {
  return useMutation({
    mutationFn: (jobData) => createJob(jobData),
  });
};

export const useUpdateJob = () => {
  return useMutation({
    mutationFn: ({ id, jobData }) => updateJob(id, jobData),
  });
};

export const useDeleteJob = () => {
  return useMutation({
    mutationFn: (id) => deleteJob(id),
  });
};

export const useJobApplicants = (jobId) => {
  return useQuery({
    queryKey: ['jobApplicants', jobId],
    queryFn: () => getJobApplicants(jobId),
    enabled: !!jobId,
  });
};

export const useUpdateApplicationStatus = (jobId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => updateApplicationStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries(['jobApplicants', jobId]);

      const previousApplicants = queryClient.getQueryData(['jobApplicants', jobId]);

      queryClient.setQueryData(['jobApplicants', jobId], (old) => {
        if (!old) return old;
        return old.map((applicant) =>
          applicant.id === id ? { ...applicant, status } : applicant
        );
      });

      return { previousApplicants };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['jobApplicants', jobId], context.previousApplicants);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['jobApplicants', jobId]);
    },
  });
};

export const useEmployerDashboard = () => {
  return useQuery({
    queryKey: ['employerDashboard'],
    queryFn: getEmployerDashboard,
  });
};
