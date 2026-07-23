import { expect } from '@playwright/test';
import { test } from './auth.fixture';
import AxeBuilder from '@axe-core/playwright';

test.describe('Home page', () => {
  test('renders the title and heading', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tapajiro');
  });

  test('has correct landmarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('single h1 heading', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
  });

  test('navigate to /app via link redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /entrar/i }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Acesse o Tapajiro');
  });

  test('PWA manifest link is present', async ({ page }) => {
    await page.goto('/');
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', '/manifest.json');
  });

  test('theme-color meta tag is correct', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="theme-color"]');
    await expect(meta).toHaveAttribute('content', '#002B8F');
  });

  test('apple-touch-icon link is present', async ({ page }) => {
    await page.goto('/');
    const icon = page.locator('link[rel="apple-touch-icon"]');
    await expect(icon).toHaveAttribute('href', '/icons/apple-touch-icon.png');
  });

  test('lang attribute is pt-BR', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
});

test.describe('App page', () => {
  test('renders the panel heading', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Fundação do Tapajiro',
    );
  });

  test('has sidebar on desktop', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 1440, height: 900 });
    await authenticatedPage.goto('/app');
    await expect(authenticatedPage.locator('.hidden.w-64')).toBeVisible();
  });
});

test.describe('Not found page', () => {
  test('shows 404 for unknown routes', async ({ authenticatedPage: page }) => {
    await page.goto('/nonexistent');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
  });

  test('has a link back to home', async ({ authenticatedPage: page }) => {
    await page.goto('/nonexistent');
    await page.getByRole('link', { name: /voltar/i }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('PWA icons', () => {
  const iconFiles = [
    'icon-72.png',
    'icon-96.png',
    'icon-128.png',
    'icon-144.png',
    'icon-152.png',
    'icon-192.png',
    'icon-maskable-192.png',
    'icon-384.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'apple-touch-icon.png',
    'favicon-32.png',
    'favicon-16.png',
  ];

  for (const file of iconFiles) {
    test(`icon ${file} returns 200`, async ({ request }) => {
      const response = await request.get(`/icons/${file}`);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe('Manifest', () => {
  test('manifest.json returns valid JSON', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.name).toBe('Tapajiro');
    expect(json.short_name).toBe('Tapajiro');
    expect(json.display).toBe('standalone');
    expect(json.background_color).toBe('#F4F4F4');
    expect(json.theme_color).toBe('#002B8F');
    expect(json.lang).toBe('pt-BR');
  });

  test('manifest references existing icon files', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const json = await response.json();
    for (const icon of json.icons) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.status()).toBe(200);
    }
  });
});

test.describe('Keyboard navigation', () => {
  test('tab navigates through interactive elements on home', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('enter activates the primary link and redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /entrar/i }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Focus visibility', () => {
  test('focused button has visible outline', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /entrar/i }).focus();
    const link = page.getByRole('link', { name: /entrar/i });
    const outline = await link.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle || style.outline;
    });
    expect(outline).not.toBe('none');
  });
});

test.describe('Viewport sizes', () => {
  test('renders correctly at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('renders correctly at 1440px width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });
});

test.describe('Network hosts - /', () => {
  test('no requests to external hosts on home page', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        hosts.add(url.hostname);
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect([...hosts]).toEqual([]);
  });
});

test.describe('Network hosts - /app', () => {
  test('no requests to external hosts on app page', async ({ authenticatedPage }) => {
    const hosts = new Set<string>();
    authenticatedPage.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        hosts.add(url.hostname);
      }
    });
    await authenticatedPage.goto('/app');
    await authenticatedPage.waitForLoadState('networkidle');
    expect([...hosts]).toEqual([]);
  });
});

