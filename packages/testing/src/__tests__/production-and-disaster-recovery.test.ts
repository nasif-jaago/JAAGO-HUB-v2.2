import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BackupRestoreEngine } from '@jaago/storage';

const findWorkspaceRoot = (): string => {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (existsSync(resolve(cur, 'pnpm-workspace.yaml'))) {
      return cur;
    }
    cur = resolve(cur, '..');
  }
  return process.cwd();
};

const root = findWorkspaceRoot();

describe('Production Deployment & Disaster Recovery Suite', () => {
  it('creates AES-256-GCM encrypted backup package with tamper-evident SHA-256 manifest', () => {
    const tables = {
      users: [{ id: 'u1', email: 'admin@jaago.com.bd' }],
      hr_employees: [{ id: 'e1', fullName: 'Nasif Kamal' }],
      account_chart_of_accounts: [{ code: '1010', name: 'BRAC Bank' }],
    };

    const pkg = BackupRestoreEngine.createEncryptedBackup(
      '11111111-1111-4111-a111-111111111111',
      tables,
      12,
    );

    assert.ok(pkg.archiveName.includes('jaago_backup_'));
    assert.equal(pkg.ivHex.length, 24); // 12 bytes = 24 hex chars
    assert.equal(pkg.authTagHex.length, 32); // 16 bytes = 32 hex chars
    assert.ok(pkg.ciphertextHex.length > 50);
    assert.equal(pkg.checksumSha256.length, 64);
  });

  it('successfully executes disaster recovery restore drill and decrypts database state', () => {
    const tables = {
      users: [{ id: 'u1', email: 'admin@jaago.com.bd' }],
      hr_employees: [{ id: 'e1', fullName: 'Nasif Kamal' }],
    };

    const pkg = BackupRestoreEngine.createEncryptedBackup('org-dhaka-01', tables, 5);

    const drillResult = BackupRestoreEngine.verifyAndRestoreDrill(pkg);

    assert.equal(drillResult.valid, true);
    assert.equal(drillResult.tablesRestored, 2);
    assert.equal(drillResult.manifest?.organizationId, 'org-dhaka-01');
    assert.equal(drillResult.manifest?.storageObjectsCount, 5);
  });

  it('validates production Systemd service definitions and environment file isolation', () => {
    const webServicePath = resolve(root, 'ops', 'systemd', 'jaago-web.service');
    const workerServicePath = resolve(root, 'ops', 'systemd', 'jaago-worker.service');
    const logRunnerServicePath = resolve(root, 'ops', 'systemd', 'jaago-log-runner.service');

    assert.ok(existsSync(webServicePath), `jaago-web.service must exist at ${webServicePath}`);
    assert.ok(existsSync(workerServicePath), `jaago-worker.service must exist at ${workerServicePath}`);
    assert.ok(existsSync(logRunnerServicePath), `jaago-log-runner.service must exist at ${logRunnerServicePath}`);

    const webContent = readFileSync(webServicePath, 'utf8');
    assert.ok(webContent.includes('EnvironmentFile=/etc/jaago-hub/web.env'));
    assert.ok(webContent.includes('User=jaago'));
    assert.ok(webContent.includes('LimitNOFILE=65536'));

    const workerContent = readFileSync(workerServicePath, 'utf8');
    assert.ok(workerContent.includes('EnvironmentFile=/etc/jaago-hub/worker.env'));

    const logRunnerContent = readFileSync(logRunnerServicePath, 'utf8');
    assert.ok(logRunnerContent.includes('EnvironmentFile=/etc/jaago-hub/log-runner.env'));
  });

  it('validates production Nginx configuration for TLS, rate limiting, and security headers', () => {
    const nginxConfPath = resolve(root, 'ops', 'nginx', 'jaago-hub.conf');
    assert.ok(existsSync(nginxConfPath), `ops/nginx/jaago-hub.conf must exist at ${nginxConfPath}`);

    const nginxConf = readFileSync(nginxConfPath, 'utf8');
    assert.ok(nginxConf.includes('limit_req_zone $binary_remote_addr zone=jaago_auth_limit'));
    assert.ok(nginxConf.includes('limit_req_zone $binary_remote_addr zone=jaago_api_limit'));
    assert.ok(nginxConf.includes('Strict-Transport-Security'));
    assert.ok(nginxConf.includes('X-Frame-Options "DENY"'));
    assert.ok(nginxConf.includes('location ~ ^/health/(live|ready)$'));
  });
});
