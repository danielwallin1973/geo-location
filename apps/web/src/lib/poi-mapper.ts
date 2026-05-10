import 'server-only';
import type { Poi } from '@geo-audio/shared';

export interface PoiRow {
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

export function rowToPoi(row: PoiRow): Poi & { distanceMeters: number } {
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