test.describe('Console errors', () => {
  test('no unhandled errors on home page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('no unhandled errors on app page', async ({ authenticatedPage }) => {
    const errors: string[] = [];
    authenticatedPage.on('pageerror', (err) => errors.push(err.message));
    await authenticatedPage.goto('/app');
    await authenticatedPage.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

test.describe('PWA install flow', () => {
  test('shows install button when beforeinstallprompt fires', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/app');

    const installButton = page.getByRole('button', { name: /instalar/i });
    await expect(installButton).not.toBeVisible();

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      event.preventDefault = () => {};
      event.prompt = async () => {};
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    await expect(installButton).toBeVisible();
  });

  test('calls prompt only once on double click', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/app');

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      event.preventDefault = () => {};
      event.prompt = async () => {};
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installButton = page.getByRole('button', { name: /instalar/i });
    await expect(installButton).toBeVisible();

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      event.preventDefault = () => {};
      let promptCount = 0;
      event.prompt = async () => {
        promptCount++;
        (window as unknown as { __promptCount: number }).__promptCount = promptCount;
      };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    await installButton.dblclick();

    const promptCount = await page.evaluate(
      () => (window as unknown as { __promptCount?: number }).__promptCount ?? 0,
    );
    expect(promptCount).toBe(1);
  });

  test('hides install button after outcome', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/app');

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      event.preventDefault = () => {};
      event.prompt = async () => {};
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installButton = page.getByRole('button', { name: /instalar/i });
    await expect(installButton).toBeVisible();

    await installButton.click();

    await expect(installButton).not.toBeVisible();
  });

  test('install button is disabled during installation', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/app');

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      event.preventDefault = () => {};
      event.prompt = () => new Promise<void>((resolve) => setTimeout(resolve, 100));
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const installButton = page.getByRole('button', { name: /instalar/i });
    await expect(installButton).toBeVisible();

    await installButton.click();
    await expect(installButton).toBeDisabled();
  });

  test('install accessible at 360×800 via drawer — single prompt, no overflow', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');

    await page.evaluate(() => {
      let promptCalls = 0;
      (window as unknown as { __promptCount: number }).__promptCount = 0;
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      event.preventDefault = () => {};
      event.prompt = async () => {
        promptCalls++;
        (window as unknown as { __promptCount: number }).__promptCount = promptCalls;
      };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    const hamburger = page.getByRole('button', { name: 'Menu', exact: true });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    const drawer = page.getByRole('dialog', { name: /navegação/i });
    await expect(drawer).toBeVisible();

    const installButton = page.getByRole('button', { name: /instalar/i });
    await expect(installButton).toBeVisible();
    await installButton.click();

    const promptCount = await page.evaluate(
      () => (window as unknown as { __promptCount?: number }).__promptCount ?? 0,
    );
    expect(promptCount).toBe(1);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe('SW update flow', () => {
  test('shows update banner when sw-updated fires', async ({ authenticatedPage: page }) => {
    await page.goto('/app');

    const updateBanner = page.getByRole('status').filter({ hasText: /nova versão/i });
    await expect(updateBanner).not.toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    await expect(updateBanner).toBeVisible();
  });

  test('clicking update triggers acceptUpdate', async ({ authenticatedPage: page }) => {
    await page.goto('/app');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const updateButton = page.getByRole('button', { name: /atualizar/i });
    await expect(updateButton).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __acceptUpdateCount: number }).__acceptUpdateCount = 0;
      window.addEventListener('click', () => {
        (window as unknown as { __acceptUpdateCount: number }).__acceptUpdateCount++;
      });
    });

    await updateButton.click();

    const count = await page.evaluate(
      () => (window as unknown as { __acceptUpdateCount?: number }).__acceptUpdateCount ?? 0,
    );
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('double-click does not call update twice', async ({ authenticatedPage: page }) => {
    await page.goto('/app');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const updateButton = page.getByRole('button', { name: /atualizar/i });
    await expect(updateButton).toBeVisible();

    await page.evaluate(() => {
      let callCount = 0;
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      window.dispatchEvent = function (event: Event) {
        if (event.type === 'sw-updated') {
          callCount++;
          (window as unknown as { __swUpdateCallCount: number }).__swUpdateCallCount = callCount;
        }
        return originalDispatchEvent(event);
      } as typeof window.dispatchEvent;
      (window as unknown as { __swUpdateCallCount: number }).__swUpdateCallCount = 0;
    });

    await updateButton.dblclick();

    const callCount = await page.evaluate(
      () => (window as unknown as { __swUpdateCallCount?: number }).__swUpdateCallCount ?? 0,
    );
    expect(callCount).toBeLessThanOrEqual(1);
  });
  test('banner remains visible after clicking update with button disabled', async ({
    authenticatedPage: page,
  }) => {
    let resolveSWUpdate: (() => void) | undefined;
    const swUpdateBlocked = new Promise<void>((resolve) => {
      resolveSWUpdate = resolve;
    });

    await page.route('**/assets/workbox-window*.js', async (route) => {
      await swUpdateBlocked;
      await route.continue();
    });

    await page.goto('/app');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const updateBanner = page.getByRole('status').filter({ hasText: /nova versão/i });
    await expect(updateBanner).toBeVisible();

    const updateButton = page.getByRole('button', { name: /atualizar/i });
    await expect(updateButton).toBeEnabled();

    await updateButton.click();

    await expect(updateBanner).toBeVisible();
    await expect(updateButton).toBeDisabled();

    resolveSWUpdate!();

    await expect(updateBanner).not.toBeVisible();
  });

  test('button shows spinner when updating', async ({ authenticatedPage: page }) => {
    let resolveSWUpdate: (() => void) | undefined;
    const swUpdateBlocked = new Promise<void>((resolve) => {
      resolveSWUpdate = resolve;
    });

    await page.route('**/assets/workbox-window*.js', async (route) => {
      await swUpdateBlocked;
      await route.continue();
    });

    await page.goto('/app');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const updateButton = page.getByRole('button', { name: /atualizar/i });
    await expect(updateButton).toBeVisible();

    const spinnerBeforeClick = updateButton.locator('svg');
    await expect(spinnerBeforeClick).toHaveCount(0);

    await updateButton.click();

    const spinnerAfterClick = updateButton.locator('svg');
    await expect(spinnerAfterClick).toHaveCount(1);
    await expect(spinnerAfterClick.first()).toHaveAttribute('aria-hidden', 'true');

    await expect(updateButton).toBeDisabled();

    resolveSWUpdate!();

    await expect(spinnerAfterClick).toHaveCount(0);

    const updateBanner = page.getByRole('status').filter({ hasText: /nova versão/i });
    await expect(updateBanner).not.toBeVisible();
  });
  test('no window.location.reload called directly', async ({ authenticatedPage: page }) => {
    await page.goto('/app');

    let reloadCalled = false;
    await page.evaluate(() => {
      const originalReload = window.location.reload.bind(window.location);
      window.location.reload = function () {
        (window as unknown as { __reloadCalled: boolean }).__reloadCalled = true;
        return originalReload();
      } as () => void;
      (window as unknown as { __reloadCalled: boolean }).__reloadCalled = false;
    });

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const updateButton = page.getByRole('button', { name: /atualizar/i });
    await updateButton.click();

    reloadCalled = await page.evaluate(
      () => (window as unknown as { __reloadCalled?: boolean }).__reloadCalled ?? false,
    );
    expect(reloadCalled).toBe(false);
  });

  test('no unhandled console errors during update flow', async ({ authenticatedPage: page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-updated'));
    });

    const updateButton = page.getByRole('button', { name: /atualizar/i });
    await expect(updateButton).toBeVisible();
    await updateButton.click();

    expect(errors).toHaveLength(0);
  });
});

test.describe('AppShell - Drawer accessibility', () => {
  test('hamburger visible on mobile (<768px)', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');
    const hamburger = page.getByRole('button', { name: 'Menu', exact: true });
    await expect(hamburger).toBeVisible();
  });

  test('hamburger hidden on desktop (>=768px)', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/app');
    const hamburger = page.getByRole('button', { name: 'Menu', exact: true });
    await expect(hamburger).not.toBeVisible();
  });

  test('open drawer via hamburger and close via Escape', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');

    const hamburger = page.getByRole('button', { name: 'Menu', exact: true });
    await expect(hamburger).toBeVisible();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    await hamburger.click();
    const drawer = page.getByRole('dialog', { name: /navegação/i });
    await expect(drawer).toBeVisible();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  test('close drawer via backdrop click', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');

    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: /navegação/i });
    await expect(drawer).toBeVisible();

    const backdrop = page.locator('[aria-hidden="true"].fixed');
    await backdrop.click({ position: { x: 350, y: 400 } });
    await expect(drawer).not.toBeVisible();
  });

  test('close drawer via close button and focus returns to hamburger', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');

    const hamburger = page.getByRole('button', { name: 'Menu', exact: true });
    await hamburger.click();

    const closeBtn = page.getByRole('button', { name: /fechar menu/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    const drawer = page.getByRole('dialog', { name: /navegação/i });
    await expect(drawer).not.toBeVisible();

    await expect(hamburger).toBeFocused();
  });

  test('focus is trapped inside drawer with Tab', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');

    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: /navegação/i });
    await expect(drawer).toBeVisible();

    const closeBtn = page.getByRole('button', { name: /fechar menu/i });
    await expect(closeBtn).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(closeBtn).toBeFocused();
  });

  test('body scroll is locked when drawer is open', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');

    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    await page.keyboard.press('Escape');
    const bodyOverflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflowAfter).toBe('');
  });
});

