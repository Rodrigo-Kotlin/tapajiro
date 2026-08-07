import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const unitOperationalSettingsSchema = z.object({
  unit_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  delivery_enabled: z.boolean(),
  pickup_enabled: z.boolean(),
  counter_enabled: z.boolean(),
  accept_immediate_orders: z.boolean(),
  delivery_minimum_cents: z.number().int().nonnegative(),
  pickup_minimum_cents: z.number().int().nonnegative(),
  counter_minimum_cents: z.number().int().nonnegative(),
  operational_message: z.string().nullable(),
});

const businessHourSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  sequence: z.number().int().min(1),
  opens_at: z.string(),
  closes_at: z.string(),
  crosses_midnight: z.boolean(),
  active: z.boolean(),
});

export type UnitOperationalSettings = z.infer<typeof unitOperationalSettingsSchema>;
export type BusinessHour = z.infer<typeof businessHourSchema>;

export interface UnitOperationalConfiguration {
  settings: UnitOperationalSettings;
  hours: BusinessHour[];
}

export type OperationalConfigurationErrorKind = 'permission' | 'unknown';

export class OperationalConfigurationError extends Error {
  constructor(public readonly kind: OperationalConfigurationErrorKind) {
    super(
      kind === 'permission'
        ? 'Você não tem permissão para configurar esta unidade.'
        : 'Não foi possível carregar a configuração operacional. Tente novamente.',
    );
    this.name = 'OperationalConfigurationError';
  }
}

function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? error.code : undefined;
  return code === '42501' || code === 'PGRST301' || code === '403';
}

function configurationError(error: unknown): OperationalConfigurationError {
  return new OperationalConfigurationError(isPermissionError(error) ? 'permission' : 'unknown');
}

export async function loadUnitOperationalConfiguration(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
): Promise<UnitOperationalConfiguration | null> {
  const [settingsResult, hoursResult] = await Promise.all([
    client
      .from('unit_settings')
      .select(
        'unit_id, organization_id, delivery_enabled, pickup_enabled, counter_enabled, accept_immediate_orders, delivery_minimum_cents, pickup_minimum_cents, counter_minimum_cents, operational_message',
      )
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .maybeSingle(),
    client
      .from('business_hours')
      .select(
        'id, organization_id, unit_id, weekday, sequence, opens_at, closes_at, crosses_midnight, active',
      )
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .order('weekday', { ascending: true })
      .order('sequence', { ascending: true }),
  ]);

  if (settingsResult.error) throw configurationError(settingsResult.error);
  if (hoursResult.error) throw configurationError(hoursResult.error);
  if (!settingsResult.data) return null;

  const parsedSettings = unitOperationalSettingsSchema.safeParse(settingsResult.data);
  const parsedHours = z.array(businessHourSchema).safeParse(hoursResult.data ?? []);
  if (!parsedSettings.success || !parsedHours.success) {
    throw new OperationalConfigurationError('unknown');
  }

  return { settings: parsedSettings.data, hours: parsedHours.data };
}

export interface SaveUnitOperationalConfigurationInput {
  organizationId: string;
  unitId: string;
  status: 'active' | 'paused' | 'inactive';
  settings: Omit<UnitOperationalSettings, 'unit_id' | 'organization_id'>;
  hours: Array<{
    weekday: number;
    sequence: number;
    opens_at: string;
    closes_at: string;
    crosses_midnight: boolean;
    active: boolean;
  }>;
}

async function assertRpcSucceeded(result: { error: unknown }): Promise<void> {
  if (result.error) throw configurationError(result.error);
}

export async function saveUnitOperationalConfiguration(
  client: SupabaseClient,
  input: SaveUnitOperationalConfigurationInput,
): Promise<void> {
  await assertRpcSucceeded(
    await client.rpc('set_unit_operational_status', {
      p_organization_id: input.organizationId,
      p_unit_id: input.unitId,
      p_status: input.status,
      p_pause_reason:
        input.status === 'paused' ? 'Pausa operacional configurada pela unidade' : null,
      p_pause_until: null,
    }),
  );

  await assertRpcSucceeded(
    await client.rpc('update_unit_operational_settings', {
      p_organization_id: input.organizationId,
      p_unit_id: input.unitId,
      p_delivery_enabled: input.settings.delivery_enabled,
      p_pickup_enabled: input.settings.pickup_enabled,
      p_counter_enabled: input.settings.counter_enabled,
      p_accept_immediate_orders: input.settings.accept_immediate_orders,
      p_delivery_minimum_cents: input.settings.delivery_minimum_cents,
      p_pickup_minimum_cents: input.settings.pickup_minimum_cents,
      p_counter_minimum_cents: input.settings.counter_minimum_cents,
      p_operational_message: input.settings.operational_message,
    }),
  );

  await assertRpcSucceeded(
    await client.rpc('replace_business_hours', {
      p_organization_id: input.organizationId,
      p_unit_id: input.unitId,
      p_hours: input.hours,
    }),
  );
}
