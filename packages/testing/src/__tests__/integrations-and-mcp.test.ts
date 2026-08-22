import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SecretVault } from '@jaago/config';
import { ApiKeyManager } from '@jaago/auth';
import { GovernedMcpServer } from '@jaago/contracts';
import { BackupRestoreEngine } from '@jaago/storage';

describe('Integrations, API Management, MCP & Backup/Restore Suite', () => {
  it('encrypts secrets with AES-256-GCM and rejects tampered authentication tags', () => {
    const vault = new SecretVault('jaago-master-secret-key-32-chars-long!');

    const originalSecret = 'bkash_sec_live_948a7b1c3e5d0f2a4b6c8e0d';
    const encrypted = vault.encrypt(originalSecret);

    assert.ok(encrypted.ciphertextHex);
    assert.equal(encrypted.ivHex.length, 24); // 12 bytes = 24 hex characters
    assert.equal(encrypted.authTagHex.length, 32); // 16 bytes = 32 hex characters

    // Decrypt successfully
    const decrypted = vault.decrypt(encrypted);
    assert.equal(decrypted, originalSecret);

    // Tampered Auth Tag must fail with authentication error
    const tamperedPayload = {
      ...encrypted,
      authTagHex: '00000000000000000000000000000000',
    };
    assert.throws(() => {
      vault.decrypt(tamperedPayload);
    });
  });

  it('generates scoped client credentials and verifies access authorization', () => {
    const credentials = ApiKeyManager.generateCredentials({
      name: 'Mobile Volunteer Sync',
      environment: 'live',
      scopes: ['directory.view', 'workflow.read'],
      rateLimitTier: 'API',
    });

    assert.ok(credentials.clientId.startsWith('jg_live_'));
    assert.ok(credentials.clientSecret.startsWith('sk_live_'));
    assert.equal(credentials.scopes.length, 2);

    // Correct secret & matching scope
    const validCheck = ApiKeyManager.verifyCredentials(
      credentials.clientSecret,
      credentials.hashedSecret,
      credentials.scopes,
      'directory.view',
    );
    assert.equal(validCheck.valid, true);

    // Wrong secret
    const badSecretCheck = ApiKeyManager.verifyCredentials(
      'sk_live_wrong_secret_1234567890',
      credentials.hashedSecret,
      credentials.scopes,
      'directory.view',
    );
    assert.equal(badSecretCheck.valid, false);

    // Missing scope
    const unauthorizedScopeCheck = ApiKeyManager.verifyCredentials(
      credentials.clientSecret,
      credentials.hashedSecret,
      credentials.scopes,
      'finance.transfers.create',
    );
    assert.equal(unauthorizedScopeCheck.valid, false);
    assert.ok(unauthorizedScopeCheck.reason?.includes('Missing required scope'));
  });

  it('governs MCP tool invocation with strict RBAC permission gating', async () => {
    const mcpServer = new GovernedMcpServer();

    mcpServer.registerTool({
      name: 'approve_requisition',
      description: 'Approve financial requisition',
      parameters: { id: { type: 'string', description: 'Requisition ID', required: true } },
      requiredPermission: 'finance.approve',
      handler: async (params) => ({ status: 'approved', requisitionId: params.id }),
    });

    // Authorized context
    const authorizedContext = {
      organizationId: 'org-dhaka-01',
      userId: 'usr-cfo',
      permissions: ['finance.*'],
    };
    const execSuccess = await mcpServer.executeTool('approve_requisition', { id: 'REQ-101' }, authorizedContext);
    assert.equal(execSuccess.success, true);
    assert.equal(execSuccess.result?.status, 'approved');

    // Unauthorized context
    const unauthorizedContext = {
      organizationId: 'org-dhaka-01',
      userId: 'usr-volunteer',
      permissions: ['volunteer.view'],
    };
    const execDenied = await mcpServer.executeTool('approve_requisition', { id: 'REQ-101' }, unauthorizedContext);
    assert.equal(execDenied.success, false);
    assert.ok(execDenied.error?.includes('Missing permission "finance.approve"'));
  });

  it('creates encrypted backup archives and executes successful restore drill verification', () => {
    const orgId = 'org-dhaka-01';
    const sampleDbTables = {
      users: [{ id: 'u1', name: 'Nasif Kamal', email: 'nasif@jaago.com.bd' }],
      organizations: [{ id: orgId, name: 'JAAGO Foundation' }],
      workflow_instances: [{ id: 'wf-1', state: 'approved' }],
    };

    const backupPackage = BackupRestoreEngine.createEncryptedBackup(orgId, sampleDbTables, 5);
    assert.ok(backupPackage.archiveName.includes(orgId));
    assert.ok(backupPackage.checksumSha256);
    assert.ok(backupPackage.ciphertextHex);

    // Verify and restore drill
    const restoreResult = BackupRestoreEngine.verifyAndRestoreDrill(backupPackage);
    assert.equal(restoreResult.valid, true);
    assert.equal(restoreResult.tablesRestored, 3);
    assert.equal(restoreResult.manifest?.databaseTables['users']?.[0]?.name, 'Nasif Kamal');

    // Tampered backup payload
    const tamperedPackage = {
      ...backupPackage,
      ciphertextHex: backupPackage.ciphertextHex.slice(0, -4) + '0000',
    };
    const tamperedRestore = BackupRestoreEngine.verifyAndRestoreDrill(tamperedPackage);
    assert.equal(tamperedRestore.valid, false);
  });
});
