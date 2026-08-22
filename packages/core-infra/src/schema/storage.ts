import { pgTable, uuid, varchar, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const storageObjects = pgTable(
  'storage_objects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bucket: varchar('bucket', { length: 100 }).notNull(), // 'attachments', 'reports', 'exports', 'imports', 'backups'
    objectKey: varchar('object_key', { length: 500 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
    scanStatus: varchar('scan_status', { length: 50 }).default('pending').notNull(), // 'clean' | 'infected' | 'pending'
    isQuarantined: boolean('is_quarantined').default(false).notNull(),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_storage_org').on(table.organizationId),
    index('idx_storage_bucket_key').on(table.bucket, table.objectKey),
    index('idx_storage_scan_status').on(table.scanStatus),
  ],
);

export type StorageObject = typeof storageObjects.$inferSelect;
