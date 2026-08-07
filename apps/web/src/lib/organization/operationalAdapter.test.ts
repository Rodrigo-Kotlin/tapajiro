import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  loadUnitOperationalConfiguration,
  OperationalConfigurationError,
  saveUnitOperationalConfiguration,
} from './operationalAdapter';

const organizationId = '00000000-0000-0000-0000-000000000101';
const unitId = '00000000-0000-0000-0000-000000000301';

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(() => query),
    then: (resolve: (result: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(resolve({ data, error })),
  };
  return query;
}

const settings = {
  unit_id: unitId,
  organization_id: organizationId,
  delivery_enabled: true,
  pickup_enabled: true,
  counter_enabled: false,
  accept_immediate_orders: true,
  delivery_minimum_cents: 2500,
  pickup_minimum_cents: 0,
  counter_minimum_cents: 0,
  operational_message: 'Atenção ao horário de pico',
};

const hours = [
  {
    id: '00000000-0000-0000-0000-000000000401',
    organization_id: organizationId,
    unit_id: unitId,
    weekday: 1,
    sequence: 1,
    opens_at: '08:00:00',
    closes_at: '18:00:00',
    crosses_midnight: false,
    active: true,
  },
];

describe('operationalAdapter', () => {
  it('lê somente as tabelas autorizadas no tenant e unidade informados', async () => {
    const settingsQuery = queryResult(settings);
    const hoursQuery = queryResult(hours);
    const client = {
      from: vi.fn((table: string) => (table === 'unit_settings' ? settingsQuery : hoursQuery)),
    } as unknown as SupabaseClient;

    await expect(loadUnitOperationalConfiguration(client, organizationId, unitId)).resolves.toEqual(
      {
        settings,
        hours,
      },
    );
    expect(settingsQuery.eq).toHaveBeenCalledWith('organization_id', organizationId);
    expect(settingsQuery.eq).toHaveBeenCalledWith('unit_id', unitId);
    expect(hoursQuery.eq).toHaveBeenCalledWith('organization_id', organizationId);
    expect(hoursQuery.eq).toHaveBeenCalledWith('unit_id', unitId);
  });

  it('retorna vazio quando a configuração ainda não existe', async () => {
    const client = {
      from: vi.fn((table: string) => queryResult(table === 'unit_settings' ? null : [])),
    } as unknown as SupabaseClient;

    await expect(
      loadUnitOperationalConfiguration(client, organizationId, unitId),
    ).resolves.toBeNull();
  });

  it('classifica falha de RLS como sem permissão', async () => {
    const client = {
      from: vi.fn(() => queryResult(null, { code: '42501' })),
    } as unknown as SupabaseClient;

    await expect(
      loadUnitOperationalConfiguration(client, organizationId, unitId),
    ).rejects.toMatchObject({
      kind: 'permission',
    });
  });

  it('salva exclusivamente pelas três RPCs existentes', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn();
    const client = { from, rpc } as unknown as SupabaseClient;

    await saveUnitOperationalConfiguration(client, {
      organizationId,
      unitId,
      status: 'active',
      settings: {
        delivery_enabled: true,
        pickup_enabled: false,
        counter_enabled: true,
        accept_immediate_orders: false,
        delivery_minimum_cents: 1200,
        pickup_minimum_cents: 0,
        counter_minimum_cents: 500,
        operational_message: null,
      },
      hours: [
        {
          weekday: 1,
          sequence: 1,
          opens_at: '08:00',
          closes_at: '18:00',
          crosses_midnight: false,
          active: true,
        },
      ],
    });

    expect(from).not.toHaveBeenCalled();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'set_unit_operational_status',
      'update_unit_operational_settings',
      'replace_business_hours',
    ]);
    expect(rpc).toHaveBeenCalledWith(
      'replace_business_hours',
      expect.objectContaining({ p_organization_id: organizationId, p_unit_id: unitId }),
    );
  });

  it('não expõe erro técnico na classe pública', () => {
    const error = new OperationalConfigurationError('unknown');
    expect(error.message).not.toContain('SQL');
    expect(error.message).toContain('configuração operacional');
  });
});
