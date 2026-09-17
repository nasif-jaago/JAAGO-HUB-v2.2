'use client';

import React, { useState, useEffect } from 'react';
import { JaagoSpinner } from '@/components/ui/jaago-loading-overlay';
import { ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export function SignOutProgressOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initiating sign-out...');

  useEffect(() => {
    const handleProgress = (e: Event) => {
      const customEvent = e as CustomEvent<{ progress: number; status: string }>;
      if (customEvent.detail) {
        setIsVisible(true);
        setProgress(customEvent.detail.progress ?? 0);
        if (customEvent.detail.status) {
          setStatus(customEvent.detail.status);
        }
      }
    };

    window.addEventListener('jaago_signout_progress', handleProgress);
    return () => {
      window.removeEventListener('jaago_signout_progress', handleProgress);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/80 dark:bg-background/85 espresso:bg-background/90 backdrop-blur-md transition-all duration-300 animate-in fade-in select-none"
    >
      <div className="bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8 max-w-sm w-[90%] mx-auto flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
        {/* Animated Brand Centerpiece */}
        <div className="py-1">
          <JaagoSpinner size="md" />
        </div>

        {/* Title & Stage Status */}
        <div className="space-y-1 w-full">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider mb-1">
            <Lock className="w-3 h-3" />
            <span>Signing Out</span>
          </div>
          <h3 className="text-base font-black tracking-tight text-foreground">
            Signing Out of JAAGO Hub
          </h3>
          <p className="text-xs font-medium text-muted-foreground transition-all duration-200 min-h-[20px]">
            {status}
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full space-y-2 pt-1">
          <div className="w-full bg-muted/70 rounded-full h-2.5 overflow-hidden border border-border/70 p-[1.5px] relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-primary to-amber-400 transition-all duration-300 ease-out shadow-xs"
              style={{ width: `${Math.max(10, Math.min(100, progress))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono px-0.5">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Securing Credentials</span>
            </span>
            <span className="font-bold text-foreground">{progress}%</span>
          </div>
        </div>

        {/* Step Micro Indicators */}
        <div className="w-full grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-medium border-t border-border/50">
          <div
            className={`flex items-center justify-center gap-1 py-1 rounded-lg transition-colors ${
              progress >= 20 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground'
            }`}
          >
            <CheckCircle2 className={`w-3 h-3 ${progress >= 20 ? 'opacity-100' : 'opacity-40'}`} />
            <span>Tokens</span>
          </div>
          <div
            className={`flex items-center justify-center gap-1 py-1 rounded-lg transition-colors ${
              progress >= 60 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground'
            }`}
          >
            <CheckCircle2 className={`w-3 h-3 ${progress >= 60 ? 'opacity-100' : 'opacity-40'}`} />
            <span>Session</span>
          </div>
          <div
            className={`flex items-center justify-center gap-1 py-1 rounded-lg transition-colors ${
              progress >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground'
            }`}
          >
            <CheckCircle2 className={`w-3 h-3 ${progress >= 100 ? 'opacity-100' : 'opacity-40'}`} />
            <span>Redirect</span>
          </div>
        </div>
      </div>
    </div>
  );
}
