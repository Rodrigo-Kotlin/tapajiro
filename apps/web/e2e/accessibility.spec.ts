import { expect } from '@playwright/test';
import { test } from './auth.fixture';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade - Rota /', () => {
  test('não deve ter violações de acessibilidade', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Acessibilidade - Rota /app', () => {
  test('não deve ter violações de acessibilidade', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/app');
    const results = await new AxeBuilder({ page: authenticatedPage }).analyze();
    expect(results.violations).toEqual([]);
  });
});
