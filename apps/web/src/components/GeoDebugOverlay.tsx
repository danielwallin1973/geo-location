'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeoPosition } from '@/hooks/useGeolocation';

interface GeoEvent {
  t: number;
  kind: 'fix' | 'error' | 'force' | 'info';
  text: string;
}

interface GeoDebugOverlayProps {
  enabled: boolean;
  /** Live-position från huvudhooken – vi loggar varje förändring. */
  position: GeoPosition | null;
  /** Senaste error-meddelande från huvudhooken. */
  error: string | null;
}

/**
 * Visar en svart overlay med live-logg av varje GPS-fix vi får från
 * useGeolocation-hooken (för att inte konkurrera om watchPosition-slottar
 * på Android Chrome).
 *
 * Har också "Force HIGH/LOW"-knappar som ringer geolocation-API:et direkt
 * när du behöver tvinga fram en omedelbar fix för felsökning.
 */
export function GeoDebugOverlay({ enabled, position, error }: GeoDebugOverlayProps) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const startRef = useRef<number>(Date.now());
  const lastTsRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const log = (e: Omit<GeoEvent, 't'>) => {
    setEvents((prev) => [
      { ...e, t: Date.now() - startRef.current },
      ...prev.slice(0, 49),
    ]);
  };

  useEffect(() => {
    if (!enabled || !position) return;
    if (position.timestamp === lastTsRef.current) return;
    lastTsRef.current = position.timestamp;

    const lat = position.coords[1];
    const lng = position.coords[0];
    const last = lastCoordsRef.current;
    let movedMeters = 0;
    if (last) {
      const dy = (lat - last.lat) * 111_000;
      const dx = (lng - last.lng) * 111_000 * Math.cos((lat * Math.PI) / 180);
      movedMeters = Math.sqrt(dx * dx + dy * dy);
    }
    lastCoordsRef.current = { lat, lng };

    log({
      kind: 'fix',
      text: `${lat.toFixed(6)}, ${lng.toFixed(6)} ±${Math.round(position.accuracyMeters)}m  Δ${movedMeters.toFixed(1)}m`,
    });
  }, [position, enabled]);

  useEffect(() => {
    if (!enabled || !error) return;
    log({ kind: 'error', text: error });
  }, [error, enabled]);

  const forceFix = (highAccuracy: boolean) => {
    log({
      kind: 'force',
      text: highAccuracy ? 'getCurrentPosition (high)…' : 'getCurrentPosition (low)…',
    });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        log({
          kind: 'force',
          text: `→ ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} ±${Math.round(pos.coords.accuracy)}m`,
        });
      },
      (err) =>
        log({
          kind: 'error',
          text: `force fail (code ${err.code}): ${err.message}`,
        }),
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: highAccuracy ? 5_000 : 60_000,
        timeout: 20_000,
      },
    );
  };

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 9999,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        color: '#0f0',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: '#000',
          color: '#0f0',
          border: '1px solid #0f0',
          padding: '6px 10px',
          borderRadius: 6,
        }}
      >
        🛰 GPS log ({events.filter((e) => e.kind === 'fix').length})
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid #0f0',
            borderRadius: 6,
            padding: 8,
            width: 'min(92vw, 420px)',
            maxHeight: '50vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => forceFix(true)}
              style={{
                background: '#0f0',
                color: '#000',
                border: 'none',
                padding: '4px 8px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              Force HIGH
            </button>
            <button
              type="button"
              onClick={() => forceFix(false)}
              style={{
                background: '#ff0',
                color: '#000',
                border: 'none',
                padding: '4px 8px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              Force LOW
            </button>
          </div>
          {events.length === 0 && <div>(inga events än – vänta på fix…)</div>}
          {events.map((e, i) => (
            <div
              key={i}
              style={{
                color:
                  e.kind === 'error'
                    ? '#f55'
                    : e.kind === 'force'
                      ? '#ff0'
                      : e.kind === 'info'
                        ? '#888'
                        : '#0f0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              [{(e.t / 1000).toFixed(1)}s] {e.kind} {e.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
