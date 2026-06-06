import postgres from 'postgres';

async function testPort(port) {
  const connectionString = `postgresql://postgres:postgres@localhost:${port}/postgres`;
  console.log(`Attempting to connect to localhost:${port}...`);
  const sql = postgres(connectionString, { connect_timeout: 3 });
  try {
    const res = await sql`SELECT 1`;
    console.log(`SUCCESS! Connected to localhost:${port}`, res);
    return true;
  } catch (e) {
    console.error(`FAILED to connect to localhost:${port}:`, e.message);
    return false;
  } finally {
    await sql.end();
  }
}

await testPort(5432);
await testPort(54322);
process.exit(0);
