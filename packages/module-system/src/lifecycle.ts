import { ModuleManifest } from './manifest';
import { logger } from '@jaago/logger';

export type ModuleLifecycleState =
  | 'uninstalled'
  | 'installing'
  | 'active'
  | 'disabled'
  | 'upgrading'
  | 'uninstalling';

export interface ModuleExecutionContext {
  organizationId: string;
  userId?: string | undefined;
  traceId: string;
}

export interface ModuleHooks {
  onInstall?: (context: ModuleExecutionContext) => Promise<void>;
  onEnable?: (context: ModuleExecutionContext) => Promise<void>;
  onDisable?: (context: ModuleExecutionContext) => Promise<void>;
  onUninstall?: (context: ModuleExecutionContext) => Promise<void>;
  onUpgrade?: (context: ModuleExecutionContext, fromVersion: string, toVersion: string) => Promise<void>;
}

export interface RuntimeModule {
  manifest: ModuleManifest;
  hooks?: ModuleHooks | undefined;
}

export class ModuleLifecycleManager {
  private activeState = new Map<string, ModuleLifecycleState>();

  getState(organizationId: string, moduleKey: string): ModuleLifecycleState {
    const key = `${organizationId}:${moduleKey}`;
    return this.activeState.get(key) || 'uninstalled';
  }

  async install(
    module: RuntimeModule,
    context: ModuleExecutionContext,
  ): Promise<void> {
    const stateKey = `${context.organizationId}:${module.manifest.key}`;
    this.activeState.set(stateKey, 'installing');

    logger.info('SYSTEM', 'module.install.start', {
      organizationId: context.organizationId,
      traceId: context.traceId,
      metadata: { moduleKey: module.manifest.key, version: module.manifest.version },
    });

    if (module.hooks?.onInstall) {
      await module.hooks.onInstall(context);
    }

    this.activeState.set(stateKey, 'active');

    logger.info('SYSTEM', 'module.install.completed', {
      organizationId: context.organizationId,
      traceId: context.traceId,
      metadata: { moduleKey: module.manifest.key, version: module.manifest.version },
    });
  }

  async disable(
    module: RuntimeModule,
    context: ModuleExecutionContext,
  ): Promise<void> {
    const stateKey = `${context.organizationId}:${module.manifest.key}`;
    const currentState = this.getState(context.organizationId, module.manifest.key);

    if (currentState !== 'active') {
      return;
    }

    if (module.hooks?.onDisable) {
      await module.hooks.onDisable(context);
    }

    this.activeState.set(stateKey, 'disabled');

    logger.info('SYSTEM', 'module.disabled', {
      organizationId: context.organizationId,
      traceId: context.traceId,
      metadata: { moduleKey: module.manifest.key },
    });
  }

  async enable(
    module: RuntimeModule,
    context: ModuleExecutionContext,
  ): Promise<void> {
    const stateKey = `${context.organizationId}:${module.manifest.key}`;

    if (module.hooks?.onEnable) {
      await module.hooks.onEnable(context);
    }

    this.activeState.set(stateKey, 'active');

    logger.info('SYSTEM', 'module.enabled', {
      organizationId: context.organizationId,
      traceId: context.traceId,
      metadata: { moduleKey: module.manifest.key },
    });
  }

  async uninstall(
    module: RuntimeModule,
    context: ModuleExecutionContext,
  ): Promise<void> {
    const stateKey = `${context.organizationId}:${module.manifest.key}`;
    this.activeState.set(stateKey, 'uninstalling');

    if (module.hooks?.onUninstall) {
      await module.hooks.onUninstall(context);
    }

    this.activeState.delete(stateKey);

    logger.info('SYSTEM', 'module.uninstalled', {
      organizationId: context.organizationId,
      traceId: context.traceId,
      metadata: { moduleKey: module.manifest.key },
    });
  }
}
