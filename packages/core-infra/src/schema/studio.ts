import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const studioCustomFields = pgTable(
  'studio_custom_fields',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetEntity: varchar('target_entity', { length: 100 }).notNull(), // e.g. 'hr_employees', 'account_journal_entries'
    fieldKey: varchar('field_key', { length: 100 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    fieldType: varchar('field_type', { length: 50 }).notNull(), // 'text' | 'number' | 'boolean' | 'select' | 'date'
    optionsJson: jsonb('options_json').default([]), // For select dropdowns
    isRequired: boolean('is_required').default(false).notNull(),
    defaultValue: text('default_value'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_studio_target').on(table.targetEntity),
    index('idx_studio_org').on(table.organizationId),
  ],
);

export type StudioCustomField = typeof studioCustomFields.$inferSelect;
