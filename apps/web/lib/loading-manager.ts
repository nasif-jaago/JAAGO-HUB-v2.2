/**
 * Universal Background Task & Data Loading Manager for JAAGO HUB
 * Handles ref-counted asynchronous tasks, debounce to avoid flickering,
 * and broadcasts cross-component loading events.
 */

type LoadingListener = (state: { isLoading: boolean; message: string; activeCount: number }) => void;

class LoadingManager {
  private activeTasks = new Map<string, string>(); // taskId -> message
  private listeners = new Set<LoadingListener>();
  private safetyTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isVisible = false;

  private notify() {
    const activeCount = this.activeTasks.size;
    const isLoading = activeCount > 0;
    
    // Get the most recent non-empty message or fallback
    let message = 'Loading JAAGO Hub...';
    for (const msg of Array.from(this.activeTasks.values()).reverse()) {
      if (msg && msg.trim()) {
        message = msg;
        break;
      }
    }

    if (isLoading) {
      // Clear previous safety timer
      if (this.safetyTimer) clearTimeout(this.safetyTimer);
      
      // Auto-dismiss after 15 seconds if any background task hangs
      this.safetyTimer = setTimeout(() => {
        if (this.activeTasks.size > 0) {
          console.warn('[LoadingManager] Safety timeout reached (15s). Clearing active tasks.');
          this.activeTasks.clear();
          this.notify();
        }
      }, 15000);

      // Debounce appearance by 100ms so lightning-fast operations don't flash
      if (!this.isVisible && !this.debounceTimer) {
        this.debounceTimer = setTimeout(() => {
          this.isVisible = true;
          this.debounceTimer = null;
          this.broadcast(true, message, activeCount);
        }, 100);
      } else if (this.isVisible) {
        this.broadcast(true, message, activeCount);
      }
    } else {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      if (this.safetyTimer) {
        clearTimeout(this.safetyTimer);
        this.safetyTimer = null;
      }
      this.isVisible = false;
      this.broadcast(false, '', 0);
    }
  }

  private broadcast(isLoading: boolean, message: string, activeCount: number) {
    const payload = { isLoading, message, activeCount };
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('[LoadingManager] Listener error:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('jaago:loading_changed', { detail: payload })
      );
    }
  }

  /**
   * Start a loading task with an optional descriptive message.
   */
  public start(taskId: string, message?: string): void {
    const displayMsg = message || 'Processing background data...';
    this.activeTasks.set(taskId, displayMsg);
    this.notify();
  }

  /**
   * Stop a specific loading task.
   */
  public stop(taskId: string): void {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      this.notify();
    }
  }

  /**
   * Clear all loading tasks immediately.
   */
  public clear(): void {
    this.activeTasks.clear();
    this.notify();
  }

  /**
   * Wrap an async promise with automatic task start/stop and message handling.
   */
  public async wrap<T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    message?: string,
    taskId?: string
  ): Promise<T> {
    const id = taskId || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.start(id, message);
    try {
      if (typeof promiseOrFn === 'function') {
        return await promiseOrFn();
      }
      return await promiseOrFn;
    } finally {
      this.stop(id);
    }
  }

  /**
   * Subscribe to loading state updates. Returns unsubscribe function.
   */
  public subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener);
    // Initial call
    const activeCount = this.activeTasks.size;
    listener({
      isLoading: this.isVisible && activeCount > 0,
      message: 'Loading JAAGO Hub...',
      activeCount,
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot() {
    const activeCount = this.activeTasks.size;
    let message = 'Loading JAAGO Hub...';
    for (const msg of Array.from(this.activeTasks.values()).reverse()) {
      if (msg && msg.trim()) {
        message = msg;
        break;
      }
    }
    return {
      isLoading: this.isVisible && activeCount > 0,
      message,
      activeCount,
    };
  }
}

// Global Singleton Instance
export const loadingManager = new LoadingManager();

// Browser Global Event Listeners for seamless integration with vanilla JS & scripts
if (typeof window !== 'undefined') {
  window.addEventListener('jaago_start_loading', (e: Event) => {
    const custom = e as CustomEvent;
    const msg = custom?.detail?.message || 'Processing background task...';
    const id = custom?.detail?.id || `event_${Date.now()}`;
    loadingManager.start(id, msg);
  });

  window.addEventListener('jaago_stop_loading', (e: Event) => {
    const custom = e as CustomEvent;
    if (custom?.detail?.id) {
      loadingManager.stop(custom.detail.id);
    } else {
      loadingManager.clear();
    }
  });
}
