'use client';

import { useEffect } from 'react';

export default function GlobalError({
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

      if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
        return;
      }
    }

    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0F0F10] text-[#FFFFFF] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner text-2xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight">
              Application Update Required
            </h2>
            <p className="text-xs text-white/60 leading-relaxed">
              A newer version of the platform is available. Please reload to apply updates.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                } else {
                  reset();
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-black font-bold text-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
