import { ModuleManifest } from '@jaago/module-system';

export const directoryManifest: ModuleManifest = {
  key: 'directory',
  name: 'Staff & Beneficiary Directory',
  version: '1.0.0',
  summary: 'Unified contact and organizational directory for JAAGO Foundation',
  description: 'Searchable employee, volunteer, and school contact registry with role-based filtering',
  category: 'core',
  author: 'JAAGO Foundation Engineering',
  minCoreVersion: '2.2.0',
  depends: [],
  permissions: [
    {
      key: 'directory.view',
      name: 'View Directory',
      description: 'Access the global staff and branch contact directory',
      category: 'directory',
    },
    {
      key: 'directory.manage',
      name: 'Manage Directory Entries',
      description: 'Update phone extensions, designations, and public contact info',
      category: 'directory',
    },
  ],
  models: ['directory_contacts'],
  events: {
    produces: ['directory.contact.created', 'directory.contact.updated'],
    consumes: ['user.created', 'user.updated'],
  },
  navigation: [
    {
      key: 'directory',
      label: 'Directory',
      icon: 'Users',
      path: '/directory',
      order: 15,
      permission: 'directory.view',
    },
  ],
  autoInstall: true,
};
