import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createPublicOrder, transitionOrderStatus } from './orderAdapter';

const orderId = '00000000-0000-0000-0000-000000000101';
const productId = '00000000-0000-0000-0000-000000000201';

function orderResult() {
  return {
    order_id: orderId,
    public_id: '00000000-0000-0000-0000-000000000102',
    order_number: 1,
    status: 'pending',
    subtotal_cents: 2590,
    discount_cents: 0,
    delivery_fee_cents: 0,
    total_cents: 2590,
    currency: 'BRL' as const,
  };
}

describe('orderAdapter', () => {
  it('sends checkout through the Edge Function with a stable idempotency key', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { order: orderResult() }, error: null });
    const client = { functions: { invoke } } as unknown as SupabaseClient;
    const input = {
      customer_name: 'Cliente Sintético',
      items: [{ product_id: productId, quantity: 2, notes: null }],
      modality: 'pickup' as const,
      notes: null,
      unit_slug: 'centro',
    };

    const result = await createPublicOrder(client, input, '00000000-0000-4000-8000-000000000301');

    expect(result.order_number).toBe(1);
    expect(invoke).toHaveBeenCalledWith('public-create-order', {
      body: input,
      headers: { 'Idempotency-Key': '00000000-0000-4000-8000-000000000301' },
    });
  });

  it('changes status only through the transactional RPC with optimistic version', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: orderId,
        organization_id: '00000000-0000-0000-0000-000000000001',
        unit_id: '00000000-0000-0000-0000-000000000002',
        public_id: '00000000-0000-0000-0000-000000000003',
        order_number: 1,
        business_date: '2026-08-08',
        channel: 'public_menu',
        modality: 'pickup',
        status: 'confirmed',
        notes: null,
        subtotal_cents: 2590,
        discount_cents: 0,
        delivery_fee_cents: 0,
        total_cents: 2590,
        currency: 'BRL',
        confirmed_at: '2026-08-08T00:00:00Z',
        ready_at: null,
        cancelled_at: null,
        created_at: '2026-08-08T00:00:00Z',
        updated_at: '2026-08-08T00:00:00Z',
        version: 2,
      },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;

    await transitionOrderStatus(client, orderId, 'confirmed', 1);

    expect(rpc).toHaveBeenCalledWith('transition_order_status', {
      p_expected_version: 1,
      p_order_id: orderId,
      p_to_status: 'confirmed',
    });
  });
});
