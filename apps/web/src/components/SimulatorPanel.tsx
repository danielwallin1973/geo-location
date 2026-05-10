'use client';

import { useState } from 'react';
import type { Poi, LngLat } from '@geo-audio/shared';

interface SimulatorPanelProps {
  pois: Poi[];
  active: boolean;
  onToggle: (next: boolean) => void;
  onJumpTo: (coords: LngLat) => void;
  onNudge: (deltaMeters: { east: number; north: number }) => void;
}

/**
 * Sim-panel för att fake:a din position. När den är PÅ ignoreras riktig GPS
 * och positionen styrs helt av denna panel. Bra för att testa POI-trigger
 * och audio-uppspelning utan att gå utomhus.
 */
export function SimulatorPanel({
  pois,
  active,
  onToggle,
  onJumpTo,
  onNudge,
}: SimulatorPanelProps) {
  const [open, setOpen] = useState(false);
  const [stepMeters, setStepMeters] = useState(20);

  return (
    <div
      style={{
        position: 'fixed',
        top: 90,
        left: 12,
        zIndex: 9999,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: active ? '#ff0' : '#222',
          color: active ? '#000' : '#fff',
          border: '1px solid #555',
          padding: '6px 10px',
          borderRadius: 6,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        🧪 Sim {active ? 'PÅ' : 'AV'}
      </button>

      {open && (
        <div
          style={{
            marginTop: 6,
            background: 'rgba(20,20,20,0.95)',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 8,
            padding: 10,
            width: 'min(92vw, 280px)',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <strong>Aktivera simulator</strong>
          </label>

          {active && (
            <>
              <div style={{ marginBottom: 8, color: '#aaa', fontSize: 11 }}>
                Hoppa till POI:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  marginBottom: 12,
                }}
              >
                {pois.length === 0 && (
                  <em style={{ color: '#888' }}>Inga POI:er än – vänta…</em>
                )}
                {pois.map((poi) => (
                  <button
                    key={poi.id}
                    type="button"
                    onClick={() => onJumpTo(poi.coordinates)}
                    style={{
                      background: '#333',
                      color: '#fff',
                      border: '1px solid #555',
                      padding: '6px 8px',
                      borderRadius: 4,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    📍 {poi.name}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 6, color: '#aaa', fontSize: 11 }}>
                Stegstorlek: {stepMeters} m
              </div>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={stepMeters}
                onChange={(e) => setStepMeters(Number(e.target.value))}
                style={{ width: '100%', marginBottom: 8 }}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 4,
                }}
              >
                <div />
                <button
                  type="button"
                  onClick={() => onNudge({ east: 0, north: stepMeters })}
                  style={dpadBtn}
                  aria-label="Norr"
                >
                  ↑
                </button>
                <div />
                <button
                  type="button"
                  onClick={() => onNudge({ east: -stepMeters, north: 0 })}
                  style={dpadBtn}
                  aria-label="Väst"
                >
                  ←
                </button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 10,
                  }}
                >
                  {stepMeters}m
                </div>
                <button
                  type="button"
                  onClick={() => onNudge({ east: stepMeters, north: 0 })}
                  style={dpadBtn}
                  aria-label="Öst"
                >
                  →
                </button>
                <div />
                <button
                  type="button"
                  onClick={() => onNudge({ east: 0, north: -stepMeters })}
                  style={dpadBtn}
                  aria-label="Syd"
                >
                  ↓
                </button>
                <div />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const dpadBtn: React.CSSProperties = {
  background: '#0af',
  color: '#000',
  border: 'none',
  padding: '14px 0',
  borderRadius: 4,
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
};
