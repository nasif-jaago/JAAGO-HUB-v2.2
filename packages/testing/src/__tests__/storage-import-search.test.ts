import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from '@jaago/storage';
import { CsvImportPipeline, ExportEngine } from '@jaago/importexport';
import { PermissionAwareSearchEngine } from '@jaago/search';

describe('Documents, Import/Export, Reporting & Search Suite', () => {
  it('generates verifiable signed URLs and rejects expired/tampered tokens', () => {
    const storage = new StorageService('test-secret-key-123');

    const validUrl = storage.generateSignedUrl('attachments', 'receipts/rc-001.pdf', 300);
    const verifyResult = storage.verifySignedUrl(validUrl);
    assert.equal(verifyResult.valid, true);

    // Tampered signature
    const tamperedUrl = validUrl.replace(/sig=[a-f0-9]{4}/, 'sig=ffff');
    assert.equal(storage.verifySignedUrl(tamperedUrl).valid, false);

    // Expired URL (-10 seconds)
    const expiredUrl = storage.generateSignedUrl('attachments', 'receipts/rc-001.pdf', -10);
    const expiredResult = storage.verifySignedUrl(expiredUrl);
    assert.equal(expiredResult.valid, false);
    assert.equal(expiredResult.reason, 'Signed URL has expired');
  });

  it('scans uploaded file buffers and quarantines malware/EICAR payloads', () => {
    const storage = new StorageService();

    // Clean file
    const cleanBuffer = Buffer.from('Official JAAGO Foundation Financial Audit 2026', 'utf8');
    const cleanMeta = storage.scanAndStore('reports', 'audit-2026.txt', 'audit-2026.txt', 'text/plain', cleanBuffer);
    assert.equal(cleanMeta.scanStatus, 'clean');
    assert.equal(cleanMeta.isQuarantined, false);
    assert.ok(storage.getObject('reports', 'audit-2026.txt'));

    // Malicious file containing EICAR test string
    const malwareBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!', 'utf8');
    const malwareMeta = storage.scanAndStore('attachments', 'infected.exe', 'infected.exe', 'application/octet-stream', malwareBuffer);
    assert.equal(malwareMeta.scanStatus, 'infected');
    assert.equal(malwareMeta.isQuarantined, true);
    assert.equal(storage.getObject('attachments', 'infected.exe'), undefined); // Quarantined file is not accessible
  });

  it('validates CSV imports, collects line-by-line errors, and chunks ingestion', async () => {
    const csvContent = `
name,email,branch
Nasif Kamal,nasif@jaago.com.bd,Banani
Invalid User,not-an-email,Rayer Bazar
Farhana Ahmed,farhana@jaago.com.bd,Banani
    `.trim();

    const validation = CsvImportPipeline.parseAndValidate<{ name: string; email: string; branch: string }>(
      csvContent,
      (record) => {
        if (!record['email'] || !record['email'].includes('@')) {
          return { valid: false, error: 'Invalid email address format' };
        }
        return {
          valid: true,
          data: {
            name: record['name']!,
            email: record['email']!,
            branch: record['branch']!,
          },
        };
      },
    );

    assert.equal(validation.totalRows, 3);
    assert.equal(validation.validRows.length, 2);
    assert.equal(validation.errors.length, 1);
    assert.equal(validation.errors[0]?.rowNumber, 3);
    assert.equal(validation.isValid, false);

    // Test chunked processing of valid rows
    let processedBatches = 0;
    const chunkResult = await CsvImportPipeline.executeChunked(validation.validRows, 1, async (chunk) => {
      processedBatches++;
      assert.equal(chunk.length, 1);
    });

    assert.equal(chunkResult.rowsProcessed, 2);
    assert.equal(chunkResult.chunksProcessed, 2);
  });

  it('generates standard RFC 4180 CSV exports with quotation escaping', () => {
    const data = [
      { id: '1', name: 'Nasif Kamal', notes: 'Founder & CEO, "JAAGO"' },
      { id: '2', name: 'Habibur Rahman', notes: 'Campus Principal' },
    ];

    const csv = ExportEngine.generateCsv(data, [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Staff Name' },
      { key: 'notes', header: 'Remarks' },
    ]);

    assert.ok(csv.includes('"ID","Staff Name","Remarks"'));
    assert.ok(csv.includes('"Founder & CEO, ""JAAGO"""'));
  });

  it('strictly isolates search results by tenant and enforces RBAC permission requirements', () => {
    const searchEngine = new PermissionAwareSearchEngine();

    searchEngine.indexDocuments([
      {
        id: 'doc-org1-hr',
        entityType: 'workflow',
        title: 'Org 1 HR Payroll Requisition',
        snippet: 'Internal confidential payroll for Org 1',
        url: '/workflows/1',
        organizationId: 'org-tenant-1',
        requiredPermission: 'hr.view',
      },
      {
        id: 'doc-org2-hr',
        entityType: 'workflow',
        title: 'Org 2 HR Payroll Requisition',
        snippet: 'Internal confidential payroll for Org 2',
        url: '/workflows/2',
        organizationId: 'org-tenant-2',
        requiredPermission: 'hr.view',
      },
    ]);

    // User in Org 1 with hr.view
    const userSessionOrg1 = {
      userId: 'usr-1',
      email: 'u1@example.com',
      organizationId: 'org-tenant-1',
      roles: ['hr_manager'],
      permissions: ['hr.*'],
      isSuperAdmin: false,
      mfaVerified: true,
    };

    const results = searchEngine.search('Payroll', userSessionOrg1);
    assert.equal(results.length, 1);
    assert.equal(results[0]?.id, 'doc-org1-hr'); // Org 2 result is strictly hidden!

    // User in Org 1 WITHOUT hr.view
    const restrictedUserOrg1 = {
      ...userSessionOrg1,
      permissions: ['volunteer.view'],
    };
    const restrictedResults = searchEngine.search('Payroll', restrictedUserOrg1);
    assert.equal(restrictedResults.length, 0); // Filtered out by RBAC requirement
  });
});
