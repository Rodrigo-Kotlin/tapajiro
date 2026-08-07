import type { SupabaseClient } from '@supabase/supabase-js';
import {
  organizationContextMembershipSchema,
  organizationContextMembershipUnitSchema,
  organizationContextOrganizationSchema,
  organizationContextUnitSchema,
  type OrganizationContextMembership,
  type OrganizationContextOrganization,
  type OrganizationContextUnit,
} from '@tapajiro/schemas';

export interface OrganizationContextData {
  organization: OrganizationContextOrganization | null;
  units: OrganizationContextUnit[];
}

export class OrganizationContextReadError extends Error {
  constructor() {
    super('Não foi possível carregar seu contexto. Tente novamente.');
    this.name = 'OrganizationContextReadError';
  }
}

function parseRows<T>(
  data: unknown,
  schema: { array: () => { safeParse: (value: unknown) => { success: boolean; data?: T[] } } },
): T[] {
  const parsed = schema.array().safeParse(data ?? []);
  return parsed.success ? (parsed.data ?? []) : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function readRows<T>(
  query: PromiseLike<{ data: unknown; error: unknown }>,
  parse: (data: unknown) => T[],
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new OrganizationContextReadError();
  return parse(data);
}

export async function loadOrganizationContext(
  client: SupabaseClient,
  profileId: string,
): Promise<OrganizationContextData> {
  const memberships = await readRows(
    client
      .from('memberships')
      .select('id, organization_id, profile_id, status, all_units')
      .eq('profile_id', profileId)
      .eq('status', 'active'),
    (data) => parseRows<OrganizationContextMembership>(data, organizationContextMembershipSchema),
  );

  if (memberships.length === 0) {
    return { organization: null, units: [] };
  }

  const organizationIds = unique(memberships.map((membership) => membership.organization_id));
  const organizations = await readRows(
    client.from('organizations').select('id, trade_name, status').in('id', organizationIds),
    (data) =>
      parseRows<OrganizationContextOrganization>(data, organizationContextOrganizationSchema),
  );

  const currentMembership = memberships.find((membership) =>
    organizations.some((organization) => organization.id === membership.organization_id),
  );
  const organization = organizations.find(
    (candidate) => candidate.id === currentMembership?.organization_id,
  );

  if (!currentMembership || !organization) {
    return { organization: null, units: [] };
  }

  const restrictedMemberships = memberships.filter((membership) => !membership.all_units);
  const membershipUnits =
    restrictedMemberships.length === 0
      ? []
      : await readRows(
          client
            .from('membership_units')
            .select('membership_id, organization_id, unit_id')
            .in(
              'membership_id',
              restrictedMemberships.map((membership) => membership.id),
            ),
          (data) => parseRows(data, organizationContextMembershipUnitSchema),
        );

  const units = await readRows(
    client
      .from('units')
      .select('id, organization_id, name, slug, status')
      .in('organization_id', organizationIds),
    (data) => parseRows<OrganizationContextUnit>(data, organizationContextUnitSchema),
  );

  const currentMembershipUnitIds = new Set(
    membershipUnits
      .filter(
        (membershipUnit) =>
          membershipUnit.membership_id === currentMembership.id &&
          membershipUnit.organization_id === organization.id,
      )
      .map((membershipUnit) => membershipUnit.unit_id),
  );

  return {
    organization,
    units: units.filter(
      (unit) =>
        unit.organization_id === organization.id &&
        (currentMembership.all_units || currentMembershipUnitIds.has(unit.id)),
    ),
  };
}
