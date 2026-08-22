import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index';

let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let sqlClient: postgres.Sql | null = null;

export function getDatabaseClient(connectionString?: string): PostgresJsDatabase<typeof schema> {
  if (dbInstance) {
    return dbInstance;
  }

  const url = connectionString || process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/jaago_hub';
  sqlClient = postgres(url, {
    max: parseInt(process.env['DATABASE_POOL_MAX'] || '10', 10),
    idle_timeout: 20,
    connect_timeout: 10,
  });

  dbInstance = drizzle(sqlClient, { schema });
  return dbInstance;
}

export async function closeDatabaseClient(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
    dbInstance = null;
  }
}
