import { ModuleManifest, RuntimeModule } from '@jaago/module-system';

export const templateManifest: ModuleManifest = {
  key: 'template',
  name: 'Module Template',
  version: '1.0.0',
  summary: 'Scaffold template for new JAAGO HUB modules',
  description: 'Reference implementation and scaffold structure for domain modules',
  category: 'core',
  author: 'JAAGO Foundation Engineering',
  minCoreVersion: '2.2.0',
  depends: [],
  permissions: [],
  models: [],
  events: {
    produces: [],
    consumes: [],
  },
  navigation: [],
  autoInstall: false,
};

export const templateModule: RuntimeModule = {
  manifest: templateManifest,
  hooks: {
    async onInstall(context) {
      console.log(`[Template Module] Installed for organization: ${context.organizationId}`);
    },
  },
};
