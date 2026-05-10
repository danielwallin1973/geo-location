'use client';

import { useEffect, useRef, useState } from 'react';
import type { Poi } from '@geo-audio/shared';
import styles from './AudioPlayer.module.scss';

interface AudioPlayerProps {
  poi: Poi | null;
  /** Auto-spela när en ny POI sätts (triggades av geofence). */
  autoPlay?: boolean;
  onClose: () => void;
}

export function AudioPlayer({ poi, autoPlay = true, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // När POI:n ändras: ladda och försök spela.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !poi) return;

    audio.src = poi.audioUrl;
    audio.load();
    if (autoPlay) {
      audio.play().catch(() => {
        // Browsern kan blockera autoplay innan användaren interagerat.
        setIsPlaying(false);
      });
    }
  }, [poi, autoPlay]);

  if (!poi) return null;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  return (
    <div className={styles.player} role="dialog" aria-label={poi.name}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{poi.category ?? 'Plats'}</p>
          <h2 className={styles.title}>{poi.name}</h2>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Stäng spelaren"
        >
          ✕
        </button>
      </div>

      <p className={styles.description}>{poi.description}</p>

      <div className={styles.controls}>
        <button type="button" className={styles.playBtn} onClick={togglePlay}>
          {isPlaying ? 'Pausa' : 'Spela'}
        </button>
        <audio
          ref={audioRef}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          controls
          preload="auto"
          className={styles.audio}
        />
      </div>
    </div>
  );
}
