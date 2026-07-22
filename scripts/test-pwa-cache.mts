#!/usr/bin/env tsx

/**
 * Gate PWA cache — valida regras de runtimeCaching do Workbox.
 *
 * Execução: pnpm test:pwa-cache
 *
 * Valida:
 *  1. Todas as rotas Supabase/API usam NetworkOnly para GET
 *  2. Nenhuma rota Supabase usa CacheFirst/NetworkFirst/SWR/BackgroundSync
 *  3. POST/PUT/PATCH/DELETE em rotas Supabase não usam estratégias de cache
 *  4. Ativos estáticos locais não são classificados como API
 *  5. URLs parecidas mas não autorizadas não recebem regra indevida
 *  6. Google Fonts e hosts externos não são cacheados
 *  7. Background Sync não é utilizado
 *  8. Controle negativo: rota Supabase com estratégia proibida falha
 *  9. Domínio personalizado configurado é protegido
 * 10. Domínio não configurado não é protegido
 * 11. URL inválida gera erro
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildRuntimeCaching,
  PROTECTED_ROUTES,
  FORBIDDEN_STRATEGIES,
  type RuntimeCachingRule,
} from './pwa-cache-rules';

/* ── paths ─────────────────────────────────────────────── */

const ROOT = join(import.meta.dirname, '..');
const SW_DIST = join(ROOT, 'apps', 'web', 'dist', 'sw.js');
const VITE_CONFIG = join(ROOT, 'apps', 'web', 'vite.config.ts');

/* ── test infrastructure ───────────────────────────────── */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function log(msg: string) {
  process.stdout.write(`${msg}\n`);
}

function error(msg: string) {
  process.stderr.write(`${msg}\n`);
}

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    error(`  FAIL: ${msg}`);
  }
}

function matchRequest(
  pattern: RegExp | ((ctx: { request: Request }) => boolean),
  url: string,
  method: string,
): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(url);
  }
  try {
    const req = new Request(url, { method });
    return pattern({ request: req });
  } catch {
    return false;
  }
}

/* ── URL test cases ────────────────────────────────────── */

interface UrlTestCase {
  url: string;
  description: string;
  shouldMatchProtected: boolean;
  method?: string;
}

const SUPABASE_URLS: UrlTestCase[] = [
  {
    url: 'http://127.0.0.1:54321/auth/v1/token',
    description: '127.0.0.1 auth',
    shouldMatchProtected: true,
  },
  {
    url: 'http://localhost:54321/auth/v1/token',
    description: 'localhost auth',
    shouldMatchProtected: true,
  },
  {
    url: 'https://xyzcompany.supabase.co/auth/v1/token',
    description: 'supabase.co auth',
    shouldMatchProtected: true,
  },
  {
    url: 'http://127.0.0.1:54321/rest/v1/orders',
    description: '127.0.0.1 rest GET',
    shouldMatchProtected: true,
  },
  {
    url: 'http://localhost:54321/rest/v1/orders',
    description: 'localhost rest',
    shouldMatchProtected: true,
  },
  {
    url: 'https://xyzcompany.supabase.co/rest/v1/orders',
    description: 'supabase.co rest',
    shouldMatchProtected: true,
  },
  {
    url: 'http://127.0.0.1:54321/rest/v1/rpc/get_orders',
    description: 'RPC via rest/v1/rpc',
    shouldMatchProtected: true,
  },
  {
    url: 'http://localhost:54321/realtime/v1/websocket',
    description: 'realtime websocket',
    shouldMatchProtected: true,
  },
  {
    url: 'https://xyzcompany.supabase.co/realtime/v1/websocket',
    description: 'supabase.co realtime',
    shouldMatchProtected: true,
  },
  {
    url: 'http://127.0.0.1:54321/storage/v1/object/public/images/test.png',
    description: 'storage object',
    shouldMatchProtected: true,
  },
  {
    url: 'http://localhost:54321/storage/v1/object/sign/bucket',
    description: 'storage signed URL',
    shouldMatchProtected: true,
  },
  {
    url: 'http://127.0.0.1:54321/functions/v1/my-function',
    description: 'edge function',
    shouldMatchProtected: true,
  },
  {
    url: 'https://xyzcompany.supabase.co/functions/v1/my-function',
    description: 'supabase.co functions',
    shouldMatchProtected: true,
  },
  {
    url: 'http://127.0.0.1:54321/graphql/v1',
    description: 'graphql endpoint',
    shouldMatchProtected: true,
  },
  {
    url: 'http://localhost:3000/api/endpoint',
    description: 'local API endpoint',
    shouldMatchProtected: true,
  },
  {
    url: 'http://127.0.0.1:3000/api/v1/data',
    description: 'local API nested',
    shouldMatchProtected: true,
  },
  {
    url: 'http://localhost/auth/v1/token',
    description: 'localhost without port auth',
    shouldMatchProtected: true,
  },
  {
    url: 'http://localhost/rest/v1/orders',
    description: 'localhost without port rest',
    shouldMatchProtected: true,
  },
];

