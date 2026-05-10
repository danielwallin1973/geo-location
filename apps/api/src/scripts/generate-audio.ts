/**
 * Genererar mp3-ljudfiler för alla POI:er som har en `narration`-text och
 * en `audio_url` som pekar på `/audio/<filnamn>.mp3`.
 *
 * Körs lokalt: `pnpm --filter @geo-audio/api audio:generate`
 *
 * - Hoppar över POI:er där mp3:n redan finns (idempotent). Använd `--force`
 *   för att regenerera.
 * - Skriver filer till AUDIO_OUTPUT_DIR (default: apps/web/public/audio).
 * - Uppdaterar `audio_duration_seconds` i databasen efter generering om möjligt.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { env } from '../env.js';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
  if (!env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY saknas i .env');
    process.exit(1);
  }

  const outputDir = resolve(__dirname, '..', '..', env.AUDIO_OUTPUT_DIR);
  await mkdir(outputDir, { recursive: true });
  console.log(`📁 Output: ${outputDir}`);

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

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

    // Härled filnamn från audio_url (t.ex. /audio/stortorget.mp3 → stortorget.mp3)
    const filename = basename(poi.audio_url);
    if (!filename || extname(filename) !== '.mp3') {
      console.log(`⚠️  ${poi.name}: ogiltig audio_url "${poi.audio_url}" – hoppar över.`);
      skipped++;
      continue;
    }
    const outPath = resolve(outputDir, filename);

    if (!force && (await fileExists(outPath))) {
      console.log(`⏭️  ${poi.name}: ${filename} finns redan (använd --force för att regenerera).`);
      skipped++;
      continue;
    }

    try {
      console.log(`🎙️  ${poi.name}: genererar ${filename} (${text.length} tecken)…`);
      const response = await openai.audio.speech.create({
        model: env.OPENAI_TTS_MODEL,
        voice: env.OPENAI_TTS_VOICE,
        input: text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(outPath, buffer);

      // Grov uppskattning av längd: ~150 ord/min = ~2.5 ord/sek.
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
