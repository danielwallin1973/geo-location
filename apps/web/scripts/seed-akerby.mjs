/**
 * Engångs-seed: lägger till POI för Åkerbyvägen 240, Täby i Supabase.
 * Kör: node --env-file=.env.local scripts/seed-akerby.mjs
 */
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const narration = [
  'Du står nu på Åkerbyvägen i kommundelen Tibble, en gata som anlades på 1960-talet i samband med en av Sveriges mest ambitiösa förortsutbyggnader.',
  'Husen omkring dig är typexempel på det svenska miljonprogrammets modernism – de flesta uppförda runt 1965, då HSB byggde de stora bostadsrättsföreningarna Farmen och Storstugan.',
  'Storstugan, det svängda sjuttonvåningshuset alldeles intill Täby Centrum, var när det stod klart ett av Sveriges längsta bostadshus och blev en symbol för den nya tidens stadsplanering, där bostäder, arbete och handel skulle samlas i självförsörjande satellitstäder.',
  'Täby Centrum, som öppnade 1968, var ett av landets första moderna inomhusköpcentrum och drog besökare från hela norra Storstockholm.',
  'Området ramas in av de stora trafiklederna Stockholmsvägen och Bergtorpsvägen – tidstypiskt för en epok då bilen stod i centrum för stadsplaneringen.',
  'Idag har området förtätats och renoverats, och utvecklingen mot nya Täby Park visar hur den svenska förorten förvandlas på nytt, ett halvt sekel efter att Åkerbyvägen drogs fram över de gamla åkermarkerna som gett gatan dess namn.',
].join(' ');

const sql = `
  INSERT INTO pois (name, description, narration, location, trigger_radius_meters, audio_url, category)
  VALUES (
    $1, $2, $3,
    ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
    $6, $7, $8
  )
  ON CONFLICT DO NOTHING
  RETURNING id, name;
`;

const params = [
  'Åkerbyvägen 240, Täby',
  'Mitt i 1960-talets Täby – Storstugan, Tibble och framväxten av Täby Centrum.',
  narration,
  18.0727983, // lng
  59.4501764, // lat
  50,
  '/audio/akerbyvagen-taby.mp3',
  'historia',
];

try {
  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    console.log('⚠️  Ingen rad infogad (kanske redan finns? ON CONFLICT DO NOTHING).');
  } else {
    console.log('✅ Inserted:', rows);
  }
} catch (err) {
  console.error('❌ FEL:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
