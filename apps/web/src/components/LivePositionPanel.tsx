'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeoPosition } from '@/hooks/useGeolocation';

interface LivePositionPanelProps {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
}

/**
 * Alltid synlig live-panel som visar exakt vad geolocation rapporterar:
 * - Koordinater
 * - Noggrannhet
 * - Tid sedan senaste fix (tickar varje sekund)
 * - Antal fixar och total flyttad sträcka
 *
 * Sitter fast längst ner – perfekt för att fältverifiera att GPS-en faktiskt
 * uppdateras när man går.
 */
export function LivePositionPanel({ position, error, loading }: LivePositionPanelProps) {
  const [now, setNow] = useState(() => Date.now());
  const lastTsRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [fixCount, setFixCount] = useState(0);
  const [totalMeters, setTotalMeters] = useState(0);
  const [lastDelta, setLastDelta] = useState(0);

  // Tickar 2 ggr/sek så att "X s sedan" rör på sig.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Räkna fixar + flyttad sträcka när vi får ny position.
  useEffect(() => {
    if (!position) return;
    if (position.timestamp === lastTsRef.current) return;
    lastTsRef.current = position.timestamp;

    const lat = position.coords[1];
    const lng = position.coords[0];
    const last = lastCoordsRef.current;
    if (last) {
      const dy = (lat - last.lat) * 111_000;
      const dx = (lng - last.lng) * 111_000 * Math.cos((lat * Math.PI) / 180);
      const moved = Math.sqrt(dx * dx + dy * dy);
      setLastDelta(moved);
      setTotalMeters((prev) => prev + moved);
    }
    lastCoordsRef.current = { lat, lng };
    setFixCount((n) => n + 1);
  }, [position]);

  const repoll = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      () => { /* useGeolocation watch fångar upp den */ },
      () => { /* GeoDebugOverlay loggar fel */ },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  };

  const ageSeconds = position ? Math.max(0, (now - position.timestamp) / 1000) : null;
  // Färgkoda: grön <5s, gul <15s, röd ≥15s
  const ageColor =
    ageSeconds === null
      ? '#888'
      : ageSeconds < 5
        ? '#0f0'
        : ageSeconds < 15
          ? '#fc0'
          : '#f55';

  return (
    <div
      style={{
        position: 'fixed',
        top: 90,
        right: 12,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: 8,
        padding: '10px 12px',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        lineHeight: 1.4,
        minWidth: 200,
        maxWidth: 'min(80vw, 280px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ color: ageColor }}>● LIVE POSITION</strong>
        <button
          type="button"
          onClick={repoll}
          style={{
            background: '#0af',
            color: '#000',
            border: 'none',
            padding: '3px 8px',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          Re-poll
        </button>
      </div>

      {loading && !position && <div>Söker första fix…</div>}

      {position && (
        <>
          <div>
            <span style={{ color: '#888' }}>lat:</span>{' '}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {position.coords[1].toFixed(6)}
            </span>
          </div>
          <div>
            <span style={{ color: '#888' }}>lng:</span>{' '}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {position.coords[0].toFixed(6)}
            </span>
          </div>
          <div>
            <span style={{ color: '#888' }}>noggr:</span>{' '}
            ±{Math.round(position.accuracyMeters)} m
          </div>
          <div>
            <span style={{ color: '#888' }}>ålder:</span>{' '}
            <span style={{ color: ageColor, fontWeight: 700 }}>
              {ageSeconds!.toFixed(1)} s
            </span>
          </div>
          <div>
            <span style={{ color: '#888' }}>fixar:</span> {fixCount} ·{' '}
            <span style={{ color: '#888' }}>Δ:</span> {lastDelta.toFixed(1)} m ·{' '}
            <span style={{ color: '#888' }}>tot:</span> {totalMeters.toFixed(0)} m
          </div>
        </>
      )}

      {error && (
        <div style={{ color: '#f55', marginTop: 4 }}>⚠ {error}</div>
      )}
    </div>
  );
}
