import { Link } from 'react-router-dom';
import { useOrganizationContext } from '@/lib/organization/OrganizationContext';

export function OrganizationContextHeader() {
  const { organization, unit, units, selectUnit } = useOrganizationContext();

  if (!organization) return null;

  return (
    <div
      className="min-w-0 border-l border-border-default pl-2 sm:pl-3"
      data-testid="organization-context"
    >
      <Link
        to="/app/organizacao"
        className="block max-w-[34vw] truncate font-body text-xs font-semibold text-text-primary hover:text-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus sm:max-w-[220px]"
      >
        {organization.trade_name}
      </Link>
      {units.length > 1 ? (
        <label className="mt-1 block">
          <span className="sr-only">Unidade ativa</span>
          <select
            aria-label="Unidade ativa"
            value={unit?.id ?? ''}
            onChange={(event) => selectUnit(event.target.value)}
            className="min-h-[44px] max-w-[34vw] rounded-[8px] border border-border-default bg-bg-surface px-2 py-1 font-body text-xs text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus sm:max-w-[220px]"
          >
            {units.map((availableUnit) => (
              <option key={availableUnit.id} value={availableUnit.id}>
                {availableUnit.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="block max-w-[34vw] truncate font-body text-xs text-text-secondary sm:max-w-[220px]">
          {unit?.name ?? 'Nenhuma unidade autorizada'}
        </span>
      )}
    </div>
  );
}
