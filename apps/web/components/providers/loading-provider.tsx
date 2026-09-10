'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { loadingManager } from '@/lib/loading-manager';
import { JaagoLoadingOverlay } from '@/components/ui/jaago-loading-overlay';

interface LoadingContextValue {
  isLoading: boolean;
  message: string;
  activeCount: number;
  startLoading: (taskId: string, message?: string) => void;
  stopLoading: (taskId: string) => void;
  withLoading: <T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    message?: string,
    taskId?: string
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  message: 'Loading JAAGO Hub...',
  activeCount: 0,
  startLoading: () => {},
  stopLoading: () => {},
  withLoading: async (fn) => (typeof fn === 'function' ? await fn() : await fn),
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => loadingManager.getSnapshot());

  useEffect(() => {
    const unsubscribe = loadingManager.subscribe((nextState) => {
      setState(nextState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading: state.isLoading,
      message: state.message,
      activeCount: state.activeCount,
      startLoading: (taskId, message) => loadingManager.start(taskId, message),
      stopLoading: (taskId) => loadingManager.stop(taskId),
      withLoading: (fn, message, taskId) => loadingManager.wrap(fn, message, taskId),
    }),
    [state.isLoading, state.message, state.activeCount]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {/* ── Global High-Performance Blur Overlay with jaago-logo-round ── */}
      <JaagoLoadingOverlay
        isVisible={state.isLoading}
        message={state.message}
        onDismiss={() => loadingManager.clear()}
      />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
