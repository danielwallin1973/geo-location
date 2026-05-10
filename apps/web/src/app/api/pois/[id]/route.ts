import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { rowToPoi, type PoiRow } from '@/lib/poi-mapper';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
      0::float AS distance_meters
    FROM pois
    WHERE id = $1
    `,
    [id],
  );
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'POI not found' }, { status: 404 });
  }
  const { distanceMeters: _ignored, ...poi } = rowToPoi(row);
  return NextResponse.json(poi);
}
