import * as fs from 'node:fs';
import * as path from 'node:path';

export function scaffoldModule(moduleKey: string, rootDir: string): void {
  const cleanKey = moduleKey.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanKey) {
    throw new Error('Invalid module key. Use alphanumeric characters, hyphens or underscores.');
  }

  const moduleDir = path.join(rootDir, 'modules', cleanKey);
  const srcDir = path.join(moduleDir, 'src');
  const testDir = path.join(srcDir, '__tests__');

  if (fs.existsSync(moduleDir)) {
    throw new Error(`Module directory '${moduleDir}' already exists.`);
  }

  fs.mkdirSync(testDir, { recursive: true });

  const titleName = cleanKey
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  // 1. package.json
  const packageJson = {
    name: `@jaago/mod-${cleanKey}`,
    version: '1.0.0',
    private: true,
    type: 'module',
    main: './src/index.ts',
    types: './src/index.ts',
    exports: {
      '.': './src/index.ts',
    },
    scripts: {
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
    },
    dependencies: {
      '@jaago/contracts': 'workspace:*',
      '@jaago/core-infra': 'workspace:*',
      '@jaago/module-system': 'workspace:*',
    },
    devDependencies: {
      '@types/node': '^22.10.2',
      typescript: '^5.7.2',
    },
  };
  fs.writeFileSync(path.join(moduleDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

  // 2. tsconfig.json
  const tsconfig = {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      rootDir: 'src',
    },
    include: ['src/**/*'],
  };
  fs.writeFileSync(path.join(moduleDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n');

  // 3. src/manifest.ts
  const manifestTs = `import { ModuleManifest } from '@jaago/module-system';

export const ${cleanKey.replace(/-/g, '_')}Manifest: ModuleManifest = {
  key: '${cleanKey}',
  name: '${titleName}',
  version: '1.0.0',
  summary: '${titleName} module for JAAGO Foundation ERP',
  description: 'Enterprise ${titleName} operations and governance workflows',
  category: 'operations',
  author: 'JAAGO Foundation Engineering',
  minCoreVersion: '2.2.0',
  depends: [],
  permissions: [
    {
      key: '${cleanKey}.view',
      name: 'View ${titleName}',
      description: 'Access ${titleName} dashboard and records',
      category: '${cleanKey}',
    },
    {
      key: '${cleanKey}.manage',
      name: 'Manage ${titleName}',
      description: 'Create and modify ${titleName} records',
      category: '${cleanKey}',
    },
  ],
  models: ['${cleanKey}_records'],
  events: {
    produces: ['${cleanKey}.record.created'],
    consumes: [],
  },
  navigation: [
    {
      key: '${cleanKey}',
      label: '${titleName}',
      icon: 'Layers',
      path: '/${cleanKey}',
      order: 50,
      permission: '${cleanKey}.view',
    },
  ],
  autoInstall: false,
};
`;
  fs.writeFileSync(path.join(srcDir, 'manifest.ts'), manifestTs);

  // 4. src/schema.ts
  const schemaTs = `import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from '@jaago/core-infra';

export const ${cleanKey.replace(/-/g, '_')}Records = pgTable(
  '${cleanKey.replace(/-/g, '_')}_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_${cleanKey.replace(/-/g, '_')}_org').on(table.organizationId),
  ],
);
`;
  fs.writeFileSync(path.join(srcDir, 'schema.ts'), schemaTs);

  // 5. src/index.ts
  const indexTs = `import { ${cleanKey.replace(/-/g, '_')}Manifest } from './manifest';
import { RuntimeModule } from '@jaago/module-system';

export * from './manifest';
export * from './schema';

export const ${cleanKey.replace(/-/g, '_')}Module: RuntimeModule = {
  manifest: ${cleanKey.replace(/-/g, '_')}Manifest,
  hooks: {
    async onInstall(context) {
      console.log(\`[${titleName} Module] Installed for organization: \${context.organizationId}\`);
    },
    async onEnable(context) {
      console.log(\`[${titleName} Module] Enabled for organization: \${context.organizationId}\`);
    },
    async onDisable(context) {
      console.log(\`[${titleName} Module] Disabled for organization: \${context.organizationId}\`);
    },
  },
};
`;
  fs.writeFileSync(path.join(srcDir, 'index.ts'), indexTs);

  console.log(`[Module Scaffolder] Successfully generated module: modules/${cleanKey}`);
  console.log(`  - Package: @jaago/mod-${cleanKey}`);
  console.log(`  - Files: package.json, tsconfig.json, src/manifest.ts, src/schema.ts, src/index.ts`);
}
