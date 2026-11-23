import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../i18n/errors';
import { queryKeys } from './query-keys';
import { useToast } from './useToast';
import { useUseCases } from './useUseCases';

/** Checks for new notices every 30 s (the real API may push them later). */
const REFRESH_MS = 30_000;

export function useNotifications() {
  const { notifications } = useUseCases();
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notifications.list.execute(),
    refetchInterval: REFRESH_MS,
  });
}

export function useNotificationActions() {
  const { notifications } = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  const fail = (error: unknown) => {
    toast.error(errorMessage(error));
  };

  return {
    markRead: useMutation({
      mutationFn: (notificationId: string) => notifications.markRead.execute({ notificationId }),
      onSuccess: refresh,
      onError: fail,
    }),
    markAllRead: useMutation({
      mutationFn: () => notifications.markAllRead.execute(),
      onSuccess: refresh,
      onError: fail,
    }),
  };
}
