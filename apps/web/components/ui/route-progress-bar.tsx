'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname } from 'next/navigation';

function RouteProgressBarContent() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger pulse on pathname change
  useEffect(() => {
    setIsVisible(true);
    setProgress(30);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);

    timerRef.current = setTimeout(() => {
      setProgress(75);
    }, 80);

    completeTimerRef.current = setTimeout(() => {
      setProgress(100);
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(fadeTimer);
    }, 180);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [pathname]);

  // Support global custom events for async work
  useEffect(() => {
    const handleStart = () => {
      setIsVisible(true);
      setProgress(35);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setProgress(80);
      }, 150);
    };

    const handleStop = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 200);
    };

    window.addEventListener('jaago_start_loading', handleStart);
    window.addEventListener('jaago_stop_loading', handleStop);

    return () => {
      window.removeEventListener('jaago_start_loading', handleStart);
      window.removeEventListener('jaago_stop_loading', handleStop);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[2.5px] pointer-events-none transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 shadow-[0_0_10px_#f59e0b,0_0_5px_#f59e0b] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '200ms' : '300ms',
        }}
      />
    </div>
  );
}

export function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBarContent />
    </Suspense>
  );
}
