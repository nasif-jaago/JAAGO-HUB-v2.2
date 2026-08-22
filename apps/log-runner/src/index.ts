import { LogSpooler, logger } from '@jaago/logger';

export class LogRunnerDaemon {
  private isRunning = false;
  private spoolDir: string;
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private currentBackoffMs = 1000;
  private readonly maxBackoffMs = 15000;

  constructor(options?: { spoolDir?: string; intervalMs?: number }) {
    this.spoolDir =
      options?.spoolDir ||
      process.env['LOG_SPOOL_DIR'] ||
      'scratch/log-spool';
    this.intervalMs = options?.intervalMs || 2000;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('SYSTEM', 'log_runner.started', {
      service: 'log-runner',
      metadata: { spoolDir: this.spoolDir, intervalMs: this.intervalMs },
    });

    this.scheduleNextTick(100);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    logger.info('SYSTEM', 'log_runner.stopped', {
      service: 'log-runner',
    });
  }

  private scheduleNextTick(delayMs: number): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      await this.tick();
    }, delayMs);
  }

  public async tick(): Promise<number> {
    try {
      const readyFiles = LogSpooler.listReadyFiles(this.spoolDir);
      let processedCount = 0;

      for (const readyFile of readyFiles) {
        if (!this.isRunning) break;

        // 1. Atomically rename to .uploading.ndjson.gz
        const uploadingPath = await LogSpooler.markUploading(readyFile);

        try {
          // 2. Read and decompress
          const events = await LogSpooler.readAndDecompress(uploadingPath);

          // 3. Batch commit to persistent store / log
          if (events.length > 0) {
            logger.info('SYSTEM', 'log_runner.batch_uploaded', {
              service: 'log-runner',
              metadata: { file: readyFile, count: events.length },
            });
          }

          // 4. Delete uploaded file after commit
          LogSpooler.deleteSpoolFile(uploadingPath);
          processedCount += events.length;

          // Reset backoff on success
          this.currentBackoffMs = 1000;
        } catch (uploadErr) {
          logger.error('SYSTEM', 'log_runner.upload_failed', uploadErr, {
            service: 'log-runner',
            metadata: { file: uploadingPath },
          });
          // Rename back to ready or handle retry
          break;
        }
      }

      this.scheduleNextTick(this.intervalMs);
      return processedCount;
    } catch (err) {
      // Exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 500);
      const nextDelay = Math.min(this.currentBackoffMs + jitter, this.maxBackoffMs);
      this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.maxBackoffMs);

      logger.warn('SYSTEM', 'log_runner.loop_error', {
        service: 'log-runner',
        metadata: { nextRetryInMs: nextDelay },
      });

      this.scheduleNextTick(nextDelay);
      return 0;
    }
  }
}

// CLI / Daemon entry point
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  const daemon = new LogRunnerDaemon();
  daemon.start();

  const shutdown = async () => {
    console.log('\n[Log Runner] Received termination signal, shutting down...');
    await daemon.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
