import { z } from 'zod';

export const ModuleCategorySchema = z.enum([
  'core',
  'human_capital',
  'finance',
  'operations',
  'impact',
  'utilities',
]);

export type ModuleCategory = z.infer<typeof ModuleCategorySchema>;

export const NavigationItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  path: z.string(),
  order: z.number().default(100),
  parentKey: z.string().optional(),
  permission: z.string().optional(),
});

export type NavigationItem = z.infer<typeof NavigationItemSchema>;

export const PermissionContributionSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().default('general'),
});

export type PermissionContribution = z.infer<typeof PermissionContributionSchema>;

export const ModuleManifestSchema = z.object({
  key: z.string().regex(/^[a-z0-9_-]+$/, 'Module key must only contain lowercase alphanumeric, dash, or underscore'),
  name: z.string().min(1, 'Module name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow SemVer (e.g. 1.0.0)'),
  summary: z.string().min(1, 'Summary is required'),
  description: z.string().optional(),
  category: ModuleCategorySchema.default('operations'),
  author: z.string().default('JAAGO Foundation'),
  minCoreVersion: z.string().default('2.2.0'),
  depends: z.array(z.string()).default([]),
  permissions: z.array(PermissionContributionSchema).default([]),
  models: z.array(z.string()).default([]),
  events: z
    .object({
      produces: z.array(z.string()).default([]),
      consumes: z.array(z.string()).default([]),
    })
    .default({ produces: [], consumes: [] }),
  navigation: z.array(NavigationItemSchema).default([]),
  autoInstall: z.boolean().default(false),
  settingsSchema: z.record(z.unknown()).optional(),
});

export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;

export function validateModuleManifest(manifest: unknown): ModuleManifest {
  return ModuleManifestSchema.parse(manifest);
}
