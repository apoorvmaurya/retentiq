import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@retentiq/db';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const client = postgres(connectionString);

/** Drizzle ORM database instance with full schema. */
export const db = drizzle(client, { schema });
export const pgClient = client;
export { schema };
