import type { SessionUserDTO } from '@application/dto/catalog';
import type { SignInInput } from '@application/use-cases';
import type { Permission } from '@domain/services/access-control';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { useUseCases } from './useUseCases';

/** The signed-in user (null when signed out). */
export function useSession() {
  const { auth } = useUseCases();
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => auth.getCurrentUser.execute(),
    staleTime: Infinity,
  });
}

/** The signed-in user, for components rendered inside <RequireAuth>. */
export function useCurrentUser(): SessionUserDTO {
  const { data } = useSession();
  if (!data) {
    throw new Error('useCurrentUser must be used inside <RequireAuth>.');
  }
  return data;
}

/** True when the user has at least one of the permissions. */
export function hasAny(user: SessionUserDTO, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => user.permissions.includes(permission));
}

export function useSignIn() {
  const { auth } = useUseCases();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignInInput) => auth.signIn.execute(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, user);
    },
  });
}

export function useSignOut() {
  const { auth } = useUseCases();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auth.signOut.execute(),
    onSuccess: () => {
      // Mark the session as empty (observers react → login screen), then drop every other
      // cached screen of the previous user. Removing the session query itself would leave
      // its observers stuck on the old value.
      queryClient.setQueryData(queryKeys.session, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== queryKeys.session[0],
      });
    },
  });
}
