import { z } from 'zod';
import { ErrorCodeType } from './error-codes';

export const ApiErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  traceId: z.string(),
  details: z.unknown().optional(),
});

export const ApiErrorEnvelopeSchema = z.object({
  error: ApiErrorDetailSchema,
});

export type ApiErrorDetail = {
  code: ErrorCodeType | string;
  message: string;
  traceId: string;
  details?: unknown;
};

export type ApiErrorEnvelope = {
  error: ApiErrorDetail;
};

export function createErrorEnvelope(
  code: ErrorCodeType | string,
  message: string,
  traceId: string,
  details?: unknown,
): ApiErrorEnvelope {
  return {
    error: {
      code,
      message,
      traceId,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
