'use client';

import { useEffect } from 'react';
import { RotateCw, AlertTriangle } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Check if this is a ChunkLoadError caused by a stale deploy bundle
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('failed to fetch dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      const storageKey = 'jaago_chunk_reload_attempt';
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();

      // If we haven't reloaded in the last 15 seconds, reload automatically to get fresh chunks
      if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
        return;
      }
    }

    console.error('Application runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Application Update or Interruption
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A new version of JAAGO HUB may have been deployed, or your session needs to be refreshed.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition shadow-md cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reload Page
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs border border-border hover:bg-surface active:scale-95 transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
