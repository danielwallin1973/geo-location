'use client';

import { useEffect, useRef, useState } from 'react';
import type { Poi } from '@geo-audio/shared';
import { haversineMeters } from '@/lib/geo';

interface UseGeofenceArgs {
  /** Användarens nuvarande position [lng, lat]. */
  userCoords: [number, number] | null;
  /** Lista över POI:er att övervaka. */
  pois: Poi[];
  /**
   * Tid i ms en POI måste förbli inaktiv innan den kan trigga igen.
   * Hindrar att samma plats spelas om och om igen om man står still vid gränsen.
   */
  cooldownMs?: number;
  /** Callback när användaren går in i en POI:s triggerradie. */
  onEnter: (poi: Poi) => void;
}

/**
 * Klient-side geofencing.
 *
 * För varje positionsuppdatering kollar vi alla POI:er och trigger de
 * vi precis kommit innanför radien för. All matchning sker i klienten,
 * vilket gör att backend inte behöver ta emot positionspingar.
 */
export function useGeofence({
  userCoords,
  pois,
  cooldownMs = 60_000,
  onEnter,
}: UseGeofenceArgs) {
  // Vilka POI:er användaren redan är "inne i". Förhindrar dubbla triggers.
  const insideRef = useRef<Set<string>>(new Set());
  // När en POI senast triggade. Förhindrar nya triggers under cooldown.
  const lastFiredRef = useRef<Map<string, number>>(new Map());
  const [activePoiId, setActivePoiId] = useState<string | null>(null);

  useEffect(() => {
    if (!userCoords) return;

    const now = Date.now();
    const stillInside = new Set<string>();

    for (const poi of pois) {
      const dist = haversineMeters(userCoords, poi.coordinates);
      const inside = dist <= poi.triggerRadiusMeters;

      if (inside) {
        stillInside.add(poi.id);
        const wasInside = insideRef.current.has(poi.id);
        const lastFired = lastFiredRef.current.get(poi.id) ?? 0;
        const cooledDown = now - lastFired > cooldownMs;

        if (!wasInside && cooledDown) {
          lastFiredRef.current.set(poi.id, now);
          setActivePoiId(poi.id);
          onEnter(poi);
        }
      }
    }

    insideRef.current = stillInside;
  }, [userCoords, pois, cooldownMs, onEnter]);

  return { activePoiId, clearActive: () => setActivePoiId(null) };
}
