import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'apps', 'web');
const SCREENSHOT_DIR = path.resolve(ROOT, 'screenshots');

const EXPECTED_FILES = [
  { name: 'home-360.png', width: 360, height: 800 },
  { name: 'login-360.png', width: 360, height: 800 },
  { name: 'app-360.png', width: 360, height: 800 },
  { name: 'home-768.png', width: 768, height: 1024 },
  { name: 'login-768.png', width: 768, height: 1024 },
  { name: 'app-768.png', width: 768, height: 1024 },
  { name: 'home-1024.png', width: 1024, height: 768 },
  { name: 'login-1024.png', width: 1024, height: 768 },
  { name: 'app-1024.png', width: 1024, height: 768 },
  { name: 'home-1440.png', width: 1440, height: 900 },
  { name: 'login-1440.png', width: 1440, height: 900 },
  { name: 'app-1440.png', width: 1440, height: 900 },
  { name: 'unit-operational-configuration-360.png', width: 360, height: 800 },
  { name: 'unit-operational-configuration-768.png', width: 768, height: 1024 },
  { name: 'unit-operational-configuration-1024.png', width: 1024, height: 768 },
  { name: 'unit-operational-configuration-1440.png', width: 1440, height: 900 },
];

/* ── Port ── */

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'string' || !addr) {
        server.close(() => reject(new Error('Unable to determine free port')));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else if (Date.now() - start > timeoutMs) {
            reject(new Error(`Server did not become ready within ${timeoutMs}ms`));
          } else {
            setTimeout(check, 300);
          }
        })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Server did not become ready within ${timeoutMs}ms`));
          } else {
            setTimeout(check, 300);
          }
        });
    };
    check();
  });
}

/* ── Auth session (test only) ── */

const SCREENSHOT_SUPABASE_URL = 'http://localhost:0';

function screenshotStorageKey(): string {
  const hostname = new URL(SCREENSHOT_SUPABASE_URL).hostname;
  return `sb-${hostname.split('.')[0]}-auth-token`;
}

function screenshotTestSession(): string {
  return JSON.stringify({
    access_token:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAifQ.test',
    token_type: 'bearer',
    expires_in: 36000,
    expires_at: 9_999_999_999,
    refresh_token: 'screenshot-test-refresh-token',
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
  });
}

async function mockOrganizationContext(page: import('playwright-core').Page): Promise<void> {
  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }),
    });
  });
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
  await page.route('**/rest/v1/unit_settings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        unit_id: '00000000-0000-0000-0000-000000000301',
        organization_id: '00000000-0000-0000-0000-000000000101',
        delivery_enabled: true,
        pickup_enabled: true,
        counter_enabled: false,
        accept_immediate_orders: true,
        delivery_minimum_cents: 2500,
        pickup_minimum_cents: 0,
        counter_minimum_cents: 500,
        operational_message: 'Atendimento normal nesta unidade.',
      }),
    });
  });
  await page.route('**/rest/v1/business_hours*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-0000-0000-000000000401',
          organization_id: '00000000-0000-0000-0000-000000000101',
          unit_id: '00000000-0000-0000-0000-000000000301',
          weekday: 1,
          sequence: 1,
          opens_at: '08:00:00',
          closes_at: '18:00:00',
          crosses_midnight: false,
          active: true,
        },
      ]),
    });
  });
}

/* ── Build ── */

function build(): void {
  process.stdout.write('Building production dist…\n');
  execSync('pnpm --filter @tapajiro/web build', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: SCREENSHOT_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: 'screenshot-anon-key',
    },
  });
}

/* ── PNG helpers ── */

function readPngDimensions(filePath: string): { width: number; height: number } {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      throw new Error(`Not a valid PNG: ${filePath}`);
    }
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}

function cleanupOldScreenshots(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) return;
  const expected = new Set(EXPECTED_FILES.map((f) => f.name));
  for (const file of fs.readdirSync(SCREENSHOT_DIR)) {
    if (file.endsWith('.png') && !expected.has(file)) {
      fs.unlinkSync(path.join(SCREENSHOT_DIR, file));
      process.stdout.write(`Removed old screenshot: ${file}\n`);
    }
  }
}

/* ── Kill server ── */

function killServer(server: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve) => {
    if (server.killed || !server.pid) {
      resolve();
      return;
    }
    if (process.platform === 'win32') {
      const kill = spawn('taskkill', ['/F', '/T', '/PID', String(server.pid)], {
        stdio: 'ignore',
      });
      kill.on('close', () => resolve());
      kill.on('error', () => resolve());
    } else {
      server.on('close', () => resolve());
      server.on('error', () => resolve());
      server.kill('SIGTERM');
    }
  });
}

/* ── Main ── */

async function main() {
  build();

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  process.stdout.write(`Selected free port: ${port}\n`);

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  cleanupOldScreenshots();

  const args = ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  let server: ReturnType<typeof spawn>;
  if (process.platform === 'win32') {
    const viteCmd = path.join(WEB, 'node_modules', '.bin', 'vite.CMD');
    server = spawn('cmd.exe', ['/d', '/c', viteCmd, ...args], {
      stdio: 'pipe',
      cwd: WEB,
    });
  } else {
    const viteBin = path.join(WEB, 'node_modules', '.bin', 'vite');
    server = spawn(viteBin, args, {
      stdio: 'pipe',
      cwd: WEB,
    });
  }
  server.stderr?.on('data', (chunk: Buffer) => process.stderr.write(chunk));

  let exitCode = 0;

  try {
    process.stdout.write(`Waiting for preview server on port ${port}…\n`);
    await waitForServer(baseUrl);
    process.stdout.write('Server ready.\n');

    let browser;
    try {
      browser = await chromium.launch();
    } catch (err) {
      process.stderr.write(`FAIL: Could not launch browser: ${String(err)}\n`);
      exitCode = 1;
      return;
    }

    try {
      for (const expected of EXPECTED_FILES) {
        const vp = { width: expected.width, height: expected.height };
        const routePath = expected.name.startsWith('home')
          ? '/'
          : expected.name.startsWith('login')
            ? '/login'
            : expected.name.startsWith('unit-operational-configuration')
              ? '/app/organizacao/configuracao'
              : '/app';
        const page = await browser.newPage({ viewport: vp });

        if (expected.name.startsWith('app')) {
          const sessionJson = screenshotTestSession();
          const key = screenshotStorageKey();
          await page.addInitScript(
            `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(sessionJson)});`,
          );
        }
        if (expected.name.startsWith('unit-operational-configuration')) {
          await page.addInitScript(
            `localStorage.setItem(${JSON.stringify(screenshotStorageKey())}, ${JSON.stringify(screenshotTestSession())});`,
          );
          await mockOrganizationContext(page);
        }

        const response = await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'networkidle' });
        if (!response || !response.ok()) {
          process.stderr.write(
            `FAIL: ${routePath} returned status ${response?.status() ?? 'none'}\n`,
          );
          await page.close();
          exitCode = 1;
          continue;
        }

        const filePath = path.join(SCREENSHOT_DIR, expected.name);
        await page.screenshot({ path: filePath });
        await page.close();

        if (!fs.existsSync(filePath)) {
          process.stderr.write(`FAIL: ${expected.name} was not created\n`);
          exitCode = 1;
          continue;
        }

        const dims = readPngDimensions(filePath);
        const size = fs.statSync(filePath).size;
        if (dims.width !== vp.width || dims.height !== vp.height) {
          process.stderr.write(
            `FAIL: ${expected.name} dimensions ${dims.width}x${dims.height} != ${vp.width}x${vp.height}\n`,
          );
          exitCode = 1;
        } else {
          process.stdout.write(
            `OK: ${expected.name} ${dims.width}x${dims.height} (${size} bytes)\n`,
          );
        }
      }

      const existing = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png'));
      const missing = EXPECTED_FILES.filter((f) => !existing.includes(f.name));
      if (missing.length > 0) {
        process.stderr.write(`FAIL: Missing files: ${missing.map((f) => f.name).join(', ')}\n`);
        exitCode = 1;
      }
    } finally {
      await browser.close();
    }

    process.stdout.write(
      exitCode === 0
        ? `All ${EXPECTED_FILES.length} screenshots OK.\n`
        : 'Some screenshots failed validation.\n',
    );
  } finally {
    await killServer(server);
    process.stdout.write('Server stopped.\n');
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
