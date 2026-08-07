import { expect } from '@playwright/test';
import { test } from './auth.fixture';

test.describe('Onboarding inicial', () => {
  test('cria organização e unidade com a RPC mockada', async ({ authenticatedPage: page }) => {
    await page.route('**/rest/v1/rpc/create_first_organization', async (route) => {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            organization_id: '00000000-0000-0000-0000-000000000101',
            unit_id: '00000000-0000-0000-0000-000000000102',
            unit_slug: 'centro-tapajos',
            organization_status: 'trial',
          },
        ]),
      });
    });

    await page.goto('/app/onboarding');
    await page.getByLabel('Nome da organização').fill('Restaurante Tapajós');
    await page.getByLabel('Nome da primeira unidade').fill('Centro');
    await page.getByLabel('Slug da unidade').fill('centro-tapajos');
    await page.getByRole('button', { name: 'Criar organização' }).click();

    await expect(page.getByRole('status')).toContainText('Organização criada');
    await expect(page.getByText('Restaurante Tapajós')).toBeVisible();
    await expect(page.getByText('centro-tapajos')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ir para o painel' })).toBeVisible();
  });
});
