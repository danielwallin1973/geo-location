import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:1234')
    .transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // TTS-relaterat (bara nödvändigt för audio:generate-scriptet)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TTS_MODEL: z.string().default('tts-1'),
  OPENAI_TTS_VOICE: z.string().default('nova'),
  AUDIO_OUTPUT_DIR: z.string().default('../web/public/audio'),
});

export const env = schema.parse(process.env);
