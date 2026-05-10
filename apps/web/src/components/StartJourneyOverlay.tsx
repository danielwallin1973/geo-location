'use client';

import styles from './StartJourneyOverlay.module.scss';

interface StartJourneyOverlayProps {
  onStart: () => void;
}

/**
 * Heltäckande "tap-to-start"-overlay. Måste klickas innan vi får börja
 * spela ljud automatiskt – speciellt iOS Safari kräver en användargest
 * för att låsa upp ljuduppspelning.
 */
export function StartJourneyOverlay({ onStart }: StartJourneyOverlayProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-label="Starta resa">
      <div className={styles.card}>
        <h1 className={styles.title}>Geo Audio</h1>
        <p className={styles.lede}>
          Ett utomhus-museum för örat. Berättelser om platser läses upp när
          du passerar dem.
        </p>
        <ul className={styles.list}>
          <li>📍 Tillåt platsdelning när du blir frågad</li>
          <li>🎧 Använd hörlurar för bästa upplevelse</li>
          <li>🔋 Skärmen hålls vaken under resan</li>
        </ul>
        <button type="button" className={styles.startBtn} onClick={onStart}>
          Starta resa
        </button>
        <p className={styles.fineprint}>
          Vi sparar inte din position. All matchning sker i din telefon.
        </p>
      </div>
    </div>
  );
}
