import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../api/notifications';
import useAuthStore from '../store/authStore';

export const useUnreadCount = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: getUnreadCount,
    refetchInterval: 30000, // 30 seconds polling
    refetchOnWindowFocus: false, // Prevent refetch on window focus for consistent timing
    refetchIntervalInBackground: true, // Continue polling when tab is in background
    enabled: !!accessToken, // Only fetch when user is logged in
  });
};

export const useNotifications = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30000, // 30 seconds polling
    refetchOnWindowFocus: false, // Prevent refetch on window focus for consistent timing
    refetchIntervalInBackground: true, // Continue polling when tab is in background
    enabled: !!accessToken, // Only fetch when user is logged in
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'], exact: true });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'], exact: true });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'], exact: true });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'], exact: true });
    },
  });
};
