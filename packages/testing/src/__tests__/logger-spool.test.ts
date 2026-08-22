import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LogSpooler } from '@jaago/logger';

describe('Logger Bounded Disk Spool & Compression Pipeline Suite', () => {
  const testSpoolDir = path.resolve(process.cwd(), 'scratch', 'test-spool-pipeline');

  before(() => {
    if (!fs.existsSync(testSpoolDir)) {
      fs.mkdirSync(testSpoolDir, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(testSpoolDir)) {
      fs.rmSync(testSpoolDir, { recursive: true, force: true });
    }
  });

  it('writes log events into .open.ndjson and rotates to compressed .ready.ndjson.gz', async () => {
    const spooler = new LogSpooler({
      spoolDir: testSpoolDir,
      maxFileSizeBytes: 1024 * 1024,
    });

    const mockEvent = {
      eventId: 'evt-001',
      level: 'info',
      action: 'user.signin.success',
      traceId: 'tr-001',
      timestamp: new Date().toISOString(),
    };

    await spooler.writeEvent(mockEvent);
    await spooler.writeEvent({ ...mockEvent, eventId: 'evt-002' });

    // Rotate and compress
    const readyGzPath = await spooler.rotateCurrentFile();
    assert.ok(readyGzPath);
    assert.ok(readyGzPath.endsWith('.ready.ndjson.gz'));
    assert.ok(fs.existsSync(readyGzPath));

    // Test listReadyFiles
    const readyList = LogSpooler.listReadyFiles(testSpoolDir);
    assert.equal(readyList.length, 1);
    assert.equal(readyList[0], readyGzPath);

    // Test markUploading
    const uploadingPath = await LogSpooler.markUploading(readyGzPath);
    assert.ok(uploadingPath.endsWith('.uploading.ndjson.gz'));
    assert.ok(!fs.existsSync(readyGzPath));
    assert.ok(fs.existsSync(uploadingPath));

    // Test readAndDecompress
    const decompressed = await LogSpooler.readAndDecompress(uploadingPath);
    assert.equal(decompressed.length, 2);
    assert.equal((decompressed[0] as any).eventId, 'evt-001');
    assert.equal((decompressed[1] as any).eventId, 'evt-002');

    // Test cleanup
    LogSpooler.deleteSpoolFile(uploadingPath);
    assert.ok(!fs.existsSync(uploadingPath));
  });

  it('enforces disk safety cap by pruning oldest non-open files when threshold exceeded', () => {
    const safetySpoolDir = path.join(testSpoolDir, 'safety-test');
    fs.mkdirSync(safetySpoolDir, { recursive: true });

    // Create 3 dummy files
    const file1 = path.join(safetySpoolDir, '1000_1.ready.ndjson.gz');
    const file2 = path.join(safetySpoolDir, '2000_1.ready.ndjson.gz');
    const file3 = path.join(safetySpoolDir, '3000_1.ready.ndjson.gz');

    fs.writeFileSync(file1, Buffer.alloc(100));
    fs.writeFileSync(file2, Buffer.alloc(100));
    fs.writeFileSync(file3, Buffer.alloc(100));

    // Spooler with 150 bytes total capacity
    const spooler = new LogSpooler({
      spoolDir: safetySpoolDir,
      maxTotalSpoolBytes: 150,
    });

    const deletedCount = spooler.enforceDiskSafety();
    assert.ok(deletedCount >= 2); // Should delete oldest 2 files to stay under 150 bytes
    assert.ok(!fs.existsSync(file1));
    assert.ok(!fs.existsSync(file2));
    assert.ok(fs.existsSync(file3));

    fs.rmSync(safetySpoolDir, { recursive: true, force: true });
  });
});
