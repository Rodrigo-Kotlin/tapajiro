import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  VITE_APP_VERSION: z.string().min(1).default('dev'),
  VITE_SUPABASE_URL: z.union([z.string().url(), z.literal('')]).default(''),
  VITE_SUPABASE_ANON_KEY: z.string().default(''),
});

function getEnv() {
  const raw: Record<string, string | undefined> = {
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const isProduction = raw.VITE_APP_ENV === 'production' || raw.VITE_APP_ENV === 'staging';

  if (isProduction) {
    const requiredKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;
    for (const key of requiredKeys) {
      if (!raw[key]) {
        throw new Error('System configuration is incomplete. Cannot start.');
      }
    }
  }

  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    if (Object.keys(errors).length > 0) {
      throw new Error('System configuration is invalid. Cannot start.');
    }
    throw new Error('System configuration is incomplete. Cannot start.');
  }

  return parsed.data;
}

export const env = getEnv();

export interface EnvConfig {
  env: string;
  version: string;
  supabaseUrl: string;
}

export const envConfig: EnvConfig = {
  env: env.VITE_APP_ENV,
  version: env.VITE_APP_VERSION,
  supabaseUrl: env.VITE_SUPABASE_URL,
};

export interface SafeMetadata {
  environmentName: string;
  version: string;
  supabaseConfigured: boolean;
}

export const safeMetadata: SafeMetadata = {
  environmentName:
    env.VITE_APP_ENV === 'local'
      ? 'Local'
      : env.VITE_APP_ENV === 'staging'
        ? 'Staging'
        : 'Produção',
  version: env.VITE_APP_VERSION,
  supabaseConfigured: !!env.VITE_SUPABASE_URL,
};
