import { RlsSessionContext } from '@jaago/core-infra';

export interface BaseTenantRow {
  id: string;
  organizationId: string;
  [key: string]: unknown;
}

export class MockRlsDatabase<T extends BaseTenantRow> {
  private rows: T[] = [];
  private sessionContext: RlsSessionContext | null = null;

  setSession(context: RlsSessionContext | null): void {
    this.sessionContext = context;
  }

  seed(data: T[]): void {
    this.rows = [...data];
  }

  // Simulates: SELECT * FROM table WHERE RLS_POLICY_HOLDS
  select(): T[] {
    if (!this.sessionContext) {
      // Without session context, RLS defaults to denying all rows
      return [];
    }

    if (this.sessionContext.isSuperAdmin) {
      return [...this.rows];
    }

    return this.rows.filter((row) => row.organizationId === this.sessionContext?.organizationId);
  }

  // Simulates: INSERT INTO table VALUES (...) WITH CHECK (RLS_POLICY)
  insert(row: T): { success: boolean; error?: string } {
    if (!this.sessionContext) {
      return { success: false, error: 'RLS: No active tenant session context' };
    }

    if (!this.sessionContext.isSuperAdmin && row.organizationId !== this.sessionContext.organizationId) {
      return { success: false, error: 'RLS Security Violation: Cannot insert record into another tenant' };
    }

    this.rows.push(row);
    return { success: true };
  }

  // Simulates: UPDATE table SET ... WHERE id = ... AND (RLS_POLICY)
  update(id: string, updates: Partial<T>): { success: boolean; count: number; error?: string } {
    if (!this.sessionContext) {
      return { success: false, count: 0, error: 'RLS: No active tenant session context' };
    }

    const visibleRows = this.select();
    const target = visibleRows.find((r) => r.id === id);

    if (!target) {
      return { success: true, count: 0 }; // 0 rows updated because row belongs to another tenant or doesn't exist
    }

    // Block cross-tenant re-assignment
    if (updates.organizationId && updates.organizationId !== this.sessionContext.organizationId && !this.sessionContext.isSuperAdmin) {
      return { success: false, count: 0, error: 'RLS Security Violation: Cannot reassign tenant ownership' };
    }

    Object.assign(target, updates);
    return { success: true, count: 1 };
  }
}