const SUPABASE_POST_URLS: UrlTestCase[] = [
  {
    url: 'http://127.0.0.1:54321/rest/v1/orders',
    description: 'POST rest',
    shouldMatchProtected: true,
    method: 'POST',
  },
  {
    url: 'http://127.0.0.1:54321/rest/v1/orders',
    description: 'PUT rest',
    shouldMatchProtected: true,
    method: 'PUT',
  },
  {
    url: 'http://127.0.0.1:54321/rest/v1/orders',
    description: 'PATCH rest',
    shouldMatchProtected: true,
    method: 'PATCH',
  },
  {
    url: 'http://127.0.0.1:54321/rest/v1/orders',
    description: 'DELETE rest',
    shouldMatchProtected: true,
    method: 'DELETE',
  },
  {
    url: 'http://localhost:54321/auth/v1/signup',
    description: 'POST auth signup',
    shouldMatchProtected: true,
    method: 'POST',
  },
  {
    url: 'http://127.0.0.1:54321/storage/v1/object/images/test.png',
    description: 'POST storage upload',
    shouldMatchProtected: true,
    method: 'POST',
  },
  {
    url: 'http://127.0.0.1:54321/functions/v1/my-function',
    description: 'POST edge function',
    shouldMatchProtected: true,
    method: 'POST',
  },
];

const STATIC_ASSET_URLS: UrlTestCase[] = [
  {
    url: 'http://localhost:3000/',
    description: 'navigation root',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/app',
    description: 'navigation /app',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/assets/index-DT6M0bNS.js',
    description: 'built JS',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/assets/index-BDmuIlC5.css',
    description: 'built CSS',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/icons/icon-192.png',
    description: 'PWA icon',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/icons/apple-touch-icon.png',
    description: 'apple touch icon',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/manifest.json',
    description: 'manifest JSON',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/index.html',
    description: 'HTML shell',
    shouldMatchProtected: false,
  },
];

const NEGATIVE_CONTROL_URLS: UrlTestCase[] = [
  {
    url: 'https://evil.com/rest/v1/steal',
    description: 'evil.com rest (wrong origin)',
    shouldMatchProtected: false,
  },
  {
    url: 'https://evil.com/auth/v1/steal',
    description: 'evil.com auth (wrong origin)',
    shouldMatchProtected: false,
  },
  {
    url: 'https://googleapis.com/fonts/inter-vietnamese-400-normal.woff2',
    description: 'Google Fonts (external host)',
    shouldMatchProtected: false,
  },
  {
    url: 'https://fonts.gstatic.com/s/inter/v12/abc.woff2',
    description: 'gstatic Fonts (external host)',
    shouldMatchProtected: false,
  },
  {
    url: 'http://127.0.0.1:3000/restaurants',
    description: '/restaurants (not /rest/v1)',
    shouldMatchProtected: false,
  },
  {
    url: 'http://localhost:3000/authors',
    description: '/authors (not /auth/v1)',
    shouldMatchProtected: false,
  },
  {
    url: 'http://127.0.0.1:3000/storages',
    description: '/storages (not /storage/v1)',
    shouldMatchProtected: false,
  },
  {
    url: 'http://127.0.0.1:3000/function-calls',
    description: '/function-calls (not /functions/v1)',
    shouldMatchProtected: false,
  },
  {
    url: 'https://notsupabase.com/rest/v1/data',
    description: 'notsupabase.com (not *.supabase.co)',
    shouldMatchProtected: false,
  },
  {
    url: 'http://127.0.0.1:3000/realtime-chat',
    description: '/realtime-chat (not /realtime/v1)',
    shouldMatchProtected: false,
  },
  {
    url: 'https://evil-tapajiro.com/rest/v1/data',
    description: 'similar-looking malicious domain',
    shouldMatchProtected: false,
  },
  {
    url: 'https://api.tapajiro.com.evil.com/rest/v1/data',
    description: 'subdomain of evil.com with tapajiro',
    shouldMatchProtected: false,
  },
];

