'use client';

import { useEffect, useState } from 'react';
import type { LngLat } from '@geo-audio/shared';

export interface GeoPosition {
  coords: LngLat;
  accuracyMeters: number;
  timestamp: number;
}

export interface UseGeolocationResult {
  position: GeoPosition | null;
  error: string | null;
  /** True så länge vi väntar på första fix:en. */
  loading: boolean;
}

/**
 * Wrappar `navigator.geolocation.watchPosition` med React-state.
 * Detta är bara FÖRGRUNDS-tracking – när användaren minimerar browsern
 * pausar den. Det räcker för MVP; för bakgrund krävs nativ wrapper.
 */
export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocation stöds inte i den här browsern.');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          coords: [pos.coords.longitude, pos.coords.latitude],
          accuracyMeters: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 20_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error, loading };
}
