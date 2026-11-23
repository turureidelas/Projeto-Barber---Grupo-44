import { LogOut } from 'lucide-react';
import { useSignOut } from '../../hooks/useSession';
import { ptBR } from '../../i18n/pt-BR';
import { Button } from '../ui/Button';

/** Signing out clears the session; <RequireAuth> then sends the user to the login screen. */
export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button
      variant="secondary"
      icon={LogOut}
      fullWidth
      loading={signOut.isPending}
      onClick={() => {
        signOut.mutate();
      }}
    >
      {ptBR.nav.signOut}
    </Button>
  );
}
