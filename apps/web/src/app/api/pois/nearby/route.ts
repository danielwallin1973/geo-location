import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { NearbyResponse } from '@geo-audio/shared';
import { pool } from '@/lib/db';
import { rowToPoi, type PoiRow } from '@/lib/poi-mapper';

// Kör i Node-runtime (inte Edge) – pg behöver Node.
export const runtime = 'nodejs';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().positive().max(5000).default(500),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 },
    );
  }
  const { lat, lng, radius } = parsed.data;

  const { rows } = await pool.query<PoiRow>(
    `
    SELECT
      id,
      name,
      description,
      narration,
      ST_X(location::geometry) AS lng,
      ST_Y(location::geometry) AS lat,
      trigger_radius_meters,
      audio_url,
      audio_duration_seconds,
      image_url,
      category,
      ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_meters
    FROM pois
    WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
    ORDER BY distance_meters ASC
    LIMIT 100
    `,
    [lng, lat, radius],
  );

  const body: NearbyResponse = { pois: rows.map(rowToPoi) };
  return NextResponse.json(body, {
    headers: {
      // CDN/browser-cache. POI:er ändras sällan.
      'Cache-Control': 'public, max-age=30, s-maxage=300',
    },
  });
}
