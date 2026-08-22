import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';

export interface SpoolConfig {
  spoolDir: string;
  maxFileSizeBytes?: number; // Default: 5MB
  maxTotalSpoolBytes?: number; // Default: 500MB
  rotationIntervalMs?: number; // Default: 30 seconds
}

export class LogSpooler {
  private spoolDir: string;
  private maxFileSizeBytes: number;
  private maxTotalSpoolBytes: number;
  private currentOpenFilePath: string | null = null;
  private currentFileSize = 0;
  private writeStream: fs.WriteStream | null = null;

  constructor(config?: Partial<SpoolConfig>) {
    this.spoolDir =
      config?.spoolDir ||
      process.env['LOG_SPOOL_DIR'] ||
      path.resolve(process.cwd(), 'scratch', 'log-spool');
    this.maxFileSizeBytes = config?.maxFileSizeBytes || 5 * 1024 * 1024; // 5MB
    this.maxTotalSpoolBytes = config?.maxTotalSpoolBytes || 500 * 1024 * 1024; // 500MB

    this.ensureSpoolDir();
  }

  public getSpoolDir(): string {
    return this.spoolDir;
  }

  private ensureSpoolDir(): void {
    if (!fs.existsSync(this.spoolDir)) {
      fs.mkdirSync(this.spoolDir, { recursive: true });
    }
  }

  public async writeEvent(event: unknown): Promise<void> {
    const line = JSON.stringify(event) + '\n';
    const lineBytes = Buffer.byteLength(line, 'utf8');

    if (!this.writeStream || this.currentFileSize + lineBytes > this.maxFileSizeBytes) {
      await this.rotateCurrentFile();
    }

    if (!this.writeStream) {
      this.openNewFile();
    }

    this.writeStream!.write(line);
    this.currentFileSize += lineBytes;
  }

  private openNewFile(): void {
    this.ensureSpoolDir();
    const timestamp = Date.now();
    const pid = process.pid;
    const filename = `${timestamp}_${pid}.open.ndjson`;
    this.currentOpenFilePath = path.join(this.spoolDir, filename);
    this.writeStream = fs.createWriteStream(this.currentOpenFilePath, { flags: 'a' });
    this.currentFileSize = 0;
  }

  public async rotateCurrentFile(): Promise<string | null> {
    if (!this.writeStream || !this.currentOpenFilePath) {
      return null;
    }

    const openPath = this.currentOpenFilePath;
    const readyPathGz = openPath.replace('.open.ndjson', '.ready.ndjson.gz');

    await new Promise<void>((resolve) => {
      this.writeStream!.end(resolve);
    });

    this.writeStream = null;
    this.currentOpenFilePath = null;
    this.currentFileSize = 0;

    if (fs.existsSync(openPath) && fs.statSync(openPath).size > 0) {
      // Gzip compress the ndjson into .ready.ndjson.gz
      const source = fs.createReadStream(openPath);
      const destination = fs.createWriteStream(readyPathGz);
      const gzip = zlib.createGzip();

      await pipeline(source, gzip, destination);
      fs.unlinkSync(openPath); // Remove original uncompressed file
      this.enforceDiskSafety();
      return readyPathGz;
    } else if (fs.existsSync(openPath)) {
      fs.unlinkSync(openPath); // Remove empty file
    }

    return null;
  }

  public enforceDiskSafety(): number {
    this.ensureSpoolDir();
    const files = fs.readdirSync(this.spoolDir).map((name) => {
      const fullPath = path.join(this.spoolDir, name);
      const stats = fs.statSync(fullPath);
      return { name, path: fullPath, size: stats.size, mtime: stats.mtimeMs };
    });

    let totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    let deletedCount = 0;

    // If total exceeds max allowable spool size, remove oldest non-open files
    if (totalBytes > this.maxTotalSpoolBytes) {
      const candidates = files
        .filter((f) => !f.name.endsWith('.open.ndjson'))
        .sort((a, b) => a.mtime - b.mtime); // Oldest first

      for (const file of candidates) {
        if (totalBytes <= this.maxTotalSpoolBytes) break;
        try {
          fs.unlinkSync(file.path);
          totalBytes -= file.size;
          deletedCount++;
        } catch {
          // Ignore
        }
      }
    }

    return deletedCount;
  }

  public static listReadyFiles(spoolDir: string): string[] {
    if (!fs.existsSync(spoolDir)) {
      return [];
    }

    return fs
      .readdirSync(spoolDir)
      .filter((name) => name.endsWith('.ready.ndjson.gz'))
      .map((name) => path.join(spoolDir, name))
      .sort(); // Process in chronological order
  }

  public static async markUploading(readyGzPath: string): Promise<string> {
    const uploadingPath = readyGzPath.replace('.ready.ndjson.gz', '.uploading.ndjson.gz');
    fs.renameSync(readyGzPath, uploadingPath);
    return uploadingPath;
  }

  public static async readAndDecompress(uploadingGzPath: string): Promise<unknown[]> {
    const buffer = fs.readFileSync(uploadingGzPath);
    const decompressed = zlib.gunzipSync(buffer).toString('utf8');

    const lines = decompressed.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line) => JSON.parse(line));
  }

  public static deleteSpoolFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
