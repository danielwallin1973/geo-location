/**
 * Genererar mp3-ljudfiler för alla POI:er som har en `narration`-text och
 * en `audio_url` som pekar på `/audio/<filnamn>.mp3`.
 *
 * Körs lokalt: `pnpm --filter @geo-audio/web audio:generate`
 *              `pnpm --filter @geo-audio/web audio:generate -- --force`  (regenerera)
 *
 * Läser DATABASE_URL och OPENAI_* från apps/web/.env.local
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ladda .env.local explicit (Next.js-konvention; dotenv gör inte det automatiskt).
config({ path: resolve(__dirname, '..', '.env.local') });

const force = process.argv.includes('--force');

interface PoiRow {
  id: string;
  name: string;
  description: string;
  narration: string | null;
  audio_url: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ttsModel = process.env.OPENAI_TTS_MODEL || 'tts-1';
  const ttsVoice = process.env.OPENAI_TTS_VOICE || 'nova';
  const outputDirRel = process.env.AUDIO_OUTPUT_DIR || 'public/audio';

  if (!dbUrl) {
    console.error('❌ DATABASE_URL saknas i apps/web/.env.local');
    process.exit(1);
  }
  if (!openaiKey) {
    console.error('❌ OPENAI_API_KEY saknas i apps/web/.env.local');
    process.exit(1);
  }

  const outputDir = resolve(__dirname, '..', outputDirRel);
  await mkdir(outputDir, { recursive: true });
  console.log(`📁 Output: ${outputDir}`);

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost')
      ? undefined
      : { rejectUnauthorized: false },
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  const { rows } = await pool.query<PoiRow>(
    `SELECT id, name, description, narration, audio_url FROM pois ORDER BY name`,
  );

  console.log(`Hittade ${rows.length} POI:er.\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const poi of rows) {
    const text = poi.narration?.trim() || poi.description.trim();
    if (!text) {
      console.log(`⚠️  ${poi.name}: ingen text – hoppar över.`);
      skipped++;
      continue;
    }

    const filename = basename(poi.audio_url);
    if (!filename || extname(filename) !== '.mp3') {
      console.log(`⚠️  ${poi.name}: ogiltig audio_url "${poi.audio_url}".`);
      skipped++;
      continue;
    }
    const outPath = resolve(outputDir, filename);

    if (!force && (await fileExists(outPath))) {
      console.log(`⏭️  ${poi.name}: ${filename} finns redan.`);
      skipped++;
      continue;
    }

    try {
      console.log(`🎙️  ${poi.name}: genererar ${filename} (${text.length} tecken)…`);
      const response = await openai.audio.speech.create({
        model: ttsModel,
        voice: ttsVoice,
        input: text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(outPath, buffer);

      const wordCount = text.split(/\s+/).length;
      const estimatedSeconds = Math.round(wordCount / 2.5);

      await pool.query(
        `UPDATE pois SET audio_duration_seconds = $1, updated_at = NOW() WHERE id = $2`,
        [estimatedSeconds, poi.id],
      );

      console.log(`✅ ${poi.name}: ${(buffer.byteLength / 1024).toFixed(1)} KB, ~${estimatedSeconds}s`);
      generated++;
    } catch (err) {
      console.error(`❌ ${poi.name}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nKlart. ${generated} genererade, ${skipped} hoppade, ${failed} fel.`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
