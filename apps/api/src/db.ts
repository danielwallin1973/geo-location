import pg from 'pg';
import { env } from './env.js';

/**
 * Delad PostgreSQL-pool. Stateless – varje request lånar en connection.
 * När vi skalar horisontellt får varje Node-instans sin egen pool.
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  // Logga men krascha inte – Fastify hanterar request-fel separat.
  console.error('[pg] idle client error', err);
});
