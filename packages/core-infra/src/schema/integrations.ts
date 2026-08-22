import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const integrationConnectors = pgTable(
  'integration_connectors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 100 }).notNull(), // 'bkash', 'nagad', 'sms_gateway', 'gdrive', 'mcp_server'
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('active').notNull(), // 'active' | 'degraded' | 'disabled'
    circuitBreakerState: varchar('circuit_breaker_state', { length: 20 }).default('CLOSED').notNull(), // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    config: jsonb('config').default({}),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    lastHealthyAt: timestamp('last_healthy_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_connectors_org').on(table.organizationId),
    index('idx_connectors_type').on(table.type),
  ],
);

export const integrationSecrets = pgTable(
  'integration_secrets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    connectorId: uuid('connector_id').references(() => integrationConnectors.id, { onDelete: 'cascade' }),
    secretKey: varchar('secret_key', { length: 100 }).notNull(), // e.g. 'API_KEY', 'MERCHANT_SECRET'
    encryptedValue: text('encrypted_value').notNull(), // AES-256-GCM ciphertext
    ivHex: varchar('iv_hex', { length: 32 }).notNull(), // 12-byte IV hex (24 chars)
    authTagHex: varchar('auth_tag_hex', { length: 32 }).notNull(), // 16-byte Auth Tag hex (32 chars)
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_secrets_connector').on(table.connectorId),
  ],
);

export type IntegrationConnector = typeof integrationConnectors.$inferSelect;
export type IntegrationSecret = typeof integrationSecrets.$inferSelect;
