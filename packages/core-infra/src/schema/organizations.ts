import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    logoUrl: text('logo_url'),
    timezone: varchar('timezone', { length: 50 }).default('Asia/Dhaka').notNull(),
    currency: varchar('currency', { length: 10 }).default('BDT').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_organizations_key').on(table.key),
    index('idx_organizations_code').on(table.code),
    index('idx_organizations_is_active').on(table.isActive),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
