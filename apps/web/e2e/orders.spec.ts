import { expect } from '@playwright/test';
import { test } from './auth.fixture';

const productId = '00000000-0000-0000-0000-000000000501';
const orderId = '00000000-0000-0000-0000-000000000601';

function order(status = 'pending', version = 1) {
  return {
    id: orderId,
    organization_id: '00000000-0000-0000-0000-000000000101',
    unit_id: '00000000-0000-0000-0000-000000000301',
    public_id: '00000000-0000-0000-0000-000000000602',
    order_number: 1,
    business_date: '2026-08-08',
    channel: 'public_menu',
    modality: 'pickup',
    status,
    notes: null,
    subtotal_cents: 2590,
    discount_cents: 0,
    delivery_fee_cents: 0,
    total_cents: 2590,
    currency: 'BRL',
    confirmed_at: status === 'confirmed' ? '2026-08-08T00:00:00Z' : null,
    ready_at: null,
    cancelled_at: null,
    created_at: '2026-08-08T00:00:00Z',
    updated_at: '2026-08-08T00:00:00Z',
    version,
  };
}

test.describe('public order checkout', () => {
  test('adds an item and submits checkout through the function', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_public_ordering_menu_by_slug*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            product_id: productId,
            category_id: '00000000-0000-0000-0000-000000000502',
            category_name: 'Lanches',
            category_position: 0,
            product_name: 'X Tapajós',
            product_description: 'Sintético',
            price_cents: 2590,
            available: true,
            product_position: 0,
          },
        ]),
      });
    });
    await page.route('**/functions/v1/public-create-order', async (route) => {
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          order: {
            order_id: orderId,
            public_id: '00000000-0000-0000-0000-000000000602',
            order_number: 1,
            status: 'pending',
            subtotal_cents: 2590,
            discount_cents: 0,
            delivery_fee_cents: 0,
            total_cents: 2590,
            currency: 'BRL',
          },
        }),
      });
    });

    await page.goto('/menu/centro');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await page.getByRole('button', { name: 'Continuar para checkout' }).click();
    await page.getByLabel('Seu nome').fill('Cliente Sintético');
    await page.getByRole('button', { name: 'Enviar pedido' }).click();
    await expect(page.getByRole('status')).toContainText('Pedido #1 enviado');
  });
});

test.describe('orders panel', () => {
  test('lists an order and changes state through the RPC', async ({ authenticatedPage: page }) => {
    let currentOrder = order();
    await page.route('**/rest/v1/orders*', async (route) => {
      const single = route.request().headers().accept?.includes('application/vnd.pgrst.object');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(single ? currentOrder : [currentOrder]),
      });
    });
    await page.route('**/rest/v1/order_customers*', async (route) => {
      const customer = {
        order_id: orderId,
        organization_id: '00000000-0000-0000-0000-000000000101',
        unit_id: '00000000-0000-0000-0000-000000000301',
        customer_name_snapshot: 'Cliente Sintético',
      };
      const single = route.request().headers().accept?.includes('application/vnd.pgrst.object');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(single ? customer : [customer]),
      });
    });
    await page.route('**/rest/v1/order_items*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '00000000-0000-0000-0000-000000000603',
            organization_id: '00000000-0000-0000-0000-000000000101',
            unit_id: '00000000-0000-0000-0000-000000000301',
            order_id: orderId,
            product_id: productId,
            category_name_snapshot: 'Lanches',
            product_name_snapshot: 'X Tapajós',
            quantity: 1,
            unit_price_cents: 2590,
            line_total_cents: 2590,
            notes: null,
            position: 0,
          },
        ]),
      });
    });
    await page.route('**/rest/v1/rpc/transition_order_status*', async (route) => {
      currentOrder = order('confirmed', 2);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentOrder),
      });
    });

    await page.goto('/app/pedidos');
    await expect(page.getByRole('button', { name: /Pedido #1/ })).toBeVisible();
    await page.getByRole('button', { name: /Pedido #1/ }).click();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByLabel('Detalhe do pedido').getByText('Confirmado')).toBeVisible();
  });
});
