import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface CreateSupabaseClientOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

let cachedClient: SupabaseClient | null = null;
const ANON_KEY_PLACEHOLDER = 'xxx';

function readEnv() {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };

  return {
    supabaseUrl: VITE_SUPABASE_URL || '',
    supabaseAnonKey: VITE_SUPABASE_ANON_KEY || '',
  };
}

export function createSupabaseClient(options: CreateSupabaseClientOptions): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = options;

  if (!supabaseUrl) {
    throw new Error('Supabase client cannot be created: URL is missing.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Supabase client cannot be created: anon key is missing.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    const { supabaseUrl, supabaseAnonKey } = readEnv();

    if (!supabaseUrl) {
      throw new Error('Supabase client cannot be created: VITE_SUPABASE_URL is not configured.');
    }

    if (!supabaseAnonKey) {
      throw new Error(
        'Supabase client cannot be created: VITE_SUPABASE_ANON_KEY is not configured.',
      );
    }

    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return cachedClient;
}

export function buildErrorMessage(): string {
  const { supabaseUrl, supabaseAnonKey } = readEnv();
  const parts: string[] = [];

  if (!supabaseUrl) {
    parts.push('missing URL');
  }

  if (!supabaseAnonKey) {
    parts.push('missing anon key');
  }

  if (parts.length === 0) {
    return `Supabase configured (URL=${supabaseUrl}, key=${ANON_KEY_PLACEHOLDER})`;
  }

  return `Supabase configuration issue: ${parts.join(', ')}.`;
}

export function resetClient(): void {
  cachedClient = null;
}
