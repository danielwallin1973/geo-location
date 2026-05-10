'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Poi } from '@geo-audio/shared';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useGeofence } from '@/hooks/useGeofence';
import { fetchNearbyPois } from '@/lib/api';
import { MapView } from './MapView';
import { AudioPlayer } from './AudioPlayer';
import styles from './ExplorerView.module.scss';

/**
 * Huvudvyn som binder ihop:
 * - GPS (useGeolocation)
 * - POI-hämtning från API:et (refetch när användaren rört sig tillräckligt)
 * - Geofencing-trigger (useGeofence)
 * - Karta + ljudspelare
 */
export function ExplorerView() {
  const { position, error, loading } = useGeolocation();
  const [pois, setPois] = useState<Poi[]>([]);
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const [lastFetchCoords, setLastFetchCoords] = useState<
    [number, number] | null
  >(null);

  // Hämta POI:er kring användaren – men bara om vi rört oss > 200m sedan sist.
  useEffect(() => {
    if (!position) return;
    const [lng, lat] = position.coords;

    if (lastFetchCoords) {
      const [prevLng, prevLat] = lastFetchCoords;
      const dLng = (lng - prevLng) * 111_000;
      const dLat = (lat - prevLat) * 111_000;
      const movedMeters = Math.sqrt(dLng * dLng + dLat * dLat);
      if (movedMeters < 200) return;
    }

    fetchNearbyPois(lat, lng, 1500)
      .then((res) => {
        setPois(res.pois);
        setLastFetchCoords([lng, lat]);
      })
      .catch((err) => {
        console.error('Misslyckades att hämta POI:er', err);
      });
  }, [position, lastFetchCoords]);

  const handleGeofenceEnter = useCallback((poi: Poi) => {
    setActivePoi(poi);
  }, []);

  const { activePoiId } = useGeofence({
    userCoords: position?.coords ?? null,
    pois,
    onEnter: handleGeofenceEnter,
  });

  return (
    <div className={styles.root}>
      <MapView
        userCoords={position?.coords ?? null}
        pois={pois}
        activePoiId={activePoiId}
      />

      <header className={styles.topBar}>
        <h1 className={styles.brand}>Geo Audio</h1>
        <p className={styles.status}>
          {loading && 'Söker din position…'}
          {error && `Fel: ${error}`}
          {!loading && !error && position && (
            <>
              {pois.length} platser i närheten ·{' '}
              <span aria-label="precision">
                ±{Math.round(position.accuracyMeters)} m
              </span>
            </>
          )}
        </p>
      </header>

      <AudioPlayer poi={activePoi} onClose={() => setActivePoi(null)} />
    </div>
  );
}
