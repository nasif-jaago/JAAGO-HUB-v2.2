import { logger } from '@jaago/logger';
import { EmailJobPayload, ReportJobPayload, NotificationJobPayload } from '@jaago/queue';
import { runAutoCheckoutJob, AutoCheckoutJobResult } from './jobs/auto-checkout';
import { runAbsenceEvaluationJob, AbsenceEvaluationResult } from './jobs/absence-evaluation';

export class BackgroundWorkerService {
  private isRunning = false;
  private activeJobsCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private lastAutoCheckoutDate: string | null = null;

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('SYSTEM', 'worker.engine.started', {
      service: 'worker',
      metadata: {
        queues: ['email', 'reports', 'notifications', 'webhooks', 'ai-tasks', 'attendance-auto-checkout', 'attendance-absence'],
        concurrency: 5,
      },
    });

    // Periodic heartbeat to keep daemon active
    this.heartbeatTimer = setInterval(() => {
      // Background worker active
    }, 5000);

    // Automated recurring scheduler for 11:30 PM (23:30 Asia/Dhaka) auto-checkout & absence evaluation
    this.schedulerTimer = setInterval(async () => {
      try {
        const now = new Date();
        const dhakaTimeStr = now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Dhaka',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
        const dhakaDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);

        const parts = dhakaTimeStr.split(':').map(Number);
        const hours = parts[0] ?? 0;
        const minutes = parts[1] ?? 0;
        // Trigger at 23:30 or later if not yet executed today
        if ((hours === 23 && minutes >= 30) || hours > 23) {
          if (this.lastAutoCheckoutDate !== dhakaDateStr) {
            this.lastAutoCheckoutDate = dhakaDateStr;
            logger.info('SYSTEM', 'scheduler.daily_cutoff.triggered', {
              service: 'worker',
              metadata: { dhakaDateStr, dhakaTimeStr },
            });
            await this.processAutoCheckout(dhakaDateStr);
            await this.processAbsenceEvaluation(dhakaDateStr);
          }
        }
      } catch (err: any) {
        logger.error('SYSTEM', 'scheduler.tick_error', {
          service: 'worker',
          error: err.message,
        });
      }
    }, 60000);
  }

  public async processAutoCheckout(targetDate?: string): Promise<AutoCheckoutJobResult> {
    this.activeJobsCount++;
    try {
      return await runAutoCheckoutJob(targetDate);
    } finally {
      this.activeJobsCount--;
    }
  }

  public async processAbsenceEvaluation(targetDate?: string): Promise<AbsenceEvaluationResult> {
    this.activeJobsCount++;
    try {
      return await runAbsenceEvaluationJob(targetDate);
    } finally {
      this.activeJobsCount--;
    }
  }

  public async processEmailJob(jobId: string, payload: EmailJobPayload): Promise<void> {
    this.activeJobsCount++;
    logger.info('SYSTEM', 'job.started', {
      traceId: payload.traceId,
      organizationId: payload.organizationId,
      service: 'worker',
      metadata: { queue: 'email', jobId, to: payload.to, subject: payload.subject },
    });

    try {
      // Simulate email sending
      await new Promise((r) => setTimeout(r, 50));

      logger.info('SYSTEM', 'job.completed', {
        traceId: payload.traceId,
        organizationId: payload.organizationId,
        service: 'worker',
        metadata: { queue: 'email', jobId },
      });
    } finally {
      this.activeJobsCount--;
    }
  }

  public async processReportJob(jobId: string, payload: ReportJobPayload): Promise<void> {
    this.activeJobsCount++;
    logger.info('SYSTEM', 'job.started', {
      traceId: payload.traceId,
      organizationId: payload.organizationId,
      service: 'worker',
      metadata: { queue: 'reports', jobId, type: payload.reportType, format: payload.format },
    });

    try {
      // Simulate report generation
      await new Promise((r) => setTimeout(r, 100));

      logger.info('SYSTEM', 'job.completed', {
        traceId: payload.traceId,
        organizationId: payload.organizationId,
        service: 'worker',
        metadata: { queue: 'reports', jobId },
      });
    } finally {
      this.activeJobsCount--;
    }
  }

  public async processNotificationJob(jobId: string, payload: NotificationJobPayload): Promise<void> {
    this.activeJobsCount++;
    logger.info('SYSTEM', 'job.started', {
      traceId: payload.traceId,
      organizationId: payload.organizationId,
      service: 'worker',
      metadata: { queue: 'notifications', jobId, recipient: payload.recipientUserId },
    });

    try {
      // Simulate push notification dispatch
      await new Promise((r) => setTimeout(r, 30));

      logger.info('SYSTEM', 'job.completed', {
        traceId: payload.traceId,
        organizationId: payload.organizationId,
        service: 'worker',
        metadata: { queue: 'notifications', jobId },
      });
    } finally {
      this.activeJobsCount--;
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    logger.info('SYSTEM', 'worker.engine.stopping', {
      service: 'worker',
      metadata: { inFlightJobs: this.activeJobsCount },
    });

    // Wait briefly for in-flight tasks
    let waitCount = 0;
    while (this.activeJobsCount > 0 && waitCount < 10) {
      await new Promise((r) => setTimeout(r, 100));
      waitCount++;
    }

    logger.info('SYSTEM', 'worker.engine.stopped', {
      service: 'worker',
    });
  }
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  const worker = new BackgroundWorkerService();
  worker.start();

  const shutdown = async () => {
    console.log('\n[Worker Service] Stopping worker service...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
