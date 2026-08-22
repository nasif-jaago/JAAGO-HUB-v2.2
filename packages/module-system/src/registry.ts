import { ModuleManifest, NavigationItem, PermissionContribution } from './manifest';
import { DependencyResolver } from './resolver';
import { RuntimeModule, ModuleLifecycleManager } from './lifecycle';

export class ModuleRegistry {
  private modules = new Map<string, RuntimeModule>();
  private lifecycleManager = new ModuleLifecycleManager();

  register(module: RuntimeModule): void {
    this.modules.set(module.manifest.key, module);
  }

  get(key: string): RuntimeModule | undefined {
    return this.modules.get(key);
  }

  listAll(): RuntimeModule[] {
    return Array.from(this.modules.values());
  }

  listByCategory(category: string): RuntimeModule[] {
    return this.listAll().filter((m) => m.manifest.category === category);
  }

  getInstallPlan(moduleKeys: string[]): string[] {
    const manifests = moduleKeys
      .map((k) => this.modules.get(k)?.manifest)
      .filter((m): m is ModuleManifest => m !== undefined);

    return DependencyResolver.resolveInstallOrder(manifests);
  }

  getAggregatedNavigation(activeModuleKeys: string[]): NavigationItem[] {
    const items: NavigationItem[] = [];

    for (const key of activeModuleKeys) {
      const mod = this.modules.get(key);
      if (mod?.manifest.navigation) {
        items.push(...mod.manifest.navigation);
      }
    }

    return items.sort((a, b) => a.order - b.order);
  }

  getAggregatedPermissions(activeModuleKeys: string[]): PermissionContribution[] {
    const permissions: PermissionContribution[] = [];

    for (const key of activeModuleKeys) {
      const mod = this.modules.get(key);
      if (mod?.manifest.permissions) {
        permissions.push(...mod.manifest.permissions);
      }
    }

    return permissions;
  }

  getLifecycleManager(): ModuleLifecycleManager {
    return this.lifecycleManager;
  }
}

export const globalModuleRegistry = new ModuleRegistry();
