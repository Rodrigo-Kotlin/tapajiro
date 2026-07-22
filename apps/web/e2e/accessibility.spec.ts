import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade - Rota /', () => {
  test('não deve ter violações de acessibilidade', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Acessibilidade - Rota /app', () => {
  test('não deve ter violações de acessibilidade', async ({ page }) => {
    await page.goto('/app');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
