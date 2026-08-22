#!/usr/bin/env tsx

/**
 * JAAGO HUB CLI Tooling
 * Usage: pnpm jaago <command> [...args]
 */

import * as path from 'node:path';
import { scaffoldModule } from './scaffold-module';

const [command, ...args] = process.argv.slice(2);
const rootDir = path.resolve(__dirname, '..', '..');

console.log(`\n=================================================`);
console.log(`   JAAGO HUB v2.2 — CLI Utility`);
console.log(`=================================================\n`);

switch (command) {
  case 'module:new': {
    const moduleKey = args[0];
    if (!moduleKey) {
      console.error(`Error: Module key is required. Example: pnpm jaago module:new hr`);
      process.exit(1);
    }
    try {
      scaffoldModule(moduleKey, rootDir);
    } catch (err: any) {
      console.error(`[Error]: ${err.message}`);
      process.exit(1);
    }
    break;
  }
  case 'check-env': {
    console.log(`[Config Validator] Checking environment configuration...`);
    break;
  }
  default: {
    console.log(`Available commands:`);
    console.log(`  module:new <key>    - Scaffold a new Odoo-class module`);
    console.log(`  check-env           - Validate active environment variables`);
    console.log(`  smoke-test          - Run system smoke tests`);
    break;
  }
}
