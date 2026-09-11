import { adminProcurementManifest } from './manifest';
import { RuntimeModule } from '@jaago/module-system';

export * from './manifest';

export const adminProcurementModule: RuntimeModule = {
  manifest: adminProcurementManifest,
  hooks: {
    async onInstall(context) {
      console.log(`[Admin & Procurement Module] Installed for organization: ${context.organizationId}`);
    },
    async onEnable(context) {
      console.log(`[Admin & Procurement Module] Enabled for organization: ${context.organizationId}`);
    },
    async onDisable(context) {
      console.log(`[Admin & Procurement Module] Disabled for organization: ${context.organizationId}`);
    },
  },
};