/* ── helpers ────────────────────────────────────────────── */

function getProtectedRule(rules: RuntimeCachingRule[]): RuntimeCachingRule | undefined {
  return rules.find((r) => {
    if (r.handler !== 'NetworkOnly') return false;
    if (r.urlPattern instanceof RegExp) {
      return PROTECTED_ROUTES.some((route) =>
        r.urlPattern.source.includes(route.replace(/\//g, '\\/')),
      );
    }
    return false;
  });
}

function getNavigationRule(rules: RuntimeCachingRule[]): RuntimeCachingRule | undefined {
  return rules.find((r) => typeof r.urlPattern === 'function' && r.handler === 'NetworkFirst');
}

function getFontRule(rules: RuntimeCachingRule[]): RuntimeCachingRule | undefined {
  return rules.find(
    (r) =>
      r.urlPattern instanceof RegExp &&
      r.urlPattern.source.includes('woff') &&
      r.handler !== 'NetworkOnly',
  );
}

function getIconRule(rules: RuntimeCachingRule[]): RuntimeCachingRule | undefined {
  return rules.find(
    (r) =>
      r.urlPattern instanceof RegExp &&
      r.urlPattern.source.includes('icons') &&
      r.handler !== 'NetworkOnly',
  );
}

/* ── main tests ────────────────────────────────────────── */

log('\n── PWA Cache Gate ──────────────────────────────────\n');

// 1. Structural validation
log('1. Structural validation');

const rules = buildRuntimeCaching();
assert(rules.length >= 4, `Expected at least 4 rules, got ${rules.length}`);

const protectedRule = getProtectedRule(rules);
assert(protectedRule !== undefined, 'NetworkOnly rule for protected routes not found');
assert(protectedRule?.handler === 'NetworkOnly', 'Protected route handler must be NetworkOnly');

const navRule = getNavigationRule(rules);
assert(navRule !== undefined, 'NetworkFirst rule for navigation not found');

const fontRule = getFontRule(rules);
assert(fontRule !== undefined, 'StaleWhileRevalidate rule for fonts not found');

const iconRule = getIconRule(rules);
assert(iconRule !== undefined, 'StaleWhileRevalidate rule for icons not found');

// 2. No forbidden strategies for Supabase routes
log('2. No forbidden strategies for Supabase routes');

for (const rule of rules) {
  if (rule === protectedRule) continue;
  if (rule.urlPattern instanceof RegExp && protectedRule?.urlPattern instanceof RegExp) {
    const testUrls = [
      'http://127.0.0.1:54321/rest/v1/test',
      'http://localhost:54321/auth/v1/test',
      'https://xyz.supabase.co/rest/v1/test',
    ];
    for (const url of testUrls) {
      if (rule.urlPattern.test(url)) {
        assert(
          !FORBIDDEN_STRATEGIES.includes(rule.handler as (typeof FORBIDDEN_STRATEGIES)[number]),
          `Rule with handler "${rule.handler}" matches Supabase URL "${url}" — forbidden strategy`,
        );
      }
    }
  }
}

// 3. Font rule only matches local origins
log('3. Font rule only matches local origins');

const localFontUrls = [
  'http://localhost:3000/assets/inter-latin-400-normal.woff2',
  'http://127.0.0.1:3000/assets/inter-latin-400-normal.woff',
];

const externalFontUrls = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2',
  'https://fonts.gstatic.com/s/inter/v12/abc.woff',
];

if (fontRule?.urlPattern instanceof RegExp) {
  for (const url of localFontUrls) {
    assert(fontRule.urlPattern.test(url), `Local font URL should match: ${url}`);
  }
  for (const url of externalFontUrls) {
    assert(!fontRule.urlPattern.test(url), `External font URL must NOT match: ${url}`);
  }
}

// 4. Supabase URL matching — positive
log('4. Supabase URL matching (positive)');

if (protectedRule?.urlPattern instanceof RegExp) {
  for (const tc of [...SUPABASE_URLS, ...SUPABASE_POST_URLS]) {
    const matched = matchRequest(protectedRule.urlPattern, tc.url, tc.method ?? 'GET');
    assert(
      matched === tc.shouldMatchProtected,
      `${tc.description}: expected ${tc.shouldMatchProtected}, got ${matched}`,
    );
  }
}

// 5. Static asset URLs — must NOT match protected rule
log('5. Static assets must not match protected rule');

if (protectedRule?.urlPattern instanceof RegExp) {
  for (const tc of STATIC_ASSET_URLS) {
    const matched = protectedRule.urlPattern.test(tc.url);
    assert(!matched, `${tc.description}: must NOT match protected rule, but did`);
  }
}

// 6. Negative controls — must NOT match protected rule
log('6. Negative controls');

if (protectedRule?.urlPattern instanceof RegExp) {
  for (const tc of NEGATIVE_CONTROL_URLS) {
    const matched = protectedRule.urlPattern.test(tc.url);
    assert(!matched, `${tc.description}: must NOT match protected rule, but did`);
  }
}

// 7. Background Sync check
log('7. No Background Sync');

const hasBackgroundSync = rules.some(
  (r) => r.handler === 'BackgroundSync' || r.handler === 'BackgroundFetch',
);
assert(!hasBackgroundSync, 'BackgroundSync or BackgroundFetch found in rules');

// 8. No forbidden strategies overall (except allowed ones)
log('8. Strategy validation');

const ALLOWED_STRATEGIES = ['NetworkOnly', 'NetworkFirst', 'StaleWhileRevalidate', 'CacheFirst'];
for (const rule of rules) {
  assert(
    ALLOWED_STRATEGIES.includes(rule.handler),
    `Unknown handler "${rule.handler}" in runtimeCaching`,
  );
}

// 9. Custom domain configured — should be protected
log('9. Custom domain when configured');

const CUSTOM_DOMAIN_URLS_NO_PORT: UrlTestCase[] = [
  {
    url: 'https://api.tapajiro.com/rest/v1/orders',
    description: 'custom domain rest (no port)',
    shouldMatchProtected: true,
  },
  {
    url: 'https://api.tapajiro.com/auth/v1/token',
    description: 'custom domain auth (no port)',
    shouldMatchProtected: true,
  },
];

const customDomainRulesNoPort = buildRuntimeCaching('https://api.tapajiro.com');
const customProtectedRuleNoPort = getProtectedRule(customDomainRulesNoPort);
assert(customProtectedRuleNoPort !== undefined, 'NetworkOnly rule for custom domain not found');

if (customProtectedRuleNoPort?.urlPattern instanceof RegExp) {
  for (const tc of CUSTOM_DOMAIN_URLS_NO_PORT) {
    const matched = matchRequest(customProtectedRuleNoPort.urlPattern, tc.url, tc.method ?? 'GET');
    assert(
      matched === tc.shouldMatchProtected,
      `${tc.description}: expected ${tc.shouldMatchProtected}, got ${matched}`,
    );
  }
}

const customDomainRulesWithPort = buildRuntimeCaching('https://api.tapajiro.com:8443');
const customProtectedRuleWithPort = getProtectedRule(customDomainRulesWithPort);
assert(
  customProtectedRuleWithPort !== undefined,
  'NetworkOnly rule for custom domain with port not found',
);

if (customProtectedRuleWithPort?.urlPattern instanceof RegExp) {
  const withPortUrls: UrlTestCase[] = [
    {
      url: 'https://api.tapajiro.com:8443/rest/v1/orders',
      description: 'custom domain with port rest',
      shouldMatchProtected: true,
    },
    {
      url: 'https://api.tapajiro.com:8443/auth/v1/token',
      description: 'custom domain with port auth',
      shouldMatchProtected: true,
    },
  ];
  for (const tc of withPortUrls) {
    const matched = matchRequest(
      customProtectedRuleWithPort.urlPattern,
      tc.url,
      tc.method ?? 'GET',
    );
    assert(
      matched === tc.shouldMatchProtected,
      `${tc.description}: expected ${tc.shouldMatchProtected}, got ${matched}`,
    );
  }
}

// 10. Custom domain NOT configured — should NOT be protected
log('10. Custom domain NOT configured');

const defaultRules = buildRuntimeCaching();
const defaultProtectedRule = getProtectedRule(defaultRules);
if (defaultProtectedRule?.urlPattern instanceof RegExp) {
  const customOnlyUrl = 'https://api.tapajiro.com/rest/v1/orders';
  const matched = defaultProtectedRule.urlPattern.test(customOnlyUrl);
  assert(!matched, 'api.tapajiro.com must NOT match when not configured');
}

// 11. Malicious lookalike domain — must NOT match
log('11. Malicious lookalike domains');

if (protectedRule?.urlPattern instanceof RegExp) {
  for (const tc of NEGATIVE_CONTROL_URLS.filter(
    (u) => u.description.includes('malicious') || u.description.includes('evil'),
  )) {
    const matched = protectedRule.urlPattern.test(tc.url);
    assert(!matched, `${tc.description}: must NOT match protected rule, but did`);
  }
}

// 12. Invalid URL should throw
log('12. Invalid URL throws error');

let threwOnInvalid = false;
try {
  buildRuntimeCaching('not-a-valid-url');
} catch (e) {
  threwOnInvalid = e instanceof Error && e.message.includes('inválida');
}
assert(threwOnInvalid, 'Invalid non-empty URL must throw a clear error');

// 13. Empty URL is fine (no custom domain)
log('13. Empty URL accepted');

let threwOnEmpty = false;
try {
  buildRuntimeCaching('');
} catch {
  threwOnEmpty = true;
}
assert(!threwOnEmpty, 'Empty URL must not throw');

// 14. Undefined URL is fine
log('14. Undefined URL accepted');

let threwOnUndefined = false;
try {
  buildRuntimeCaching(undefined);
} catch {
  threwOnUndefined = true;
}
assert(!threwOnUndefined, 'Undefined URL must not throw');

// 15. Vite config validation
log('15. vite.config.ts uses loadEnv and passes URL');

if (existsSync(VITE_CONFIG)) {
  const configContent = readFileSync(VITE_CONFIG, 'utf-8');
  assert(
    configContent.includes('pwa-cache-rules'),
    'vite.config.ts must import from pwa-cache-rules',
  );
  assert(
    configContent.includes('buildRuntimeCaching'),
    'vite.config.ts must call buildRuntimeCaching()',
  );
  assert(configContent.includes('loadEnv'), 'vite.config.ts must import loadEnv from vite');
  assert(configContent.includes('VITE_SUPABASE_URL'), 'vite.config.ts must read VITE_SUPABASE_URL');
  assert(
    !configContent.includes('urlPattern: /^https'),
    'vite.config.ts must not contain inline urlPattern regex — use buildRuntimeCaching()',
  );
}

// 16. Build output validation
log('16. Service Worker build output');

const swContent = readFileSync(SW_DIST, 'utf-8');

assert(
  swContent.includes('NetworkOnly') || swContent.includes('networkOnly'),
  'SW must contain NetworkOnly strategy',
);

const forbiddenCacheNames = ['supabase-rest', 'supabase-auth', 'supabase-realtime', 'api-cache'];
for (const name of forbiddenCacheNames) {
  assert(!swContent.includes(`"${name}"`), `SW must not contain cache name "${name}"`);
}

assert(
  swContent.includes('app-shell') || swContent.includes('app_shell'),
  'SW must contain app-shell cache for navigation',
);

// 17. Background Sync negative control in SW
log('17. Background Sync negative control in SW');

assert(!swContent.includes('backgroundSync'), 'SW must not contain backgroundSync registration');
assert(!swContent.includes('BackgroundSync'), 'SW must not contain BackgroundSync class');

/* ── summary ───────────────────────────────────────────── */

log('\n── Results ─────────────────────────────────────────\n');

if (failed > 0) {
  error(`FAIL: ${failed} assertion(s) failed:\n`);
  for (const f of failures) {
    error(`  - ${f}`);
  }
  log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(1);
} else {
  log(`OK: ${passed} assertions passed, 0 failed\n`);
  process.exit(0);
}
