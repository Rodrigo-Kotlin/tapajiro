import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadOrganizationContext, OrganizationContextReadError } from './adapter';

const profileId = '00000000-0000-0000-0000-000000000001';
const organizationA = '00000000-0000-0000-0000-000000000101';
const organizationB = '00000000-0000-0000-0000-000000000102';
const membershipA = '00000000-0000-0000-0000-000000000201';
const unitA1 = '00000000-0000-0000-0000-000000000301';
const unitA2 = '00000000-0000-0000-0000-000000000302';
const unitB1 = '00000000-0000-0000-0000-000000000303';

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (result: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(resolve({ data, error })),
  };
  return query;
}

function createClient(results: Record<string, ReturnType<typeof queryResult>>) {
  return {
    from: vi.fn((table: string) => results[table]),
  } as unknown as SupabaseClient;
}

const activeMembership = {
  id: membershipA,
  organization_id: organizationA,
  profile_id: profileId,
  status: 'active',
  all_units: true,
};

const organizations = [{ id: organizationA, trade_name: 'Org A', status: 'trial' }];
const units = [
  { id: unitA1, organization_id: organizationA, name: 'Centro', slug: 'centro', status: 'active' },
  { id: unitA2, organization_id: organizationA, name: 'Aldeia', slug: 'aldeia', status: 'paused' },
  { id: unitB1, organization_id: organizationB, name: 'Outra', slug: 'outra', status: 'active' },
];

describe('loadOrganizationContext', () => {
  it('filtra memberships pelo usuário autenticado e status ativo', async () => {
    const membershipsQuery = queryResult([activeMembership]);
    const client = createClient({
      memberships: membershipsQuery,
      organizations: queryResult(organizations),
      units: queryResult(units),
    });

    const result = await loadOrganizationContext(client, profileId);

    expect(result.organization?.id).toBe(organizationA);
    expect(membershipsQuery.eq).toHaveBeenCalledWith('profile_id', profileId);
    expect(membershipsQuery.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('carrega todas as unidades da organização quando all_units é true', async () => {
    const membershipUnits = queryResult([]);
    const client = createClient({
      memberships: queryResult([activeMembership]),
      organizations: queryResult(organizations),
      units: queryResult(units),
      membership_units: membershipUnits,
    });

    const result = await loadOrganizationContext(client, profileId);

    expect(result.units.map((unit) => unit.id)).toEqual([unitA1, unitA2]);
    expect(membershipUnits.select).not.toHaveBeenCalled();
  });

  it('carrega somente unidades vinculadas quando all_units é false', async () => {
    const membershipUnits = queryResult([
      { membership_id: membershipA, organization_id: organizationA, unit_id: unitA2 },
      { membership_id: membershipA, organization_id: organizationB, unit_id: unitB1 },
    ]);
    const client = createClient({
      memberships: queryResult([{ ...activeMembership, all_units: false }]),
      organizations: queryResult(organizations),
      membership_units: membershipUnits,
      units: queryResult(units),
    });

    const result = await loadOrganizationContext(client, profileId);

    expect(result.units.map((unit) => unit.id)).toEqual([unitA2]);
    expect(membershipUnits.in).toHaveBeenCalledWith('membership_id', [membershipA]);
  });

  it('não consulta organizações ou unidades quando não há membership ativa', async () => {
    const organizationsQuery = queryResult(organizations);
    const unitsQuery = queryResult(units);
    const client = createClient({
      memberships: queryResult([]),
      organizations: organizationsQuery,
      units: unitsQuery,
    });

    const result = await loadOrganizationContext(client, profileId);

    expect(result).toEqual({ organization: null, units: [] });
    expect(organizationsQuery.select).not.toHaveBeenCalled();
    expect(unitsQuery.select).not.toHaveBeenCalled();
  });

  it('converte erro de leitura em erro público genérico', async () => {
    const client = createClient({
      memberships: queryResult(null, new Error('technical database detail')),
    });

    await expect(loadOrganizationContext(client, profileId)).rejects.toBeInstanceOf(
      OrganizationContextReadError,
    );
  });

  it('não retorna unidade de outro tenant mesmo quando ela aparece na resposta', async () => {
    const client = createClient({
      memberships: queryResult([activeMembership]),
      organizations: queryResult(organizations),
      units: queryResult(units),
    });

    const result = await loadOrganizationContext(client, profileId);

    expect(result.units.every((unit) => unit.organization_id === organizationA)).toBe(true);
    expect(result.units.some((unit) => unit.id === unitB1)).toBe(false);
  });
});
