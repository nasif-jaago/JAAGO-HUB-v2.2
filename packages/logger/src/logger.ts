import pino from 'pino';
import { buildLogEvent, EventType, StructuredLogEvent } from './event-builder';

const pinoInstance = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = {
  info(eventType: EventType, action: string, payload?: Partial<StructuredLogEvent>): void {
    const event = buildLogEvent('info', eventType, action, payload);
    pinoInstance.info(event, event.action);
  },

  warn(eventType: EventType, action: string, payload?: Partial<StructuredLogEvent>): void {
    const event = buildLogEvent('warn', eventType, action, payload);
    pinoInstance.warn(event, event.action);
  },

  error(eventType: EventType, action: string, error?: Error | unknown, payload?: Partial<StructuredLogEvent>): void {
    const errorDetails: Partial<StructuredLogEvent> = error instanceof Error
      ? {
          errorMessage: error.message,
          errorType: error.name,
          cause: error.stack ?? undefined,
        }
      : typeof error === 'string'
      ? { errorMessage: error }
      : {};

    const event = buildLogEvent('error', eventType, action, {
      ...payload,
      ...errorDetails,
    });
    pinoInstance.error(event, event.action);
  },

  fatal(eventType: EventType, action: string, error?: Error | unknown, payload?: Partial<StructuredLogEvent>): void {
    const errorDetails: Partial<StructuredLogEvent> = error instanceof Error
      ? {
          errorMessage: error.message,
          errorType: error.name,
          cause: error.stack ?? undefined,
        }
      : typeof error === 'string'
      ? { errorMessage: error }
      : {};

    const event = buildLogEvent('fatal', eventType, action, {
      ...payload,
      ...errorDetails,
    });
    pinoInstance.fatal(event, event.action);
  },

  debug(eventType: EventType, action: string, payload?: Partial<StructuredLogEvent>): void {
    const event = buildLogEvent('debug', eventType, action, payload);
    pinoInstance.debug(event, event.action);
  },

  audit(action: string, payload?: Partial<StructuredLogEvent>): void {
    const event = buildLogEvent('info', 'AUDIT', action, payload);
    pinoInstance.info(event, `[AUDIT] ${action}`);
  },
};

export type Logger = typeof logger;
