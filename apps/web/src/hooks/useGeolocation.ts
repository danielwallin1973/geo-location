'use client';

import { useEffect, useRef, useState } from 'react';
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

const POLL_INTERVAL_MS = 3_000;

/**
 * Pollar `navigator.geolocation.getCurrentPosition` var 3:e sekund.
 *
 * Vi använder polling istället för watchPosition eftersom Android Chrome
 * är ökänt för att rapportera samma cachade position om och om igen från
 * watchPosition utan att faktiskt uppdatera. getCurrentPosition med
 * maximumAge=0 tvingar fram en ny lookup varje gång.
 *
 * Vi varvar high/low accuracy:
 * - Försök 1: high (GPS) med 8s timeout. Om det funkar, suverän precision.
 * - Försök 2: low (WiFi) som fallback om high failar – nästan alltid snabbt.
 *
 * @param enabled Sätt false innan användaren tryckt "Starta resa".
 */
export function useGeolocation(enabled = true): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocation stöds inte i den här browsern.');
      setLoading(false);
      return;
    }

    cancelledRef.current = false;

    const tryGet = (highAccuracy: boolean): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          maximumAge: 0,
          timeout: highAccuracy ? 8_000 : 15_000,
        });
      });

    const pollOnce = async () => {
      // Försök high först. Faller tillbaka till low om timeout/unavailable.
      let pos: GeolocationPosition;
      try {
        pos = await tryGet(true);
      } catch (highErr) {
        const err = highErr as GeolocationPositionError;
        if (err.code === err.PERMISSION_DENIED) {
          if (!cancelledRef.current) {
            setError('Platstillstånd nekat. Aktivera platsåtkomst.');
            setLoading(false);
          }
          return;
        }
        try {
          pos = await tryGet(false);
        } catch (lowErr) {
          const e = lowErr as GeolocationPositionError;
          if (!cancelledRef.current) {
            if (e.code === e.PERMISSION_DENIED) {
              setError('Platstillstånd nekat. Aktivera platsåtkomst.');
            } else {
              setError(`GPS svag: ${e.message}`);
            }
            // Behåll senaste position; sluta inte loopen.
          }
          return;
        }
      }

      if (cancelledRef.current) return;
      setPosition({
        coords: [pos.coords.longitude, pos.coords.latitude],
        accuracyMeters: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      setError(null);
      setLoading(false);
    };

    // Första anropet direkt, sen var POLL_INTERVAL_MS.
    pollOnce();
    const id = setInterval(pollOnce, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [enabled]);

  return { position, error, loading };
}
