/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from '@playwright/test';

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:0';

function computeStorageKey(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split('.')[0]}-auth-token`;
}

function createTestSession() {
  return {
    access_token:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAifQ.test',
    token_type: 'bearer',
    expires_in: 36000,
    expires_at: 9_999_999_999,
    refresh_token: 'e2e-test-refresh-token',
    user: {
      id: '00000000-0000-0000-0000-000000000000',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'user@example.invalid',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      phone: '',
      confirmed_at: '2026-01-01T00:00:00Z',
      last_sign_in_at: '2026-01-01T00:00:00Z',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      identities: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    provider_token: null,
    provider_refresh_token: null,
  };
}

async function injectSession(page: Page): Promise<void> {
  const storageKey = computeStorageKey(SUPABASE_URL);
  const session = createTestSession();
  const sessionJson = JSON.stringify(session);

  await page.addInitScript(
    `localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(sessionJson)});`,
  );
}

const STORAGE_KEY = computeStorageKey(SUPABASE_URL);

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await injectSession(page);
    await use(page);
  },
});

export { STORAGE_KEY, computeStorageKey, createTestSession };
