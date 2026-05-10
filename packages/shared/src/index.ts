/**
 * Delade typer mellan frontend (Next.js) och backend (Fastify).
 * Håll detta paket litet och fritt från runtime-deps.
 */

/** En geografisk punkt enligt GeoJSON-konvention: [lng, lat]. */
export type LngLat = [number, number];

/** En Point of Interest – en plats som har historisk/geologisk information. */
export interface Poi {
  id: string;
  name: string;
  /** Kort beskrivning som visas i UI:t (kortet/popup:en). */
  description: string;
  /** Längre berättartext som läses upp som ljud. Valfri – server kan utelämna. */
  narration?: string;
  /** Längd, latitud (GeoJSON-ordning). */
  coordinates: LngLat;
  /** Radie i meter inom vilken ljudet ska börja spelas. */
  triggerRadiusMeters: number;
  /** URL till ljudfilen (mp3). Kan vara absolut eller relativ till web-appen. */
  audioUrl: string;
  /** Längd i sekunder, för UI. */
  audioDurationSeconds?: number;
  /** Valfri bild för POI-kortet. */
  imageUrl?: string;
  /** Tema/kategori, t.ex. "geologi", "medeltid". */
  category?: string;
}

/** Query-parametrar för "POI:er nära mig". */
export interface NearbyQuery {
  lat: number;
  lng: number;
  /** Sökradie i meter. */
  radius: number;
}

/** API-svar för nearby-endpointen. */
export interface NearbyResponse {
  pois: Array<Poi & { distanceMeters: number }>;
}
