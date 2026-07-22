/**
 * PWA cache rules — single source of truth for Workbox runtimeCaching.
 *
 * Importado por vite.config.ts e pelo gate test:pwa-cache.
 * Não duplica regras: o test valida este módulo diretamente.
 */

/* ── protected routes ───────────────────────────────────── */

export const PROTECTED_ROUTES = [
  '/auth/v1',
  '/rest/v1',
  '/realtime/v1',
  '/storage/v1',
  '/functions/v1',
  '/graphql/v1',
  '/api',
] as const;

/* ── allowed origins (escaped for regex) ────────────────── */

export const SUPABASE_ORIGIN_SEGMENTS = [
  '127\\.0\\.0\\.1(:\\d+)?',
  'localhost(:\\d+)?',
  '[a-z0-9-]+\\.supabase\\.co',
] as const;

/* ── strategies we must never use for Supabase routes ──── */

export const FORBIDDEN_STRATEGIES = [
  'CacheFirst',
  'NetworkFirst',
  'StaleWhileRevalidate',
  'BackgroundSync',
] as const;

/* ── helpers ────────────────────────────────────────────── */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildOriginPattern(supabaseUrl?: string): string {
  const base = SUPABASE_ORIGIN_SEGMENTS.join('|');
  if (!supabaseUrl) return base;
  let parsed: URL;
  try {
    parsed = new URL(supabaseUrl);
  } catch {
    throw new Error(`VITE_SUPABASE_URL inválida: "${supabaseUrl}" não é uma URL válida`);
  }
  const hostname = escapeRegExp(parsed.hostname);
  const port = parsed.port;
  if (port) {
    return base + '|' + hostname + ':' + escapeRegExp(port);
  }
  return base + '|' + hostname;
}

function buildProtectedRegex(supabaseUrl?: string): RegExp {
  const origin = buildOriginPattern(supabaseUrl);
  const routes = PROTECTED_ROUTES.map((r) => r.replace(/\//g, '\\/')).join('|');
  return new RegExp(`^https?:\\/\\/(${origin})(${routes})(?:\\/|$)`, 'i');
}

/* ── runtimeCaching exported for vite-plugin-pwa ────────── */

export interface RuntimeCachingRule {
  urlPattern: RegExp | ((ctx: { request: Request }) => boolean);
  handler: string;
  options?: Record<string, unknown>;
}

export function buildRuntimeCaching(supabaseUrl?: string): RuntimeCachingRule[] {
  return [
    {
      urlPattern: buildProtectedRegex(supabaseUrl),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-shell',
        networkTimeoutSeconds: 3,
      },
    },
    {
      urlPattern: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/.*\.(?:woff2|woff)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'fonts',
      },
    },
    {
      urlPattern: /\/icons\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'icons',
      },
    },
  ];
}
