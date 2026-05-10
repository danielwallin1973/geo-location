import type { NearbyResponse, Poi } from '@geo-audio/shared';

/**
 * Same-origin API – Next.js Route Handlers under /api/pois/*.
 * Inga CORS-bekymmer eftersom det är samma host som frontenden.
 */
const API_BASE = '/api';

/**
 * Hämtar POI:er nära en punkt.
 */
export async function fetchNearbyPois(
  lat: number,
  lng: number,
  radius = 1000,
): Promise<NearbyResponse> {
  const url = new URL(`${API_BASE}/pois/nearby`, window.location.origin);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  url.searchParams.set('radius', String(radius));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as NearbyResponse;
}

export async function fetchPoi(id: string): Promise<Poi> {
  const res = await fetch(`${API_BASE}/pois/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as Poi;
}
