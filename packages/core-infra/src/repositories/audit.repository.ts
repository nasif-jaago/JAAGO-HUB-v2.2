import { eq, desc } from 'drizzle-orm';
import { getDatabaseClient } from '../db/client';
import { auditLogs, AuditLog, NewAuditLog } from '../schema/audit';
import { computeAuditHash, GENESIS_AUDIT_HASH } from '../db/audit-hasher';

export interface CreateAuditLogParams {
  organizationId: string;
  userId?: string | null | undefined;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  traceId: string;
}

export class AuditRepository {
  private db = getDatabaseClient();

  async append(params: CreateAuditLogParams): Promise<AuditLog> {
    // 1. Fetch latest record to get previousHash
    const latest = await this.db
      .select({ currentHash: auditLogs.currentHash })
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, params.organizationId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(1);

    const previousHash = latest[0]?.currentHash || GENESIS_AUDIT_HASH;
    const timestamp = new Date();

    // 2. Compute current record hash
    const currentHash = computeAuditHash({
      previousHash,
      timestamp,
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      newState: params.newState,
    });

    // 3. Insert audit entry
    const newEntry: NewAuditLog = {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousState: params.previousState,
      newState: params.newState,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      traceId: params.traceId,
      timestamp,
      previousHash,
      currentHash,
    };

    const inserted = await this.db.insert(auditLogs).values(newEntry).returning();
    return inserted[0]!;
  }

  async verifyAuditIntegrity(organizationId: string): Promise<{ valid: boolean; compromisedIndex?: number }> {
    const logs = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(auditLogs.timestamp);

    let expectedPrevHash = GENESIS_AUDIT_HASH;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]!;

      if (log.previousHash !== expectedPrevHash) {
        return { valid: false, compromisedIndex: i };
      }

      const calculated = computeAuditHash({
        previousHash: log.previousHash,
        timestamp: log.timestamp,
        organizationId: log.organizationId,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        newState: log.newState,
      });

      if (calculated !== log.currentHash) {
        return { valid: false, compromisedIndex: i };
      }

      expectedPrevHash = log.currentHash;
    }

    return { valid: true };
  }
}
