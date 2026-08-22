import { announcementsManifest } from './manifest';
import { RuntimeModule } from '@jaago/module-system';

export * from './manifest';

export const announcementsModule: RuntimeModule = {
  manifest: announcementsManifest,
  hooks: {
    async onInstall(context) {
      console.log(`[Announcements Module] Installed for organization: ${context.organizationId}`);
    },
    async onEnable(context) {
      console.log(`[Announcements Module] Enabled for organization: ${context.organizationId}`);
    },
    async onDisable(context) {
      console.log(`[Announcements Module] Disabled for organization: ${context.organizationId}`);
    },
  },
};
