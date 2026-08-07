import { expect } from '@playwright/test';
import { test } from './auth.fixture';

const secondUnit = {
  id: '00000000-0000-0000-0000-000000000302',
  organization_id: '00000000-0000-0000-0000-000000000101',
  name: 'Aldeia',
  slug: 'aldeia',
  status: 'active',
};

test.describe('Contexto de organização e unidade', () => {
  test('exibe contexto no header e permite seleção de unidade', async ({
    authenticatedPage: page,
  }) => {
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
          secondUnit,
        ]),
      });
    });

    await page.goto('/app');
    await expect(page.getByTestId('organization-context')).toContainText('Restaurante Tapajós');
    await expect(page.getByLabel('Unidade ativa')).toHaveValue(
      '00000000-0000-0000-0000-000000000301',
    );
    await page.getByLabel('Unidade ativa').selectOption(secondUnit.id);
    await expect(page.getByLabel('Unidade ativa')).toHaveValue(secondUnit.id);
  });

  test('abre a tela de consulta do contexto', async ({ authenticatedPage: page }) => {
    await page.goto('/app/organizacao');
    await expect(page.getByRole('heading', { name: 'Organização e unidade' })).toBeVisible();
    await expect(
      page.getByLabel('Dados da organização').getByText('Restaurante Tapajós'),
    ).toBeVisible();
    await expect(
      page.getByLabel('Dados da organização').getByText('Centro', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('trial')).toBeVisible();
  });

  test('redireciona usuário sem membership para onboarding', async ({
    authenticatedPage: page,
  }) => {
    await page.route('**/rest/v1/memberships*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/app');
    await expect(page).toHaveURL(/\/app\/onboarding$/);
    await expect(page.getByRole('heading', { name: 'Crie seu espaço de trabalho' })).toBeVisible();
  });
});
