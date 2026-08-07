/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from '@playwright/test';

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:0';

function computeStorageKey(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split('.')[0]}-auth-token`;
}

function createTestSession() {
  return {
    // JWT carries an `exp` claim so supabase-js `setSession` validates the
    // unexpired token via GET /auth/v1/user instead of attempting a refresh.
    access_token:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjk5OTk5OTk5OTl9.test',
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

const INJECTED_FLAG_KEY = 'tapajiro-e2e-session-injected';

function sessionInitScript(storageKey: string, sessionJson: string): string {
  // Inject the synthetic session only on the first document load of a test.
  // A real signOut clears the auth key in localStorage; on later navigations the
  // session must NOT be re-injected, otherwise the post-logout state is invalidated.
  return `if (sessionStorage.getItem(${JSON.stringify(INJECTED_FLAG_KEY)}) !== 'true') { localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(sessionJson)}); sessionStorage.setItem(${JSON.stringify(INJECTED_FLAG_KEY)}, 'true'); }`;
}

async function injectSession(page: Page): Promise<void> {
  const storageKey = computeStorageKey(SUPABASE_URL);
  const session = createTestSession();

  await page.addInitScript(sessionInitScript(storageKey, JSON.stringify(session)));
}

async function mockOrganizationContext(page: Page): Promise<void> {
  await page.route('**/rest/v1/memberships*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-0000-0000-000000000201',
          organization_id: '00000000-0000-0000-0000-000000000101',
          profile_id: '00000000-0000-0000-0000-000000000000',
          status: 'active',
          all_units: true,
        },
      ]),
    });
  });

  await page.route('**/rest/v1/organizations*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-0000-0000-000000000101',
          trade_name: 'Restaurante Tapajós',
          status: 'trial',
        },
      ]),
    });
  });

  await page.route('**/rest/v1/units*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-0000-0000-000000000301',
          organization_id: '00000000-0000-0000-0000-000000000101',
          name: 'Centro',
          slug: 'centro',
          status: 'active',
        },
      ]),
    });
  });
}

const STORAGE_KEY = computeStorageKey(SUPABASE_URL);

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await injectSession(page);
    await mockOrganizationContext(page);
    await use(page);
  },
});

export { STORAGE_KEY, computeStorageKey, createTestSession };
