import { createApiHandler } from '@jaago/authz';
import { globalModuleRegistry } from '@jaago/module-system';
import { directoryModule } from '@jaago/mod-directory';
import { announcementsModule } from '@jaago/mod-announcements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Register core platform demo modules into the runtime registry
globalModuleRegistry.register(directoryModule);
globalModuleRegistry.register(announcementsModule);

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    const orgId = context.organizationId!;
    const modules = globalModuleRegistry.listAll();

    const modulesWithStatus = modules.map((m) => {
      const state = globalModuleRegistry.getLifecycleManager().getState(orgId, m.manifest.key);
      return {
        ...m.manifest,
        status: state === 'uninstalled' && m.manifest.autoInstall ? 'active' : state,
        installed: state === 'active' || m.manifest.autoInstall,
      };
    });

    return Response.json({
      data: modulesWithStatus,
      meta: {
        total: modulesWithStatus.length,
        organizationId: orgId,
      },
    });
  },
});
