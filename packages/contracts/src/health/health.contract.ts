import { z } from 'zod';

export const HealthLiveResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  uptime: z.number(),
});

export type HealthLiveResponse = z.infer<typeof HealthLiveResponseSchema>;

export const ComponentHealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
export type ComponentHealthStatus = z.infer<typeof ComponentHealthStatusSchema>;

export const ComponentCheckSchema = z.object({
  status: ComponentHealthStatusSchema,
  latencyMs: z.number().optional(),
  message: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export type ComponentCheck = z.infer<typeof ComponentCheckSchema>;

export const HealthReadyResponseSchema = z.object({
  status: ComponentHealthStatusSchema,
  timestamp: z.string(),
  traceId: z.string(),
  version: z.string(),
  checks: z.record(ComponentCheckSchema),
});

export type HealthReadyResponse = z.infer<typeof HealthReadyResponseSchema>;
