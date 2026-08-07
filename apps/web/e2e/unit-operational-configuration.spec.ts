import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test } from './auth.fixture';

const organizationId = '00000000-0000-0000-0000-000000000101';
const unitId = '00000000-0000-0000-0000-000000000301';

async function mockOperationalConfiguration(page: Page, directWrites: string[] = []) {
  await page.route('**/rest/v1/unit_settings*', async (route) => {
    if (route.request().method() !== 'GET') {
      directWrites.push('unit_settings');
      await route.fulfill({ status: 405, body: 'direct writes are not allowed' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        unit_id: unitId,
        organization_id: organizationId,
        delivery_enabled: true,
        pickup_enabled: true,
        counter_enabled: false,
        accept_immediate_orders: true,
        delivery_minimum_cents: 2500,
        pickup_minimum_cents: 0,
        counter_minimum_cents: 500,
        operational_message: 'Mensagem de teste',
      }),
    });
  });
  await page.route('**/rest/v1/business_hours*', async (route) => {
    if (route.request().method() !== 'GET') {
      directWrites.push('business_hours');
      await route.fulfill({ status: 405, body: 'direct writes are not allowed' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '00000000-0000-0000-0000-000000000401',
          organization_id: organizationId,
          unit_id: unitId,
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

async function mockOperationalRpcs(page: Page, calls: string[]) {
  await page.route('**/rest/v1/rpc/*', async (route) => {
    calls.push(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test.describe('Configuração operacional da unidade', () => {
  test('edita settings e horários no desktop apenas pelas RPCs', async ({
    authenticatedPage: page,
  }) => {
    const rpcCalls: string[] = [];
    const directWrites: string[] = [];
    await mockOperationalConfiguration(page, directWrites);
    await mockOperationalRpcs(page, rpcCalls);
    await page.goto('/app/organizacao/configuracao');

    await expect(page.getByRole('heading', { name: 'Configuração operacional' })).toBeVisible();
    await expect(page.getByLabel('Mínimo para delivery')).toHaveValue('25.00');
    await page.getByRole('button', { name: 'Adicionar faixa' }).nth(1).click();
    await page.getByLabel('Aceitar retirada no balcão').check();
    await page.getByRole('button', { name: 'Salvar configuração' }).click();

    await expect(page.getByRole('status')).toContainText('Configuração operacional salva.');
    expect(rpcCalls).toEqual([
      'set_unit_operational_status',
      'update_unit_operational_settings',
      'replace_business_hours',
    ]);
    expect(directWrites).toEqual([]);
  });

  test('funciona em viewport mobile e mantém labels acessíveis', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await mockOperationalConfiguration(page);
    await page.goto('/app/organizacao/configuracao');

    await expect(page.getByRole('heading', { name: 'Configuração operacional' })).toBeVisible();
    await expect(page.getByLabel('Status da unidade')).toBeVisible();
    await expect(page.getByLabel('Mensagem exibida para a operação')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar configuração' })).toBeVisible();
  });

  test('não possui violações básicas de acessibilidade', async ({ authenticatedPage: page }) => {
    await mockOperationalConfiguration(page);
    await page.goto('/app/organizacao/configuracao');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
