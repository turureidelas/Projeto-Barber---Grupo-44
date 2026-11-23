import { errorCodeOf } from '@application/errors';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/query-keys';

const MAX_RETRIES = 2;

/**
 * Only unexpected failures are retried — business errors (conflict, permission…) won't change
 * by trying again. A NOT_AUTHENTICATED anywhere ends the session, which sends the user to login.
 */
export function createQueryClient(options: { retry?: boolean } = {}): QueryClient {
  const endSessionIfExpired = (error: unknown) => {
    if (errorCodeOf(error) === 'NOT_AUTHENTICATED') {
      client.setQueryData(queryKeys.session, null);
    }
  };

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: endSessionIfExpired }),
    mutationCache: new MutationCache({ onError: endSessionIfExpired }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          options.retry !== false &&
          errorCodeOf(error) === 'UNEXPECTED' &&
          failureCount < MAX_RETRIES,
      },
      mutations: { retry: false },
    },
  });
  return client;
}
