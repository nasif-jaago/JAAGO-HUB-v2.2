// tooling/scripts/start-dev.js

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

console.log('🚀 Starting JAAGO HUB development...');

async function main() {
  try {
    // Ensure we're in the root directory
    process.chdir(rootDir);

    // Check if turbo is available
    try {
      require('child_process').execSync('turbo --version', { stdio: 'pipe' });
      console.log('⚠️  Turbo is available but may not be properly configured for this environment');
    } catch (error) {
      console.log('⚠️  Turbo not available in current environment');
      console.log('📋 To run development servers, ensure turbo is installed:');
      console.log('   npm install -g turbo');
      console.log('\n📋 For now, run individual package commands:');
      console.log('   npm run dev:web   # For web application');
      console.log('   npm run dev:worker  # For worker processes');
      console.log('   npm run dev:log-runner  # For log runner service');
    }
    
  } catch (error) {
    console.error('\n❌ Development startup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };