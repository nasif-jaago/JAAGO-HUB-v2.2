import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

// ── GLOBAL PLATFORM MODULES CATALOG ──
export const platformModules = pgTable(
  'platform_modules',
  {
    key: varchar('key', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    summary: text('summary').notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).default('operations').notNull(), // core, human_capital, finance, operations, impact
    author: varchar('author', { length: 255 }).default('JAAGO Foundation').notNull(),
    minCoreVersion: varchar('min_core_version', { length: 50 }).default('2.2.0').notNull(),
    autoInstall: boolean('auto_install').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_platform_modules_category').on(table.category),
  ],
);

// ── PLATFORM MODULE DEPENDENCIES ──
export const platformModuleDependencies = pgTable(
  'platform_module_dependencies',
  {
    moduleKey: varchar('module_key', { length: 50 })
      .notNull()
      .references(() => platformModules.key, { onDelete: 'cascade' }),
    dependsOnKey: varchar('depends_on_key', { length: 50 })
      .notNull()
      .references(() => platformModules.key, { onDelete: 'cascade' }),
    minVersion: varchar('min_version', { length: 50 }),
  },
  (table) => [
    primaryKey({ columns: [table.moduleKey, table.dependsOnKey] }),
    index('idx_mod_deps_module').on(table.moduleKey),
    index('idx_mod_deps_depends_on').on(table.dependsOnKey),
  ],
);

// ── PER-TENANT INSTALLED MODULES ──
export const installedModules = pgTable(
  'installed_modules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    moduleKey: varchar('module_key', { length: 50 })
      .notNull()
      .references(() => platformModules.key, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).default('active').notNull(), // installed, active, disabled, upgrading, uninstalling
    settings: jsonb('settings').default({}).notNull(),
    installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_installed_modules_org').on(table.organizationId),
    index('idx_installed_modules_key').on(table.moduleKey),
    index('idx_installed_modules_status').on(table.status),
  ],
);

// ── PER-TENANT MODULE MIGRATIONS ──
export const platformModuleMigrations = pgTable(
  'platform_module_migrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    moduleKey: varchar('module_key', { length: 50 })
      .notNull()
      .references(() => platformModules.key, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(),
    migrationName: varchar('migration_name', { length: 255 }).notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    executionTimeMs: integer('execution_time_ms').default(0).notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mod_migrations_org_mod').on(table.organizationId, table.moduleKey),
  ],
);

export type PlatformModule = typeof platformModules.$inferSelect;
export type NewPlatformModule = typeof platformModules.$inferInsert;
export type InstalledModule = typeof installedModules.$inferSelect;
export type NewInstalledModule = typeof installedModules.$inferInsert;
export type ModuleMigration = typeof platformModuleMigrations.$inferSelect;
