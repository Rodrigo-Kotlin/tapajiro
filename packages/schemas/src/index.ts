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
