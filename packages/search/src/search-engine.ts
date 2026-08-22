import { UserSession } from '@jaago/auth';
import { evaluatePermission } from '@jaago/authz';

export interface SearchDocument {
  id: string;
  entityType: 'user' | 'workflow' | 'module' | 'report' | 'announcement';
  title: string;
  subtitle?: string | undefined;
  snippet: string;
  url: string;
  organizationId: string;
  requiredPermission?: string | undefined;
}

export interface SearchResultItem extends SearchDocument {
  score: number;
}

export class PermissionAwareSearchEngine {
  private documents: SearchDocument[] = [];

  public indexDocument(doc: SearchDocument): void {
    const existingIdx = this.documents.findIndex((d) => d.id === doc.id && d.entityType === doc.entityType);
    if (existingIdx >= 0) {
      this.documents[existingIdx] = doc;
    } else {
      this.documents.push(doc);
    }
  }

  public indexDocuments(docs: SearchDocument[]): void {
    docs.forEach((d) => this.indexDocument(d));
  }

  public search(query: string, session: UserSession): SearchResultItem[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const queryTokens = trimmed.split(/\s+/);

    return this.documents
      .filter((doc) => {
        // 1. Strict Tenant Isolation (unless super admin)
        if (!session.isSuperAdmin && doc.organizationId !== session.organizationId) {
          return false;
        }

        // 2. RBAC Permission Filtering
        if (doc.requiredPermission) {
          const authorized = evaluatePermission(
            {
              userId: session.userId,
              organizationId: session.organizationId,
              roles: session.roles,
              permissions: session.permissions,
              isSuperAdmin: session.isSuperAdmin,
            },
            {
              permission: doc.requiredPermission,
              organizationId: doc.organizationId,
            },
          );
          if (!authorized) return false;
        }

        return true;
      })
      .map((doc) => {
        // 3. Relevance Scoring
        let score = 0;
        const titleLower = doc.title.toLowerCase();
        const subtitleLower = (doc.subtitle || '').toLowerCase();
        const snippetLower = doc.snippet.toLowerCase();

        for (const token of queryTokens) {
          if (titleLower.includes(token)) score += 10;
          if (subtitleLower.includes(token)) score += 5;
          if (snippetLower.includes(token)) score += 2;
        }

        return { ...doc, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  public clear(): void {
    this.documents = [];
  }
}

export const globalSearchEngine = new PermissionAwareSearchEngine();
