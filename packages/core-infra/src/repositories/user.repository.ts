import { eq, and } from 'drizzle-orm';
import { getDatabaseClient } from '../db/client';
import { users, User, NewUser } from '../schema/users';

export class UserRepository {
  private db = getDatabaseClient();

  async findById(id: string, organizationId?: string): Promise<User | undefined> {
    const conditions = organizationId
      ? and(eq(users.id, id), eq(users.organizationId, organizationId))
      : eq(users.id, id);

    const result = await this.db.select().from(users).where(conditions).limit(1);
    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return result[0];
  }

  async listByOrganization(organizationId: string, limit = 50, offset = 0): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .limit(limit)
      .offset(offset);
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db.insert(users).values({
      ...data,
      email: data.email.toLowerCase(),
    }).returning();
    return result[0]!;
  }

  async update(id: string, organizationId: string, data: Partial<NewUser>): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
      .returning();
    return result[0];
  }
}
