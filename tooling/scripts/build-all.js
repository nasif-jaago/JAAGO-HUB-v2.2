// tooling/scripts/build-all.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../..');

console.log('🚀 Building all packages sequentially (No Turbo)...');

async function buildPackage(packageDir) {
  const packageName = path.basename(packageDir);
  console.log(`\n📦 Building @jaago/${packageName}...`);

  try {
    // Navigate to package directory
    process.chdir(packageDir);

    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      console.log(`⚠️  No package.json in @jaago/${packageName}, skipping...`);
      return;
    }

    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    // Install dependencies if needed
    if (!fs.existsSync('node_modules')) {
      console.log(`📥 Installing dependencies for @jaago/${packageName}...`);
      try {
        execSync('npm ci --prefer-offline', { stdio: 'inherit' });
      } catch (installError) {
        console.log(`⚠️  npm ci failed, trying npm install...`);
        execSync('npm install', { stdio: 'inherit' });
      }
    }

    // Determine build command
    let buildCommand;
    if (packageJson.scripts?.build) {
      buildCommand = packageJson.scripts.build;
    } else {
      // Check if it's a TypeScript package without explicit build script
      if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
        buildCommand = 'npx tsc';
      } else {
        console.log(`⚠️  No build script in @jaago/${packageName}, skipping build...`);
        return;
      }
    }

    console.log(`🔨 Running build: ${buildCommand}`);
    
    // Run the build command directly
    execSync(buildCommand, { stdio: 'inherit' });

    console.log(`✅ Successfully built @jaago/${packageName}`);

  } catch (error) {
    console.error(`❌ Failed to build @jaago/${packageName}:`, error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    // Ensure we're in the root directory
    process.chdir(rootDir);

    // Define packages to build based on actual directory structure
    const packagesToBuild = [
      'packages/auth',
      'packages/authz',
      'packages/cache',
      'packages/config',
      'packages/contracts',
      'packages/core-application',
      'packages/core-domain',
      'packages/core-infra',
      'packages/importexport',
      'packages/logger',
      'packages/module-system',
      'packages/notifications',
      'packages/observability',
      'packages/queue',
      'packages/reporting',
      'packages/search',
      'packages/storage',
      'packages/testing',
      'packages/ui',
      'packages/workflow',
    ];

    console.log(`🎯 Building ${packagesToBuild.length} packages...`);
    console.log(`📂 Root directory: ${rootDir}\n`);

    // Build each package sequentially
    for (const packagePath of packagesToBuild) {
      const fullPath = path.join(rootDir, packagePath);

      if (fs.existsSync(fullPath)) {
        await buildPackage(fullPath);
      } else {
        console.log(`⚠️  Package not found: ${packagePath}, skipping...`);
      }
    }

    console.log('\n🎉 All packages built successfully!');

  } catch (error) {
    console.error('\n❌ Build process failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildPackage, main };