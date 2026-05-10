import 'server-only';
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

/**
 * Postgres-pool, delad mellan serverless-anrop på samma instans.
 * `globalThis`-trick krävs för att hot-reload i dev inte ska skapa
 * en ny pool för varje fil-edit.
 *
 * I prod på Vercel: använd Supabase **Transaction Pooler** (port 6543)
 * eftersom serverless-funktioner inte kan hålla långa connections.
 */
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new Pool({
    connectionString,
    // Liten pool – varje serverless-instans bör inte hålla många connections.
    max: 3,
    idleTimeoutMillis: 10_000,
    // Supabase pooler kräver SSL.
    ssl: connectionString.includes('localhost')
      ? undefined
      : { rejectUnauthorized: false },
  });
}

export const pool = globalThis.__pgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgPool = pool;
}
