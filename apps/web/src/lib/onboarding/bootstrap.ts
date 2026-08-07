import { getSupabaseClient } from '@/lib/supabase/client';
import {
  firstOrganizationBootstrapResultSchema,
  type FirstOrganizationBootstrapInput,
  type FirstOrganizationBootstrapResult,
} from '@tapajiro/schemas';
import type { SupabaseClient } from '@supabase/supabase-js';

export const BOOTSTRAP_ERROR_CODES = [
  'auth_required',
  'profile_required',
  'bootstrap_already_completed',
  'invalid_name',
  'invalid_unit_slug',
  'unit_slug_conflict',
  'owner_role_missing',
] as const;

export type BootstrapErrorCode = (typeof BOOTSTRAP_ERROR_CODES)[number];

export class BootstrapError extends Error {
  readonly code: BootstrapErrorCode | 'unknown';

  constructor(code: BootstrapErrorCode | 'unknown') {
    super(code);
    this.name = 'BootstrapError';
    this.code = code;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

function getBootstrapErrorCode(error: unknown): BootstrapErrorCode | 'unknown' {
  const message = getErrorMessage(error);
  return (
    BOOTSTRAP_ERROR_CODES.find((code) => message === code || message.includes(code)) ?? 'unknown'
  );
}

export async function createFirstOrganization(
  input: FirstOrganizationBootstrapInput,
  client: SupabaseClient = getSupabaseClient(),
): Promise<FirstOrganizationBootstrapResult> {
  const { data, error } = await client.rpc('create_first_organization', {
    p_legal_name: input.organizationName,
    p_trade_name: input.organizationName,
    p_unit_name: input.unitName,
    p_unit_public_name: input.unitName,
    p_unit_slug: input.unitSlug,
    p_timezone: 'America/Santarem',
  });

  if (error) {
    throw new BootstrapError(getBootstrapErrorCode(error));
  }

  const result = firstOrganizationBootstrapResultSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );

  if (!result.success) {
    throw new BootstrapError('unknown');
  }

  return result.data;
}
