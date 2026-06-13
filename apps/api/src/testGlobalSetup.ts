import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables before setup runs (Vitest globalSetup runs in its own process/context)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

export async function setup() {
  console.log('[Test Setup] Initializing test database...');
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

  console.log(`[Test Setup] Connecting to: ${connectionString.replace(/:([^@:]+)@/, ':****@')}`);

  // Use max: 1 connection to prevent concurrent migration locks
  const sql = postgres(connectionString, { max: 1 });

  try {
    // Check if the organizations table already exists to avoid policy recreation errors
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
      );
    `;
    const schemaExists = tableCheck[0]?.exists;

    if (schemaExists) {
      console.log('[Test Setup] Schema already exists, skipping migrations.');
    } else {
      console.log('[Test Setup] Initializing auth schema and uid mock...');
      await sql`CREATE SCHEMA IF NOT EXISTS auth;`;
      await sql`
        CREATE OR REPLACE FUNCTION auth.uid()
        RETURNS uuid
        LANGUAGE sql
        AS $$
          SELECT NULL::uuid;
        $$;
      `;

      const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
      console.log(`[Test Setup] Loading migrations from: ${migrationsDir}`);

      if (!fs.existsSync(migrationsDir)) {
        throw new Error(`Migrations directory not found at: ${migrationsDir}`);
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      console.log(`[Test Setup] Found ${files.length} migration files to apply.`);

      for (const file of files) {
        console.log(`[Test Setup] Applying migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Execute migration script
        await sql.unsafe(content);
      }
      console.log('[Test Setup] Migrations applied successfully.');
    }

    // Ensure at least one organization exists for developer auth fallback to succeed
    const existingOrgs = await sql`SELECT id FROM public.organizations LIMIT 1`;
    if (existingOrgs.length === 0) {
      console.log('[Test Setup] Seeding fallback organization...');
      await sql`
        INSERT INTO public.organizations (id, name, slug)
        VALUES ('fb4efd62-dcbe-41a9-b9de-ab5c79a0a313', 'Test Org', 'test-org')
        ON CONFLICT (slug) DO NOTHING
      `;
      console.log('[Test Setup] Fallback organization seeded.');
    } else {
      console.log('[Test Setup] Organization already exists, skipping seeding.');
    }
  } catch (error) {
    console.error('[Test Setup] Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}
