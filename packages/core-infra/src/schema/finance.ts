import { pgTable, uuid, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const accountChartOfAccounts = pgTable(
  'account_chart_of_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountCode: varchar('account_code', { length: 50 }).notNull().unique(), // e.g. 1010 (Cash), 5010 (Operating Expense)
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
    balanceBdt: integer('balance_bdt').default(0).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_coa_org').on(table.organizationId),
    index('idx_coa_code').on(table.accountCode),
  ],
);

export const accountJournalEntries = pgTable(
  'account_journal_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entryNumber: varchar('entry_number', { length: 50 }).notNull().unique(), // e.g. JE-2026-001
    date: varchar('date', { length: 10 }).notNull(),
    memo: text('memo').notNull(),
    totalAmountBdt: integer('total_amount_bdt').notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(), // 'draft' | 'posted' | 'cancelled'
    hashSha256: varchar('hash_sha256', { length: 64 }).notNull(), // Tamper-evident financial hash
    postedBy: uuid('posted_by').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_je_org').on(table.organizationId),
    index('idx_je_number').on(table.entryNumber),
  ],
);

export const accountJournalLines = pgTable(
  'account_journal_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    journalEntryId: uuid('journal_entry_id').references(() => accountJournalEntries.id, { onDelete: 'cascade' }).notNull(),
    accountId: uuid('account_id').references(() => accountChartOfAccounts.id, { onDelete: 'restrict' }).notNull(),
    description: varchar('description', { length: 255 }),
    debitBdt: integer('debit_bdt').default(0).notNull(),
    creditBdt: integer('credit_bdt').default(0).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_jl_entry').on(table.journalEntryId),
    index('idx_jl_account').on(table.accountId),
  ],
);

export type AccountChartOfAccount = typeof accountChartOfAccounts.$inferSelect;
export type AccountJournalEntry = typeof accountJournalEntries.$inferSelect;
export type AccountJournalLine = typeof accountJournalLines.$inferSelect;
