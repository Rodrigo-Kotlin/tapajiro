import { expect } from '@playwright/test';
import { test } from './auth.fixture';
import AxeBuilder from '@axe-core/playwright';

test.describe('Login page - /login', () => {
  test('abre corretamente', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('título "Acesse o Tapajiro" visível', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: /acesse o tapajiro/i })).toBeVisible();
  });

  test('apenas um h1 na página', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('campos E-mail e Senha visíveis', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Senha' })).toBeVisible();
  });

  test('botão Entrar visível', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible();
  });

  test('senha começa oculta (type=password)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('textbox', { name: 'Senha' })).toHaveAttribute('type', 'password');
  });

  test('Mostrar senha altera o tipo do campo para text', async ({ page }) => {
    await page.goto('/login');
    const toggle = page.getByRole('button', { name: /mostrar senha/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('textbox', { name: 'Senha' })).toHaveAttribute('type', 'text');
  });

  test('Ocultar senha restaura type=password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /mostrar senha/i }).click();
    await expect(page.getByRole('textbox', { name: 'Senha' })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: /ocultar senha/i }).click();
    await expect(page.getByRole('textbox', { name: 'Senha' })).toHaveAttribute('type', 'password');
  });

  test('submissão vazia mostra validações', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /^entrar$/i }).click();
    await expect(page.getByText('Informe seu e-mail.')).toBeVisible();
    await expect(page.getByText('Informe sua senha.')).toBeVisible();
  });

  test('ordem de Tab é lógica', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Senha' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /mostrar senha/i })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeFocused();
  });

  test('foco é visível ao navegar por Tab', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').focus();
    const outline = await page.getByLabel('E-mail').evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outlineStyle || style.outline;
    });
    expect(outline).not.toBe('none');
  });

  test('zero overflow horizontal em 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/login');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('zero overflow horizontal em 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('zero overflow horizontal em 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/login');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('zero overflow horizontal em 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('zero violações axe-core na rota /login', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('zero erros não tratados no console', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('nenhuma requisição a host externo', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        hosts.add(url.hostname);
      }
    });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect([...hosts]).toEqual([]);
  });

  test('destino interno é restaurado depois do login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/login');
    await authenticatedPage.waitForURL('/app');
    await expect(authenticatedPage.getByRole('heading', { level: 1 })).toContainText(
      'Fundação do Tapajiro',
    );
  });
});
