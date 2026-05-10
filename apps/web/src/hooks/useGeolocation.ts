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

/**
 * Wrappar `navigator.geolocation.watchPosition` med React-state.
 *
 * Inkluderar några viktiga robustheter för mobila browsers (särskilt Android
 * Chrome) som annars "tystnar" efter timeout eller efter en stunds inaktivitet:
 *
 * - Watchdog som restartar watchPosition om vi inte fått fix på 20 s.
 * - Timeout-fel raderar inte senast kända position – vi visar den vidare
 *   med en mjuk "GPS svag"-statusrad.
 * - Re-startar watch när fliken återigen blir synlig.
 *
 * Detta är fortfarande bara FÖRGRUNDS-tracking. För bakgrund krävs nativ wrapper.
 *
 * @param enabled  Sätt false innan användaren tryckt "Starta resa".
 */
export function useGeolocation(enabled = true): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Tickas upp när vi vill omstarta watchPosition (visibilitychange + watchdog).
  const [restartTick, setRestartTick] = useState(0);
  const lastFixAtRef = useRef<number>(0);

  // Re-starta när fliken blir synlig igen (Android Chrome fryser ofta i bakgrunden).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setRestartTick((t) => t + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Watchdog: om vi inte fått fix på 20 s, omstarta watchPosition.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const now = Date.now();
      const last = lastFixAtRef.current;
      if (last > 0 && now - last > 20_000) {
        // Logga, ticka restart.
        // eslint-disable-next-line no-console
        console.warn('[geo] Ingen fix på 20 s – omstartar watchPosition.');
        lastFixAtRef.current = now; // undvik tight loop
        setRestartTick((t) => t + 1);
      }
    }, 5_000);
    return () => clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocation stöds inte i den här browsern.');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        lastFixAtRef.current = Date.now();
        setPosition({
          coords: [pos.coords.longitude, pos.coords.latitude],
          accuracyMeters: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[geo] watchPosition error:', err.code, err.message);
        // TIMEOUT (3) eller POSITION_UNAVAILABLE (2): behåll senaste position
        // istället för att slänga den – visa bara mjuk varning.
        if (err.code === err.PERMISSION_DENIED) {
          setError('Platstillstånd nekat. Aktivera platsåtkomst i webbläsaren.');
          setLoading(false);
          return;
        }
        setError(`GPS svag: ${err.message}`);
        // Trigga en omstart efter en kort paus.
        setTimeout(() => setRestartTick((t) => t + 1), 3_000);
      },
      {
        // OBS: enableHighAccuracy:true triggar Android Chrome-bugg där GPS-chippet
        // inte får fix → timeout. Med false använder vi WiFi/mobilmaster vilket
        // ger ±50-100m noggrannhet men UPPDATERAS pålitligt när man går.
        // För 50-80m geofence-radier är det fullt tillräckligt.
        enableHighAccuracy: false,
        maximumAge: 5_000,
        timeout: 30_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, restartTick]);

  return { position, error, loading };
}
