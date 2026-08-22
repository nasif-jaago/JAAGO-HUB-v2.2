import { directoryManifest } from './manifest';
import { RuntimeModule } from '@jaago/module-system';

export * from './manifest';

export const directoryModule: RuntimeModule = {
  manifest: directoryManifest,
  hooks: {
    async onInstall(context) {
      // Seed default directory configurations
      console.log(`[Directory Module] Installed for organization: ${context.organizationId}`);
    },
    async onEnable(context) {
      console.log(`[Directory Module] Enabled for organization: ${context.organizationId}`);
    },
    async onDisable(context) {
      console.log(`[Directory Module] Disabled for organization: ${context.organizationId}`);
    },
  },
};