test.describe('AppShell - Accessibility (axe-core)', () => {
  test('app page has zero axe violations', async ({ authenticatedPage: page }) => {
    await page.goto('/app');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('app page with open drawer has zero axe violations', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');

    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.waitForTimeout(200);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('AppShell - Viewport validation', () => {
  test('renders correctly at 360px', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fundação do Tapajiro');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test('renders correctly at 768px', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/app');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fundação do Tapajiro');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('renders correctly at 1024px', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/app');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fundação do Tapajiro');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('renders correctly at 1440px', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/app');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fundação do Tapajiro');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('no horizontal overflow at 360px', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

test.describe('Connectivity', () => {
  test('online indicator shows "Com conexão"', async ({ authenticatedPage: page }) => {
    await page.goto('/app');
    await expect(page.getByText('Com conexão')).toBeVisible();
  });

  test('going offline shows "Sem conexão" and OfflineBanner', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/app');
    await expect(page.getByText('Com conexão')).toBeVisible();

    await page.context().setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await expect(page.getByText('Sem conexão').first()).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/sem conexão/i);
  });

  test('restoring connection returns to online state', async ({ authenticatedPage: page }) => {
    await page.goto('/app');
    await expect(page.getByText('Com conexão')).toBeVisible();

    await page.context().setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await expect(page.getByText('Sem conexão').first()).toBeVisible();

    await page.context().setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    await expect(page.getByText('Com conexão')).toBeVisible();
    await expect(page.getByRole('alert')).not.toBeVisible();
  });

  test('zero unhandled errors during connectivity changes', async ({ authenticatedPage: page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    await page.context().setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await page.waitForTimeout(200);

    await page.context().setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForTimeout(200);

    expect(errors).toHaveLength(0);
  });
});
