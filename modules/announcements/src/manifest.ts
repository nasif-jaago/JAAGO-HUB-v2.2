import { ModuleManifest } from '@jaago/module-system';

export const announcementsManifest: ModuleManifest = {
  key: 'announcements',
  name: 'Circulars & Announcements',
  version: '1.0.0',
  summary: 'Foundation-wide broadcast bulletins and emergency circulars',
  description: 'Publish, schedule, and track read receipts for administrative notices and policy updates',
  category: 'operations',
  author: 'JAAGO Foundation Engineering',
  minCoreVersion: '2.2.0',
  depends: ['directory'], // Declares dependency on directory module
  permissions: [
    {
      key: 'announcements.view',
      name: 'View Announcements',
      description: 'Read published organizational circulars',
      category: 'announcements',
    },
    {
      key: 'announcements.publish',
      name: 'Publish Announcements',
      description: 'Draft and broadcast notices to branches and departments',
      category: 'announcements',
    },
  ],
  models: ['announcements', 'announcement_read_receipts'],
  events: {
    produces: ['announcement.published', 'announcement.broadcasted'],
    consumes: ['directory.contact.created'],
  },
  navigation: [
    {
      key: 'announcements',
      label: 'Announcements',
      icon: 'Megaphone',
      path: '/announcements',
      order: 16,
      permission: 'announcements.view',
    },
  ],
  autoInstall: true,
};
