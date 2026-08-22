import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DependencyResolver,
  CyclicDependencyError,
  MissingDependencyError,
  ModuleManifest,
  ModuleLifecycleManager,
  RuntimeModule,
} from '@jaago/module-system';

describe('Odoo-Class Module Dependency Resolver & Lifecycle Suite', () => {
  const modCore: ModuleManifest = {
    key: 'core',
    name: 'Core System',
    version: '1.0.0',
    summary: 'Core Kernel',
    category: 'core',
    author: 'JAAGO Foundation',
    minCoreVersion: '2.2.0',
    depends: [],
    permissions: [],
    models: [],
    events: { produces: [], consumes: [] },
    navigation: [],
    autoInstall: true,
  };

  const modDirectory: ModuleManifest = {
    key: 'directory',
    name: 'Directory',
    version: '1.0.0',
    summary: 'Directory Service',
    category: 'core',
    author: 'JAAGO Foundation',
    minCoreVersion: '2.2.0',
    depends: ['core'],
    permissions: [],
    models: [],
    events: { produces: [], consumes: [] },
    navigation: [],
    autoInstall: true,
  };

  const modAnnouncements: ModuleManifest = {
    key: 'announcements',
    name: 'Announcements',
    version: '1.0.0',
    summary: 'Announcements Bulletin',
    category: 'operations',
    author: 'JAAGO Foundation',
    minCoreVersion: '2.2.0',
    depends: ['directory'],
    permissions: [],
    models: [],
    events: { produces: [], consumes: [] },
    navigation: [],
    autoInstall: true,
  };

  const modFinance: ModuleManifest = {
    key: 'finance',
    name: 'Finance & Accounts',
    version: '1.0.0',
    summary: 'Double entry accounting',
    category: 'finance',
    author: 'JAAGO Foundation',
    minCoreVersion: '2.2.0',
    depends: ['core'],
    permissions: [],
    models: [],
    events: { produces: [], consumes: [] },
    navigation: [],
    autoInstall: false,
  };

  it('determines deterministic linear topological install order', () => {
    const manifests = [modAnnouncements, modCore, modDirectory];
    const order = DependencyResolver.resolveInstallOrder(manifests);

    // Dependencies must come before dependents
    assert.deepEqual(order, ['core', 'directory', 'announcements']);
  });

  it('resolves multi-branch dependency trees correctly', () => {
    const manifests = [modAnnouncements, modFinance, modDirectory, modCore];
    const order = DependencyResolver.resolveInstallOrder(manifests);

    // 'core' must be first
    assert.equal(order[0], 'core');
    // 'directory' must be before 'announcements'
    assert.ok(order.indexOf('directory') < order.indexOf('announcements'));
    // 'core' must be before 'finance'
    assert.ok(order.indexOf('core') < order.indexOf('finance'));
  });

  it('detects and rejects cyclic module dependencies (A -> B -> A)', () => {
    const cycleA: ModuleManifest = {
      ...modCore,
      key: 'mod_a',
      depends: ['mod_b'],
    };
    const cycleB: ModuleManifest = {
      ...modCore,
      key: 'mod_b',
      depends: ['mod_a'],
    };

    assert.throws(
      () => {
        DependencyResolver.resolveInstallOrder([cycleA, cycleB]);
      },
      (err: unknown) => {
        assert.ok(err instanceof CyclicDependencyError);
        assert.match(err.message, /Cyclic module dependency detected/);
        return true;
      },
    );
  });

  it('detects and reports missing dependencies', () => {
    const orphanedModule: ModuleManifest = {
      ...modCore,
      key: 'orphan',
      depends: ['non_existent_dependency'],
    };

    assert.throws(
      () => {
        DependencyResolver.resolveInstallOrder([orphanedModule]);
      },
      (err: unknown) => {
        assert.ok(err instanceof MissingDependencyError);
        assert.equal(err.moduleKey, 'orphan');
        assert.equal(err.missingDependency, 'non_existent_dependency');
        return true;
      },
    );
  });

  it('computes reverse cascade uninstall order', () => {
    const manifests = [modCore, modDirectory, modAnnouncements];
    const uninstallOrder = DependencyResolver.resolveUninstallOrder('core', manifests);

    // To uninstall 'core', dependents must be uninstalled in reverse order: announcements first, then directory, then core
    assert.deepEqual(uninstallOrder, ['announcements', 'directory', 'core']);
  });

  it('executes module lifecycle transitions (install -> enable -> disable -> uninstall)', async () => {
    const manager = new ModuleLifecycleManager();
    const mockContext = {
      organizationId: '11111111-1111-4111-a111-111111111111',
      traceId: 'test-trace-001',
    };

    let installHookCalled = false;
    let disableHookCalled = false;
    let enableHookCalled = false;
    let uninstallHookCalled = false;

    const runtimeMod: RuntimeModule = {
      manifest: modDirectory,
      hooks: {
        async onInstall() {
          installHookCalled = true;
        },
        async onDisable() {
          disableHookCalled = true;
        },
        async onEnable() {
          enableHookCalled = true;
        },
        async onUninstall() {
          uninstallHookCalled = true;
        },
      },
    };

    // 1. Initial State
    assert.equal(manager.getState(mockContext.organizationId, 'directory'), 'uninstalled');

    // 2. Install
    await manager.install(runtimeMod, mockContext);
    assert.equal(installHookCalled, true);
    assert.equal(manager.getState(mockContext.organizationId, 'directory'), 'active');

    // 3. Disable
    await manager.disable(runtimeMod, mockContext);
    assert.equal(disableHookCalled, true);
    assert.equal(manager.getState(mockContext.organizationId, 'directory'), 'disabled');

    // 4. Enable
    await manager.enable(runtimeMod, mockContext);
    assert.equal(enableHookCalled, true);
    assert.equal(manager.getState(mockContext.organizationId, 'directory'), 'active');

    // 5. Uninstall
    await manager.uninstall(runtimeMod, mockContext);
    assert.equal(uninstallHookCalled, true);
    assert.equal(manager.getState(mockContext.organizationId, 'directory'), 'uninstalled');
  });
});
