/**
 * Engångs-seed: lägger till POI för Brännkyrkagatan 47 i Supabase.
 * Kör: node --env-file=.env.local scripts/seed-brannkyrka.mjs
 */
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const narration = [
  'Du står nu på Brännkyrkagatan, en av Södermalms mest historieladdade gator – uppkallad efter Brännkyrka socken som Södermalm en gång tillhörde, ett namn som i sin tur syftar på en medeltida kyrka som brann ned.',
  'Det här kvarteret var länge centrum för Stockholms tobaksindustri. På sjuttonhundratalet och artonhundratalet doftade luften av tobaksblad och rök från de många små tobaksfabriker som låg utspridda över Maria församling.',
  'Arbetet utfördes till stor del av kvinnor och barn, ofta under hårda villkor – tolv till fjorton timmars arbetsdag, dålig ventilation och låga löner. Tobaksflickorna på Söder blev en egen samhällsklass, omsjungna i visor och beskrivna i August Strindbergs verk.',
  'Strindberg själv bodde periodvis i kvarteren här omkring och hämtade mycket av sitt material från Södermalms arbetarliv.',
  'Bara några hundra meter norrut ligger Maria Magdalena kyrka, sockenkyrkan dit alla tobaksarbetarna hörde. När Per Anders Fogelström på 1960-talet skrev sin epokgörande romansvit Mina drömmars stad, var det just dessa gator – Brännkyrkagatan, Krukmakargatan och Bellmansgatan – han skildrade som platsen där det moderna Stockholm växte fram ur fattigdomen.',
  'Husen omkring dig är till stora delar bevarade från artonhundratalets slut, även om gatans karaktär förvandlats i grunden – från arbetarstadens trångboddhet till dagens efterfrågade Söder-kvarter med kaféer och designbutiker.',
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
  'Brännkyrkagatan 47',
  'Tobaksflickornas och Strindbergs Söder – arbetarstaden bakom Mariakyrkan.',
  narration,
  18.0602837, // lng
  59.3191840, // lat
  100,
  '/audio/brannkyrkagatan-47.mp3',
  'historia',
];

try {
  const { rows } = await pool.query(sql, params);
  if (rows.length === 0) {
    console.log('⚠️  Ingen rad infogad (kanske redan finns?).');
  } else {
    console.log('✅ Inserted:', rows);
  }
} catch (err) {
  console.error('❌ FEL:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
