export interface ImportValidationResult<T> {
  totalRows: number;
  validRows: T[];
  errors: Array<{ rowNumber: number; raw: string; error: string }>;
  isValid: boolean;
}

export class CsvImportPipeline {
  /**
   * Parses CSV lines and runs a row validator function against each record
   */
  public static parseAndValidate<T>(
    csvContent: string,
    validator: (record: Record<string, string>, rowNumber: number) => { valid: boolean; data?: T; error?: string },
  ): ImportValidationResult<T> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      return { totalRows: 0, validRows: [], errors: [], isValid: true };
    }

    const headerLine = lines[0]!;
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const dataLines = lines.slice(1);

    const validRows: T[] = [];
    const errors: Array<{ rowNumber: number; raw: string; error: string }> = [];

    dataLines.forEach((line, idx) => {
      const rowNumber = idx + 2; // 1-indexed including header
      const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));

      if (values.length !== headers.length) {
        errors.push({
          rowNumber,
          raw: line,
          error: `Column count mismatch (expected ${headers.length}, found ${values.length})`,
        });
        return;
      }

      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = values[i] || '';
      });

      const validation = validator(record, rowNumber);
      if (validation.valid && validation.data) {
        validRows.push(validation.data);
      } else {
        errors.push({
          rowNumber,
          raw: line,
          error: validation.error || 'Schema validation failure',
        });
      }
    });

    return {
      totalRows: dataLines.length,
      validRows,
      errors,
      isValid: errors.length === 0,
    };
  }

  /**
   * Processes validated rows in transactional chunks
   */
  public static async executeChunked<T>(
    rows: T[],
    chunkSize = 100,
    processor: (chunk: T[], chunkIndex: number) => Promise<void>,
  ): Promise<{ chunksProcessed: number; rowsProcessed: number }> {
    let chunksProcessed = 0;
    let rowsProcessed = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await processor(chunk, chunksProcessed);
      chunksProcessed++;
      rowsProcessed += chunk.length;
    }

    return { chunksProcessed, rowsProcessed };
  }
}
