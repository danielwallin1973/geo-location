import type { NearbyResponse, Poi } from '@geo-audio/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Hämtar POI:er nära en punkt. Använder no-store i utvecklingsläge,
 * i prod låter vi browsern följa Cache-Control-headern från servern.
 */
export async function fetchNearbyPois(
  lat: number,
  lng: number,
  radius = 1000,
): Promise<NearbyResponse> {
  const url = new URL(`${API_URL}/pois/nearby`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  url.searchParams.set('radius', String(radius));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as NearbyResponse;
}

export async function fetchPoi(id: string): Promise<Poi> {
  const res = await fetch(`${API_URL}/pois/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as Poi;
}
