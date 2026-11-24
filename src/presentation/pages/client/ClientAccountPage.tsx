import { formatDateTime } from '@shared/format';
import { MapPin, Phone, ShieldCheck } from 'lucide-react';
import { SignOutButton } from '../../components/layout/SignOutButton';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { useMyProfile } from '../../hooks/useClientArea';
import { useBarbershop } from '../../hooks/useSettings';
import { errorMessage } from '../../i18n/errors';
import { ptBR } from '../../i18n/pt-BR';

const t = ptBR.clientArea.account;

/** "Minha conta": own data, consent (LGPD), the barbershop's contact and policy, sign out. */
export function ClientAccountPage() {
  const profile = useMyProfile();
  const barbershop = useBarbershop();

  return (
    <>
      <PageHeader title={t.title} />
      <div className="flex flex-col gap-4">
        {profile.isPending ? (
          <LoadingState />
        ) : profile.isError ? (
          <ErrorState
            message={errorMessage(profile.error)}
            onRetry={() => void profile.refetch()}
          />
        ) : (
          <>
            <Card>
              <h2 className="mb-3 text-lg font-bold">{t.myData}</h2>
              <dl className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-x-6">
                <dt className="text-sm text-fg-muted">{t.name}</dt>
                <dd className="font-semibold">{profile.data.name}</dd>
                <dt className="text-sm text-fg-muted">{t.phone}</dt>
                <dd className="font-semibold tabular-nums">
                  {profile.data.phone ?? t.notInformed}
                </dd>
                <dt className="text-sm text-fg-muted">{t.email}</dt>
                <dd className="font-semibold break-all">{profile.data.email ?? t.notInformed}</dd>
              </dl>
            </Card>
            <Card>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
                <ShieldCheck aria-hidden="true" className="size-5 text-success" />
                {t.privacy}
              </h2>
              <p>
                {profile.data.consent
                  ? t.consentGiven(
                      formatDateTime(profile.data.consent.grantedAt),
                      profile.data.consent.termsVersion,
                    )
                  : t.consentMissing}
              </p>
              <p className="mt-1 text-fg-muted">{t.privacyBody}</p>
            </Card>
          </>
        )}

        {barbershop.data && (
          <Card>
            <h2 className="mb-1 text-lg font-bold">{t.barbershop}</h2>
            <p className="font-semibold">{barbershop.data.name}</p>
            {barbershop.data.address && (
              <p className="mt-2 flex gap-2 text-fg-muted">
                <MapPin aria-hidden="true" className="size-5 shrink-0" />
                {barbershop.data.address}
              </p>
            )}
            <p className="mt-2 text-fg-muted">
              {t.policy(barbershop.data.cancellationPolicy.minNoticeHours)}
            </p>
            <a
              href={`tel:${barbershop.data.phone.replace(/\D/g, '')}`}
              className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline underline-offset-4"
            >
              <Phone aria-hidden="true" className="size-5" />
              {t.call} · {barbershop.data.phone}
            </a>
          </Card>
        )}

        <div className="sm:max-w-xs">
          <SignOutButton />
        </div>
      </div>
    </>
  );
}
