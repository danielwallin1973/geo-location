'use client';

import { useEffect, useRef } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  released: boolean;
  addEventListener: (type: 'release', cb: () => void) => void;
}

/**
 * Håller skärmen vaken så länge `active` är true. Återbegär låset om
 * användaren tabbar ut och tillbaka (browsers släpper locks då).
 *
 * Funkar i Chrome/Edge/Safari 16.4+ – på äldre browsers blir det no-op.
 */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!active) return;
    // Bredd-typad åtkomst eftersom WakeLock-types inte alltid finns i lib.dom.
    const wakeLock = (navigator as unknown as {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    }).wakeLock;
    if (!wakeLock) return;

    let cancelled = false;

    async function acquire() {
      try {
        const sentinel = await wakeLock!.request('screen');
        if (cancelled) {
          sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null;
        });
      } catch (err) {
        console.warn('[WakeLock] kunde inte hämta lås:', err);
      }
    }

    acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
