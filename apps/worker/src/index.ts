import { logger } from '@jaago/logger';
import { EmailJobPayload, ReportJobPayload, NotificationJobPayload } from '@jaago/queue';
import { runAutoCheckoutJob, AutoCheckoutJobResult } from './jobs/auto-checkout';
import { runAbsenceEvaluationJob, AbsenceEvaluationResult } from './jobs/absence-evaluation';

export class BackgroundWorkerService {
  private isRunning = false;
  private activeJobsCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

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
