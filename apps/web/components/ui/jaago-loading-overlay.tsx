'use client';

import React from 'react';
import Image from 'next/image';

interface JaagoLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  fullscreen?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export function JaagoSpinner({
  size = 'md',
  message: _message,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}) {
  const dimensions = {
    sm: { box: 'w-12 h-12', logo: 36, ring: 'w-14 h-14' },
    md: { box: 'w-18 h-18', logo: 56, ring: 'w-22 h-22' },
    lg: { box: 'w-24 h-24', logo: 76, ring: 'w-28 h-28' },
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* ── Logo & Spinner Centerpiece ── */}
      <div className="relative flex items-center justify-center">
        {/* Ambient Brand Glow behind logo */}
        <div
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse pointer-events-none"
          style={{ animationDuration: '2s' }}
        />

        {/* Outer High-Precision iOS/Orbital Spinner Ring */}
        <div
          className="absolute -inset-2.5 sm:-inset-3 rounded-full border-[2.5px] border-transparent border-t-primary border-r-primary/40 animate-spin"
          style={{ animationDuration: '1s' }}
        />

        {/* Secondary Counter-Rotating Accent Track */}
        <div
          className="absolute -inset-1.5 sm:-inset-2 rounded-full border border-primary/20 border-b-primary/50 animate-spin"
          style={{ animationDuration: '2.5s', animationDirection: 'reverse' }}
        />

        {/* 12-Blade Radial Tick Markers (iOS style like sample image) */}
        <div className="absolute -inset-3.5 sm:-inset-4 flex items-center justify-center pointer-events-none opacity-40 animate-pulse">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1="50"
                y1="8"
                x2="50"
                y2="15"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-primary"
                transform={`rotate(${i * 30} 50 50)`}
                opacity={((i + 1) / 12) * 0.9}
              />
            ))}
          </svg>
        </div>

        {/* Centered JAAGO Round Logo without rectangular background */}
        <div
          className={`relative ${dimensions.box} rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.6)] transform transition-transform animate-pulse`}
          style={{ animationDuration: '1.8s' }}
        >
          <Image
            src="/jaago-logo-round.png"
            alt="JAAGO Loading"
            width={dimensions.logo}
            height={dimensions.logo}
            priority
            className="w-full h-full object-contain rounded-full drop-shadow-[0_2px_8px_rgba(245,197,24,0.3)]"
          />
        </div>
      </div>
    </div>
  );
}

export function JaagoLoadingOverlay({
  isVisible,
  message: _message,
  fullscreen = true,
  className = '',
  onDismiss,
}: JaagoLoadingOverlayProps) {
  React.useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onDismiss) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  if (fullscreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy={isVisible}
        className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center backdrop-blur-[6px] bg-background/50 dark:bg-background/60 espresso:bg-background/70 transition-all duration-200 ease-out animate-in fade-in cursor-pointer ${className}`}
        onClick={(e) => {
          // Allow clicking outside the center spinner to immediately dismiss
          if (e.target === e.currentTarget && onDismiss) {
            onDismiss();
          }
        }}
      >
        <div className="pointer-events-auto cursor-default">
          <JaagoSpinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={isVisible}
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-sm bg-background/50 dark:bg-background/60 espresso:bg-background/70 rounded-2xl transition-all duration-200 ease-out animate-in fade-in cursor-pointer ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onDismiss) {
          onDismiss();
        }
      }}
    >
      <div className="pointer-events-auto cursor-default">
        <JaagoSpinner size="sm" />
      </div>
    </div>
  );
}
