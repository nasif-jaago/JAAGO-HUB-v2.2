import { createHash } from 'node:crypto';

export interface AuditRecordToHash {
  previousHash: string;
  timestamp: string | Date;
  organizationId: string;
  userId?: string | null | undefined;
  action: string;
  entityType: string;
  entityId: string;
  newState?: unknown;
}

export function computeAuditHash(record: AuditRecordToHash): string {
  const ts = record.timestamp instanceof Date ? record.timestamp.toISOString() : record.timestamp;
  const stateStr = record.newState !== undefined ? JSON.stringify(record.newState) : '';
  const rawString = `${record.previousHash}|${ts}|${record.organizationId}|${record.userId || ''}|${record.action}|${record.entityType}|${record.entityId}|${stateStr}`;

  return createHash('sha256').update(rawString).digest('hex');
}

export const GENESIS_AUDIT_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
