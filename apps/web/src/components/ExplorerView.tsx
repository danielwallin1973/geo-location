'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Poi } from '@geo-audio/shared';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useGeofence } from '@/hooks/useGeofence';
import { useWakeLock } from '@/hooks/useWakeLock';
import { fetchNearbyPois } from '@/lib/api';
import { MapView } from './MapView';
import { AudioPlayer } from './AudioPlayer';
import { StartJourneyOverlay } from './StartJourneyOverlay';
import styles from './ExplorerView.module.scss';

/**
 * Huvudvyn som binder ihop:
 * - "Starta resa"-overlay (krävs för att låsa upp ljud-autoplay i iOS)
 * - GPS (useGeolocation)
 * - POI-hämtning från API:et (refetch när användaren rört sig tillräckligt)
 * - Geofencing-trigger (useGeofence)
 * - Wake Lock så skärmen inte släcks
 * - Karta + ljudspelare
 */
export function ExplorerView() {
  const [started, setStarted] = useState(false);
  const { position, error, loading } = useGeolocation(started);
  const [pois, setPois] = useState<Poi[]>([]);
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const [lastFetchCoords, setLastFetchCoords] = useState<
    [number, number] | null
  >(null);

  useWakeLock(started);

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

  const handleStart = useCallback(() => {
    // "Lås upp" ljuduppspelning genom att spela en kort tyst buffer från
    // en användargest. Efter detta får appen lov att starta ljud automatiskt.
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch {
      /* ignorera – fungerar ändå med <audio>-elementets play() */
    }
    setStarted(true);
  }, []);

  if (!started) {
    return <StartJourneyOverlay onStart={handleStart} />;
  }

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
