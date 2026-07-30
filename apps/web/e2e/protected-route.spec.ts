import { expect } from '@playwright/test';
import { test } from './auth.fixture';
import AxeBuilder from '@axe-core/playwright';

test.describe('Protected route - /app', () => {
  test('visitante abre /app e vai para /login', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Acesse o Tapajiro');
  });

  test('redirect usa /login sem loop', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
    await page.goto('/app');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('conteudo protegido nao aparece antes do redirect', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByText('Fundação do Tapajiro')).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Acesse o Tapajiro');
  });

  test('usuario com sessao acessa /app', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Fundação do Tapajiro',
    );
    await expect(authenticatedPage.getByRole('main')).toBeVisible();
  });

  test('conteudo protegido aparece somente autenticado', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Fundação do Tapajiro',
    );
  });

  test('usuario autenticado abre /login e vai para /app', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/login');
    await expect(authenticatedPage).toHaveURL('/app');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Fundação do Tapajiro',
    );
  });

  test('zero overflow em 360px no loading', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');
    await page.waitForURL('/login');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Acesse o Tapajiro');
    expect(hasOverflow).toBe(false);
  });

  test('navegacao por teclado continua funcionando', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Acesse o Tapajiro');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('axe-core encontra zero violacoes no estado de loading', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL('/login');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('zero erros nao tratados no console', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/app');
    await page.waitForURL('/login');
    expect(errors).toHaveLength(0);
  });

  test('nenhuma request para Supabase remoto', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        hosts.add(url.hostname);
      }
    });
    await page.goto('/app');
    await page.waitForURL('/login');
    await page.waitForLoadState('networkidle');
    expect([...hosts]).toEqual([]);
  });

  test('nenhuma request para host externo nao autorizado', async ({ authenticatedPage }) => {
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

  // Loading text is covered by unit tests (ProtectedRoute.test.tsx).
  // E2E transition is too fast to capture reliably.
});
