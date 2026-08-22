import { globalStorageService } from '@jaago/storage';
import { logger } from '@jaago/logger';

export interface ExportColumnDef<T> {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => string | number | boolean | null | undefined;
}

export class ExportEngine {
  /**
   * Formats structured data rows into RFC 4180 compliant CSV string
   */
  public static generateCsv<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumnDef<T>[],
  ): string {
    const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const val = c.accessor ? c.accessor(row) : row[c.key as keyof T];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'number' || typeof val === 'boolean') return String(val);
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(','),
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Generates a tracked export job with short-lived signed URL
   */
  public static async createAsyncExport<T extends Record<string, unknown>>(params: {
    entityType: string;
    format: 'csv' | 'xlsx' | 'pdf';
    data: T[];
    columns: ExportColumnDef<T>[];
    requestedBy: string;
    organizationId: string;
  }): Promise<{
    jobId: string;
    status: string;
    downloadUrl: string;
    rowCount: number;
    expiresAt: string;
  }> {
    const csvContent = this.generateCsv(params.data, params.columns);
    const buffer = Buffer.from(csvContent, 'utf8');
    const objectKey = `exports/${params.organizationId}/${params.entityType}_${Date.now()}.csv`;

    // Store in storage subsystem
    globalStorageService.scanAndStore(
      'exports',
      objectKey,
      `${params.entityType}_export.csv`,
      'text/csv',
      buffer,
    );

    // 15-minute signed URL
    const downloadUrl = globalStorageService.generateSignedUrl('exports', objectKey, 900);
    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
    const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    logger.info('AUDIT', 'export.job_created', {
      organizationId: params.organizationId,
      metadata: {
        jobId,
        entityType: params.entityType,
        rowCount: params.data.length,
        requestedBy: params.requestedBy,
      },
    });

    return {
      jobId,
      status: 'completed',
      downloadUrl,
      rowCount: params.data.length,
      expiresAt,
    };
  }
}
