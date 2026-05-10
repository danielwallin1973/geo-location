'use client';

import { useEffect, useRef, useState } from 'react';

interface GeoEvent {
  t: number; // ms sedan start
  kind: 'fix' | 'error' | 'force' | 'info';
  text: string;
}

interface GeoDebugOverlayProps {
  enabled: boolean;
}

/**
 * Visar en svart overlay med live-logg av allt geolocation-API:et säger.
 * Helt fristående från useGeolocation – pratar direkt med navigator.geolocation,
 * så vi kan jämföra och se om det är vår hook eller browsern som inte uppdaterar.
 */
export function GeoDebugOverlay({ enabled }: GeoDebugOverlayProps) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const startRef = useRef<number>(Date.now());
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const log = (e: Omit<GeoEvent, 't'>) => {
    setEvents((prev) => [
      { ...e, t: Date.now() - startRef.current },
      ...prev.slice(0, 49),
    ]);
  };

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      log({ kind: 'error', text: 'navigator.geolocation saknas' });
      return;
    }

    log({ kind: 'info', text: 'startar watchPosition…' });
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
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
          text: `${lat.toFixed(6)}, ${lng.toFixed(6)} ±${Math.round(pos.coords.accuracy)}m  Δ${movedMeters.toFixed(1)}m`,
        });
      },
      (err) => {
        log({ kind: 'error', text: `code=${err.code} ${err.message}` });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );

    return () => {
      navigator.geolocation.clearWatch(id);
      log({ kind: 'info', text: 'clearWatch' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const forceFix = () => {
    log({ kind: 'force', text: 'getCurrentPosition()…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        log({
          kind: 'force',
          text: `→ ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} ±${Math.round(pos.coords.accuracy)}m`,
        });
      },
      (err) => log({ kind: 'error', text: `force fail: ${err.message}` }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
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
          <button
            type="button"
            onClick={forceFix}
            style={{
              background: '#0f0',
              color: '#000',
              border: 'none',
              padding: '4px 8px',
              borderRadius: 4,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Force getCurrentPosition
          </button>
          {events.length === 0 && <div>(inga events än)</div>}
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
