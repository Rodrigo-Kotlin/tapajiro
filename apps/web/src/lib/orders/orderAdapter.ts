import type { SupabaseClient } from '@supabase/supabase-js';
import {
  orderCustomerSnapshotSchema,
  orderItemSchema,
  orderSchema,
  publicOrderCheckoutSchema,
  type Order,
  type OrderCustomerSnapshot,
  type OrderItem,
  type PublicOrderCheckout,
} from '@tapajiro/schemas';
import { z } from 'zod';

const checkoutResponseSchema = z.object({
  order: z.object({
    order_id: z.string().uuid(),
    public_id: z.string().uuid(),
    order_number: z.number().int().positive(),
    status: z.string(),
    subtotal_cents: z.number().int().nonnegative(),
    discount_cents: z.number().int().nonnegative(),
    delivery_fee_cents: z.number().int().nonnegative(),
    total_cents: z.number().int().nonnegative(),
    currency: z.literal('BRL'),
  }),
});

export type OrderErrorKind = 'offline' | 'conflict' | 'permission' | 'unknown';

export class OrderError extends Error {
  constructor(
    public readonly kind: OrderErrorKind,
    message = 'Não foi possível concluir a operação do pedido.',
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

export interface OrderDetail {
  order: Order;
  customer: OrderCustomerSnapshot | null;
  items: OrderItem[];
}

function classifyError(error: unknown): OrderError {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? error.code : undefined;
    if (code === '42501' || code === 'PGRST301' || code === '403') {
      return new OrderError('permission', 'Você não tem permissão para acessar este pedido.');
    }
    if (code === '40001' || code === '409') {
      return new OrderError('conflict', 'O pedido foi alterado. Atualize e tente novamente.');
    }
  }
  return new OrderError('unknown');
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new OrderError('unknown');
  return result.data;
}

export async function createPublicOrder(
  client: SupabaseClient,
  input: PublicOrderCheckout,
  idempotencyKey = crypto.randomUUID(),
): Promise<z.infer<typeof checkoutResponseSchema>['order']> {
  const payload = parse(publicOrderCheckoutSchema, input);
  const { data, error } = await client.functions.invoke('public-create-order', {
    body: payload,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  if (error) throw classifyError(error);
  return parse(checkoutResponseSchema, data).order;
}

export async function loadOrders(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  status?: string,
): Promise<Order[]> {
  let query = client
    .from('orders')
    .select(
      'id, organization_id, unit_id, public_id, order_number, business_date, channel, modality, status, notes, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, currency, confirmed_at, ready_at, cancelled_at, created_at, updated_at, version',
    )
    .eq('organization_id', organizationId)
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw classifyError(error);
  return parse(z.array(orderSchema), data ?? []);
}

export async function loadOrderDetail(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  orderId: string,
): Promise<OrderDetail> {
  const [orderResult, customerResult, itemsResult] = await Promise.all([
    client
      .from('orders')
      .select(
        'id, organization_id, unit_id, public_id, order_number, business_date, channel, modality, status, notes, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, currency, confirmed_at, ready_at, cancelled_at, created_at, updated_at, version',
      )
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .eq('id', orderId)
      .single(),
    client
      .from('order_customers')
      .select('order_id, organization_id, unit_id, customer_name_snapshot')
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .eq('order_id', orderId)
      .maybeSingle(),
    client
      .from('order_items')
      .select(
        'id, organization_id, unit_id, order_id, product_id, category_name_snapshot, product_name_snapshot, quantity, unit_price_cents, line_total_cents, notes, position',
      )
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .eq('order_id', orderId)
      .order('position', { ascending: true }),
  ]);
  if (orderResult.error || customerResult.error || itemsResult.error) {
    throw classifyError(orderResult.error ?? customerResult.error ?? itemsResult.error);
  }
  return {
    order: parse(orderSchema, orderResult.data),
    customer: customerResult.data ? parse(orderCustomerSnapshotSchema, customerResult.data) : null,
    items: parse(z.array(orderItemSchema), itemsResult.data ?? []),
  };
}

export async function transitionOrderStatus(
  client: SupabaseClient,
  orderId: string,
  toStatus: 'confirmed' | 'preparing' | 'ready' | 'cancelled',
  expectedVersion: number,
): Promise<Order> {
  const { data, error } = await client.rpc('transition_order_status', {
    p_expected_version: expectedVersion,
    p_order_id: orderId,
    p_to_status: toStatus,
  });
  if (error) throw classifyError(error);
  return parse(orderSchema, data);
}
