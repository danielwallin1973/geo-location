'use client';

import type { Poi } from '@geo-audio/shared';
import styles from './SimulatorPanel.module.scss';

interface SimulatorPanelProps {
  pois: Poi[];
  active: boolean;
  onToggle: () => void;
  onJumpTo: (coords: [number, number]) => void;
  onNudge: (deltaMeters: { east: number; north: number }) => void;
}

/**
 * Liten dev/test-panel som låter dig fake:a din position till valfri POI eller
 * "gå" stegvis i fyra väderstreck. Aktiveras via knappen i nedre högra hörnet.
 *
 * När simulatorn är aktiv tas position från denna panel istället för riktig GPS.
 */
export function SimulatorPanel({
  pois,
  active,
  onToggle,
  onJumpTo,
  onNudge,
}: SimulatorPanelProps) {
  return (
    <div className={styles.root} data-active={active}>
      <button
        type="button"
        className={styles.toggle}
        onClick={onToggle}
        aria-label="Toggle simulator"
      >
        {active ? '🧪 Sim PÅ' : '🧪 Sim'}
      </button>

      {active && (
        <div className={styles.panel}>
          <p className={styles.hint}>Hoppa till POI:</p>
          <div className={styles.poiList}>
            {pois.map((poi) => (
              <button
                key={poi.id}
                type="button"
                className={styles.poiBtn}
                onClick={() => onJumpTo(poi.coordinates)}
              >
                {poi.name}
              </button>
            ))}
          </div>

          <p className={styles.hint}>Gå (10 m):</p>
          <div className={styles.dpad}>
            <button
              type="button"
              className={styles.dpadN}
              onClick={() => onNudge({ east: 0, north: 10 })}
              aria-label="Norr"
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.dpadW}
              onClick={() => onNudge({ east: -10, north: 0 })}
              aria-label="Väst"
            >
              ←
            </button>
            <button
              type="button"
              className={styles.dpadE}
              onClick={() => onNudge({ east: 10, north: 0 })}
              aria-label="Öst"
            >
              →
            </button>
            <button
              type="button"
              className={styles.dpadS}
              onClick={() => onNudge({ east: 0, north: -10 })}
              aria-label="Syd"
            >
              ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
