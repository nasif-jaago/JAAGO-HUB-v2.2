import { eq } from 'drizzle-orm';
import { getDatabaseClient } from '../db/client';
import { organizations, Organization, NewOrganization } from '../schema/organizations';

export class OrganizationRepository {
  private db = getDatabaseClient();

  async findById(id: string): Promise<Organization | undefined> {
    const result = await this.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return result[0];
  }

  async findByKey(key: string): Promise<Organization | undefined> {
    const result = await this.db.select().from(organizations).where(eq(organizations.key, key)).limit(1);
    return result[0];
  }

  async listAll(): Promise<Organization[]> {
    return this.db.select().from(organizations);
  }

  async create(data: NewOrganization): Promise<Organization> {
    const result = await this.db.insert(organizations).values(data).returning();
    return result[0]!;
  }
}
