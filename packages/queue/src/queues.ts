import { BaseJobPayload } from './jobs';
import { logger } from '@jaago/logger';

export type StandardQueueName = 'email' | 'reports' | 'notifications' | 'webhooks' | 'ai-tasks';

export interface EnqueueOptions {
  priority?: number;
  delayMs?: number;
  attempts?: number; // Default 3
  backoffDelayMs?: number; // Default 1000
  idempotencyKey?: string | undefined;
}

export interface EnqueuedJobResult {
  jobId: string;
  queueName: StandardQueueName;
  jobName: string;
  enqueuedAt: string;
  duplicateSuppressed?: boolean;
}

export class QueueProducerManager {
  private inMemoryQueue = new Map<string, Array<{ id: string; name: string; data: unknown }>>();
  private seenIdempotencyKeys = new Set<string>();

  public async enqueue<T extends BaseJobPayload>(
    queueName: StandardQueueName,
    jobName: string,
    payload: T,
    options?: EnqueueOptions,
  ): Promise<EnqueuedJobResult> {
    const idempotencyKey = options?.idempotencyKey || payload.idempotencyKey;

    // Idempotency deduplication check
    if (idempotencyKey) {
      const fullKey = `${queueName}:${idempotencyKey}`;
      if (this.seenIdempotencyKeys.has(fullKey)) {
        logger.info('SYSTEM', 'queue.job_duplicate_suppressed', {
          traceId: payload.traceId,
          organizationId: payload.organizationId,
          metadata: { queueName, jobName, idempotencyKey },
        });

        return {
          jobId: `dup_${idempotencyKey}`,
          queueName,
          jobName,
          enqueuedAt: new Date().toISOString(),
          duplicateSuppressed: true,
        };
      }
      this.seenIdempotencyKeys.add(fullKey);
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!this.inMemoryQueue.has(queueName)) {
      this.inMemoryQueue.set(queueName, []);
    }

    this.inMemoryQueue.get(queueName)!.push({
      id: jobId,
      name: jobName,
      data: payload,
    });

    logger.info('SYSTEM', 'queue.job_enqueued', {
      traceId: payload.traceId,
      organizationId: payload.organizationId,
      metadata: {
        jobId,
        queueName,
        jobName,
        attempts: options?.attempts || 3,
      },
    });

    return {
      jobId,
      queueName,
      jobName,
      enqueuedAt: new Date().toISOString(),
    };
  }

  public getQueueLength(queueName: StandardQueueName): number {
    return this.inMemoryQueue.get(queueName)?.length || 0;
  }

  public clearQueue(queueName: StandardQueueName): void {
    this.inMemoryQueue.delete(queueName);
  }
}

export const globalQueueProducer = new QueueProducerManager();
