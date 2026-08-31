import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. EMAIL SERVERS (SMTP Providers & Configuration)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const emailServers = pgTable(
  'email_servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: text('organization_id'),
    name: varchar('name', { length: 100 }).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    priority: integer('priority').default(1).notNull(), // Lower number = higher priority
    senderEmail: varchar('sender_email', { length: 255 }).notNull(),
    senderName: varchar('sender_name', { length: 150 }).notNull(),
    host: varchar('host', { length: 255 }).notNull(),
    port: integer('port').default(587).notNull(),
    encryption: varchar('encryption', { length: 20 }).default('starttls').notNull(), // 'starttls' | 'ssl_tls' | 'none'
    username: varchar('username', { length: 255 }).notNull(),
    passwordCiphertext: text('password_ciphertext').notNull(),
    passwordIv: varchar('password_iv', { length: 64 }).notNull(),
    passwordTag: varchar('password_tag', { length: 64 }).notNull(),
    passwordKeyId: varchar('password_key_id', { length: 50 }).default('v1').notNull(),
    minIntervalSeconds: integer('min_interval_seconds').default(0).notNull(),
    maxPerHour: integer('max_per_hour').default(0).notNull(), // 0 = unlimited
    maxPerDay: integer('max_per_day').default(0).notNull(), // 0 = unlimited
    replyTo: varchar('reply_to', { length: 255 }),
    healthState: varchar('health_state', { length: 20 }).default('healthy').notNull(), // 'healthy' | 'degraded' | 'down'
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastErrorMessage: text('last_error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (table) => [
    index('idx_email_servers_priority').on(table.priority, table.isEnabled),
    index('idx_email_servers_org').on(table.organizationId),
  ],
);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. EMAIL TEMPLATES (Variable Substitution & Pre-rendered Partials)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const emailTemplates = pgTable(
  'email_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: text('organization_id'),
    templateKey: varchar('template_key', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    module: varchar('module', { length: 50 }).default('general').notNull(),
    subject: text('subject').notNull(),
    bodyHtml: text('body_html').notNull(),
    bodyText: text('body_text').notNull(),
    variablesSchema: jsonb('variables_schema').default([]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (table) => [
    uniqueIndex('idx_email_templates_key').on(table.templateKey),
    index('idx_email_templates_module').on(table.module, table.isActive),
    index('idx_email_templates_org').on(table.organizationId),
  ],
);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. EMAIL LOGS (Single Canonical Log Row Per Attempt)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const emailLogs = pgTable(
  'email_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: text('organization_id'),
    templateKey: varchar('template_key', { length: 100 }),
    serverId: uuid('server_id').references(() => emailServers.id, { onDelete: 'set null' }),
    toAddress: text('to_address').notNull(),
    ccAddress: text('cc_address'),
    bccAddress: text('bcc_address'),
    fromAddress: varchar('from_address', { length: 255 }).notNull(),
    replyTo: varchar('reply_to', { length: 255 }),
    subjectRendered: text('subject_rendered').notNull(),
    bodyRendered: text('body_rendered'),
    variablesUsed: jsonb('variables_used'),
    module: varchar('module', { length: 50 }).default('general').notNull(),
    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    relatedEntityId: varchar('related_entity_id', { length: 100 }),
    status: varchar('status', { length: 20 }).default('queued').notNull(), // 'queued' | 'processing' | 'sent' | 'failed' | 'deferred' | 'bounced'
    errorReason: text('error_reason'),
    errorDetail: jsonb('error_detail'),
    attemptCount: integer('attempt_count').default(1).notNull(),
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    traceId: varchar('trace_id', { length: 100 }),
    queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow().notNull(),
    processingAt: timestamp('processing_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_email_logs_status_queued').on(table.status, table.queuedAt),
    index('idx_email_logs_module').on(table.module),
    index('idx_email_logs_recipient').on(table.toAddress),
    index('idx_email_logs_trace').on(table.traceId),
    index('idx_email_logs_entity').on(table.relatedEntityType, table.relatedEntityId),
    index('idx_email_logs_org').on(table.organizationId),
  ],
);

export type EmailServerRecord = typeof emailServers.$inferSelect;
export type NewEmailServerRecord = typeof emailServers.$inferInsert;
export type EmailTemplateRecord = typeof emailTemplates.$inferSelect;
export type NewEmailTemplateRecord = typeof emailTemplates.$inferInsert;
export type EmailLogRecord = typeof emailLogs.$inferSelect;
export type NewEmailLogRecord = typeof emailLogs.$inferInsert;
