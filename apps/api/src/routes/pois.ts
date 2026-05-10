import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { NearbyResponse, Poi } from '@geo-audio/shared';
import { pool } from '../db.js';

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Max 5 km – hindrar att klienter pullar hela DB:n.
  radius: z.coerce.number().int().positive().max(5000).default(500),
});

interface PoiRow {
  id: string;
  name: string;
  description: string;
  narration: string | null;
  lng: number;
  lat: number;
  trigger_radius_meters: number;
  audio_url: string;
  audio_duration_seconds: number | null;
  image_url: string | null;
  category: string | null;
  distance_meters: number;
}

function rowToPoi(row: PoiRow): Poi & { distanceMeters: number } {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    narration: row.narration ?? undefined,
    coordinates: [row.lng, row.lat],
    triggerRadiusMeters: row.trigger_radius_meters,
    audioUrl: row.audio_url,
    audioDurationSeconds: row.audio_duration_seconds ?? undefined,
    imageUrl: row.image_url ?? undefined,
    category: row.category ?? undefined,
    distanceMeters: Math.round(row.distance_meters),
  };
}

export async function poisRoutes(app: FastifyInstance) {
  /**
   * GET /pois/nearby?lat=..&lng=..&radius=..
   *
   * Returnerar POI:er inom radius (meter) från given punkt.
   * Sätter Cache-Control så CDN/browser kan återanvända svaret kort tid.
   */
  app.get('/pois/nearby', async (req, reply) => {
    const parsed = nearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.badRequest(parsed.error.issues.map((i) => i.message).join('; '));
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
    // Korttidscache i CDN/browser. POI:er ändras sällan.
    reply.header('Cache-Control', 'public, max-age=30, s-maxage=300');
    return body;
  });

  /**
   * GET /pois/:id – detaljerad info för en POI.
   */
  app.get<{ Params: { id: string } }>('/pois/:id', async (req, reply) => {
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
      [req.params.id],
    );
    const row = rows[0];
    if (!row) return reply.notFound('POI not found');
    const { distanceMeters: _ignored, ...poi } = rowToPoi(row);
    return poi;
  });
}
