import { Link } from 'react-router-dom';
import { OrganizationContextHeader } from '@/components/OrganizationContextHeader';
import { useOrganizationContext } from '@/lib/organization/OrganizationContext';

export function OrganizationPage() {
  const { organization, unit, units, selectUnit } = useOrganizationContext();

  return (
    <main className="min-h-screen bg-bg-app px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-sm font-semibold uppercase tracking-wide text-action-primary">
              Contexto atual
            </p>
            <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
              Organização e unidade
            </h1>
          </div>
          <OrganizationContextHeader />
        </header>

        {organization && (
          <section
            className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
            aria-label="Dados da organização"
          >
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Organização
                </dt>
                <dd className="mt-1 font-body text-base text-text-primary">
                  {organization.trade_name}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Status da organização
                </dt>
                <dd className="mt-1 font-body text-base text-text-primary">
                  {organization.status}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Unidade ativa
                </dt>
                <dd className="mt-1 font-body text-base text-text-primary">
                  {unit?.name ?? 'Nenhuma unidade autorizada'}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Slug da unidade
                </dt>
                <dd className="mt-1 font-body text-base text-text-primary">{unit?.slug ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Status da unidade
                </dt>
                <dd className="mt-1 font-body text-base text-text-primary">
                  {unit?.status ?? '—'}
                </dd>
              </div>
            </dl>

            {units.length > 1 && (
              <div className="mt-6 border-t border-border-default pt-5">
                <label
                  htmlFor="organization-unit-select"
                  className="block font-body text-sm font-semibold text-text-primary"
                >
                  Selecionar unidade
                </label>
                <select
                  id="organization-unit-select"
                  aria-label="Selecionar unidade"
                  value={unit?.id ?? ''}
                  onChange={(event) => selectUnit(event.target.value)}
                  className="mt-2 min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-3 py-2 font-body text-base text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                >
                  {units.map((availableUnit) => (
                    <option key={availableUnit.id} value={availableUnit.id}>
                      {availableUnit.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>
        )}

        {organization && units.length === 0 && (
          <p
            className="mt-4 rounded-[12px] bg-attention/10 px-4 py-3 font-body text-sm text-text-primary"
            role="status"
          >
            Sua membership está ativa, mas nenhuma unidade está autorizada para este acesso.
          </p>
        )}

        <Link
          to="/app"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-[12px] px-3 py-2 font-body text-sm font-semibold text-action-primary hover:bg-action-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
        >
          Voltar para o painel
        </Link>
      </div>
    </main>
  );
}
