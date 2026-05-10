'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Poi, LngLat } from '@geo-audio/shared';
import { useGeolocation, type GeoPosition } from '@/hooks/useGeolocation';
import { useGeofence } from '@/hooks/useGeofence';
import { useWakeLock } from '@/hooks/useWakeLock';
import { fetchNearbyPois } from '@/lib/api';
import { MapView } from './MapView';
import { AudioPlayer } from './AudioPlayer';
import { StartJourneyOverlay } from './StartJourneyOverlay';
import { GeoDebugOverlay } from './GeoDebugOverlay';
import { LivePositionPanel } from './LivePositionPanel';
import { SimulatorPanel } from './SimulatorPanel';
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
  const realGeo = useGeolocation(started);
  const [pois, setPois] = useState<Poi[]>([]);
  const [activePoi, setActivePoi] = useState<Poi | null>(null);
  const [lastFetchCoords, setLastFetchCoords] = useState<
    [number, number] | null
  >(null);

  // Simulator-state. När active=true ignoreras realGeo.
  const [simActive, setSimActive] = useState(false);
  const [simCoords, setSimCoords] = useState<LngLat | null>(null);

  // Effektiv position = sim om aktiv, annars riktig.
  const position: GeoPosition | null = useMemo(() => {
    if (simActive && simCoords) {
      return {
        coords: simCoords,
        accuracyMeters: 5,
        timestamp: Date.now(),
      };
    }
    return realGeo.position;
  }, [simActive, simCoords, realGeo.position]);

  const error = simActive ? null : realGeo.error;
  const loading = simActive ? false : realGeo.loading;

  // Tickar varje sekund så att "senast uppdaterad för X s sedan" rör på sig.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const handleSimToggle = useCallback(
    (next: boolean) => {
      setSimActive(next);
      if (next && !simCoords) {
        // Starta från nuvarande riktiga position om vi har en, annars Stockholm.
        setSimCoords(realGeo.position?.coords ?? [18.0686, 59.3293]);
      }
    },
    [simCoords, realGeo.position],
  );

  const handleSimJumpTo = useCallback((coords: LngLat) => {
    setSimCoords(coords);
    setSimActive(true);
    // Tvinga refetch av POI:er på den nya platsen.
    setLastFetchCoords(null);
  }, []);

  const handleSimNudge = useCallback(
    ({ east, north }: { east: number; north: number }) => {
      setSimCoords((prev) => {
        const base = prev ?? realGeo.position?.coords ?? [18.0686, 59.3293];
        const [lng, lat] = base;
        // Approximation: 1° lat ≈ 111 320 m, 1° lng ≈ 111 320 * cos(lat).
        const dLat = north / 111_320;
        const dLng = east / (111_320 * Math.cos((lat * Math.PI) / 180));
        return [lng + dLng, lat + dLat];
      });
    },
    [realGeo.position],
  );

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
          {!loading && !position && error && `Fel: ${error}`}
          {position && (
            <>
              {pois.length} platser i närheten ·{' '}
              <span aria-label="precision">
                ±{Math.round(position.accuracyMeters)} m
              </span>{' '}
              ·{' '}
              <span aria-label="koordinater" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {position.coords[1].toFixed(5)}, {position.coords[0].toFixed(5)}
              </span>{' '}
              · uppd. {Math.max(0, Math.round((now - position.timestamp) / 1000))} s sedan
              {error && <> · ⚠️ {error}</>}
            </>
          )}
        </p>
      </header>

      <AudioPlayer poi={activePoi} onClose={() => setActivePoi(null)} />
      <LivePositionPanel position={position} error={error} loading={loading} />
      <GeoDebugOverlay enabled={started} position={position} error={error} />
      <SimulatorPanel
        pois={pois}
        active={simActive}
        onToggle={handleSimToggle}
        onJumpTo={handleSimJumpTo}
        onNudge={handleSimNudge}
      />
    </div>
  );
}
