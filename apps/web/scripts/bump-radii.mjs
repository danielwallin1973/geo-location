/**
 * Engångs-script: ökar trigger_radius_meters på alla POI:er till minst 100 m
 * för att kompensera för låg-noggrannhet GPS (Android Chrome använder WiFi-position).
 *
 * Kör: node --env-file=.env.local scripts/bump-radii.mjs
 */
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const { rows } = await pool.query(
    `UPDATE pois
     SET trigger_radius_meters = GREATEST(trigger_radius_meters, 100),
         updated_at = NOW()
     RETURNING name, trigger_radius_meters`,
  );
  console.log(`✅ Uppdaterade ${rows.length} POI:er:`);
  rows.forEach((r) => console.log(`   ${r.name}: ${r.trigger_radius_meters} m`));
} catch (err) {
  console.error('❌ FEL:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
