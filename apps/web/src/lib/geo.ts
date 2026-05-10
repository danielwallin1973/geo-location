import type { LngLat } from '@geo-audio/shared';

/**
 * Haversine-formel – avstånd i meter mellan två lng/lat-punkter.
 * Bra nog för geofencing på några hundra meter.
 */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6_371_000; // jordens radie i meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const lat1r = toRad(lat1);
  const lat2r = toRad(lat2);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Genererar en approximerad cirkel som GeoJSON-polygon kring en punkt.
 * Använder destinationspunkts-formel som är noggrann nog för cirklar < några km.
 *
 * @param center  [lng, lat]
 * @param radiusMeters
 * @param steps   antal punkter i polygonen (64 = mjuk cirkel)
 */
export function geoCirclePolygon(
  center: LngLat,
  radiusMeters: number,
  steps = 64,
): [number, number][] {
  const [lng, lat] = center;
  const earthRadius = 6_371_000;
  const angularDistance = radiusMeters / earthRadius;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i * 2 * Math.PI) / steps;
    const sinLat =
      Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing);
    const newLat = Math.asin(sinLat);
    const newLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * sinLat,
      );
    coords.push([(newLng * 180) / Math.PI, (newLat * 180) / Math.PI]);
  }
  return coords;
}
