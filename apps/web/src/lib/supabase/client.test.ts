import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSupabaseClient, getSupabaseClient, buildErrorMessage, resetClient } from './client';

const VALID_URL = 'https://example.supabase.co';
const VALID_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example';

beforeEach(() => {
  resetClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createSupabaseClient', () => {
  it('creates a client with valid URL and anon key', () => {
    const client = createSupabaseClient({
      supabaseUrl: VALID_URL,
      supabaseAnonKey: VALID_KEY,
    });
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('throws on empty URL', () => {
    expect(() => createSupabaseClient({ supabaseUrl: '', supabaseAnonKey: VALID_KEY })).toThrow(
      'URL is missing',
    );
  });

  it('throws on empty anon key', () => {
    expect(() => createSupabaseClient({ supabaseUrl: VALID_URL, supabaseAnonKey: '' })).toThrow(
      'anon key is missing',
    );
  });

  it('sets auth options correctly', () => {
    const client = createSupabaseClient({
      supabaseUrl: VALID_URL,
      supabaseAnonKey: VALID_KEY,
    });
    const { auth } = client;
    expect(auth).toBeDefined();
  });
});

describe('getSupabaseClient singleton', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', VALID_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_KEY);
  });

  it('returns a client when env vars are set', () => {
    const client = getSupabaseClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('returns the same instance on repeated calls', () => {
    const a = getSupabaseClient();
    const b = getSupabaseClient();
    expect(a).toBe(b);
  });

  it('does not throw on import (client is lazy)', async () => {
    await expect(import('./client')).resolves.toBeDefined();
  });
});

describe('getSupabaseClient — missing env vars', () => {
  it('throws when URL is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_KEY);
    expect(() => getSupabaseClient()).toThrow('VITE_SUPABASE_URL is not configured');
  });

  it('throws when anon key is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', VALID_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(() => getSupabaseClient()).toThrow('VITE_SUPABASE_ANON_KEY is not configured');
  });
});

describe('buildErrorMessage', () => {
  it('does not leak the anon key value', () => {
    vi.stubEnv('VITE_SUPABASE_URL', VALID_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_KEY);
    const msg = buildErrorMessage();
    expect(msg).not.toContain(VALID_KEY);
    expect(msg).toContain('xxx');
  });

  it('reports missing URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_KEY);
    expect(buildErrorMessage()).toContain('missing URL');
  });

  it('reports missing anon key', () => {
    vi.stubEnv('VITE_SUPABASE_URL', VALID_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(buildErrorMessage()).toContain('missing anon key');
  });

  it('reports both missing when both are empty', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const msg = buildErrorMessage();
    expect(msg).toContain('missing URL');
    expect(msg).toContain('missing anon key');
  });
});

describe('singleton isolation', () => {
  it('resetClient clears cached instance', () => {
    vi.stubEnv('VITE_SUPABASE_URL', VALID_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_KEY);

    const first = getSupabaseClient();
    resetClient();
    const second = getSupabaseClient();
    expect(second).not.toBe(first);
  });
});
