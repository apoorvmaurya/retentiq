import postgres from 'postgres';

const connectionString = 'postgresql://postgres:postgres@db.hcbihthxmzgivzyjpnzo.supabase.co:6543/postgres';
console.log("Attempting to connect to:", connectionString);

const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

try {
  const res = await sql`SELECT 1`;
  console.log("SUCCESS! Connected to remote database.", res);
} catch (e) {
  console.error("FAILED to connect:", e);
} finally {
  await sql.end();
}
process.exit(0);
