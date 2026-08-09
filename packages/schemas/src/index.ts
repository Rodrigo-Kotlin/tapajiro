import { z } from 'zod';

const organizationNameSchema = z
  .string()
  .trim()
  .min(2, 'Informe o nome da organização.')
  .max(120, 'Use até 120 caracteres.');

const unitNameSchema = z
  .string()
  .trim()
  .min(2, 'Informe o nome da unidade.')
  .max(120, 'Use até 120 caracteres.');

const unitSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Use pelo menos 3 caracteres no slug.')
  .max(80, 'Use até 80 caracteres no slug.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens.');

export const firstOrganizationBootstrapSchema = z.object({
  organizationName: organizationNameSchema,
  unitName: unitNameSchema,
  unitSlug: unitSlugSchema,
});

export type FirstOrganizationBootstrapInput = z.infer<typeof firstOrganizationBootstrapSchema>;

export const firstOrganizationBootstrapResultSchema = z.object({
  organization_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  unit_slug: z.string().min(1),
  organization_status: z.string().min(1),
});

export type FirstOrganizationBootstrapResult = z.infer<
  typeof firstOrganizationBootstrapResultSchema
>;

export const organizationContextMembershipSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  status: z.literal('active'),
  all_units: z.boolean(),
});

export const organizationContextOrganizationSchema = z.object({
  id: z.string().uuid(),
  trade_name: z.string().min(1),
  status: z.string().min(1),
});

export const organizationContextUnitSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: z.string().min(1),
});

export const organizationContextMembershipUnitSchema = z.object({
  membership_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  unit_id: z.string().uuid(),
});

export type OrganizationContextMembership = z.infer<typeof organizationContextMembershipSchema>;
export type OrganizationContextOrganization = z.infer<typeof organizationContextOrganizationSchema>;
export type OrganizationContextUnit = z.infer<typeof organizationContextUnitSchema>;

export const publicOrderItemInputSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().trim().max(500).nullable().default(null),
});

export const publicOrderCheckoutSchema = z.object({
  unit_slug: z.string().trim().min(3).max(80),
  customer_name: z.string().trim().min(2).max(120),
  modality: z.enum(['delivery', 'pickup', 'counter']),
  notes: z.string().trim().max(1000).nullable().default(null),
  items: z.array(publicOrderItemInputSchema).min(1),
});

export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'cancelled',
]);

export const orderSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  public_id: z.string().uuid(),
  order_number: z.number().int().positive(),
  business_date: z.string(),
  channel: z.literal('public_menu'),
  modality: z.enum(['delivery', 'pickup', 'counter']),
  status: orderStatusSchema,
  notes: z.string().nullable(),
  subtotal_cents: z.number().int().nonnegative(),
  discount_cents: z.number().int().nonnegative(),
  delivery_fee_cents: z.number().int().nonnegative(),
  total_cents: z.number().int().nonnegative(),
  currency: z.literal('BRL'),
  confirmed_at: z.string().nullable(),
  ready_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number().int().positive(),
});

export const orderCustomerSnapshotSchema = z.object({
  order_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  customer_name_snapshot: z.string().min(2),
});

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  order_id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  category_name_snapshot: z.string().min(1),
  product_name_snapshot: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().nonnegative(),
  line_total_cents: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  position: z.number().int().nonnegative(),
});

export type PublicOrderItemInput = z.infer<typeof publicOrderItemInputSchema>;
export type PublicOrderCheckout = z.infer<typeof publicOrderCheckoutSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderCustomerSnapshot = z.infer<typeof orderCustomerSnapshotSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
