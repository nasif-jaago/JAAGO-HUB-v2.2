import { ModuleManifest } from './manifest';
import { AppError, ErrorCode } from '@jaago/contracts';

export class CyclicDependencyError extends AppError {
  public readonly cycle: string[];

  constructor(cycle: string[]) {
    super(`Cyclic module dependency detected: ${cycle.join(' -> ')}`, {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      statusCode: 400,
      details: { cycle },
    });
    this.name = 'CyclicDependencyError';
    this.cycle = cycle;
  }
}

export class MissingDependencyError extends AppError {
  public readonly moduleKey: string;
  public readonly missingDependency: string;

  constructor(moduleKey: string, missingDependency: string) {
    super(
      `Module '${moduleKey}' requires missing dependency '${missingDependency}'`,
      {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        statusCode: 400,
        details: { moduleKey, missingDependency },
      },
    );
    this.name = 'MissingDependencyError';
    this.moduleKey = moduleKey;
    this.missingDependency = missingDependency;
  }
}

export class DependencyResolver {
  /**
   * Resolves the deterministic install order for a set of modules using Kahn's topological sort.
   * Dependencies are guaranteed to appear before dependent modules.
   */
  public static resolveInstallOrder(manifests: ModuleManifest[]): string[] {
    const manifestMap = new Map<string, ModuleManifest>();
    manifests.forEach((m) => manifestMap.set(m.key, m));

    // 1. Verify that all declared dependencies exist
    for (const manifest of manifests) {
      for (const dep of manifest.depends) {
        if (!manifestMap.has(dep)) {
          throw new MissingDependencyError(manifest.key, dep);
        }
      }
    }

    // 2. Build graph: inDegree count and adjacency list (dep -> list of modules that depend on it)
    const inDegree = new Map<string, number>();
    const dependentsMap = new Map<string, string[]>();

    for (const manifest of manifests) {
      inDegree.set(manifest.key, manifest.depends.length);
      dependentsMap.set(manifest.key, []);
    }

    for (const manifest of manifests) {
      for (const dep of manifest.depends) {
        dependentsMap.get(dep)!.push(manifest.key);
      }
    }

    // 3. Queue modules with 0 in-degree (no dependencies)
    const queue: string[] = [];
    for (const [key, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(key);
      }
    }

    // Sort initial queue alphabetically for deterministic output
    queue.sort();

    const order: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);

      const dependents = dependentsMap.get(current) || [];
      for (const dep of dependents) {
        const newDegree = inDegree.get(dep)! - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // 4. If processed count != total manifests, a cycle exists
    if (order.length !== manifests.length) {
      const remaining = manifests.filter((m) => !order.includes(m.key));
      const cyclePath = remaining.map((m) => m.key);
      cyclePath.push(cyclePath[0]!); // Close cycle representation
      throw new CyclicDependencyError(cyclePath);
    }

    return order;
  }

  /**
   * Resolves the reverse cascade order when uninstalling a module.
   * Any module depending on target module will be scheduled for uninstallation first.
   */
  public static resolveUninstallOrder(
    targetKey: string,
    allManifests: ModuleManifest[],
  ): string[] {
    const manifestMap = new Map<string, ModuleManifest>();
    allManifests.forEach((m) => manifestMap.set(m.key, m));

    if (!manifestMap.has(targetKey)) {
      return [];
    }

    const dependentsToUninstall = new Set<string>();

    function findDependents(currentKey: string) {
      dependentsToUninstall.add(currentKey);
      for (const m of allManifests) {
        if (m.depends.includes(currentKey) && !dependentsToUninstall.has(m.key)) {
          findDependents(m.key);
        }
      }
    }

    findDependents(targetKey);

    const subsetManifests = allManifests.filter((m) => dependentsToUninstall.has(m.key));
    const installOrder = this.resolveInstallOrder(subsetManifests);

    // Reverse order for safe cascade uninstall
    return installOrder.reverse();
  }
}
