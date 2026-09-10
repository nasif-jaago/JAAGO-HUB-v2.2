// tooling/scripts/start-dev.js

const { execSync } = require('child_process');

console.log('🚀 Starting JAAGO HUB development...');

try {
  // Set NODE_ENV for development
  process.env.NODE_ENV = 'development';
  
  console.log('🔨 Building all packages first...');
  execSync('npm run build:all', { stdio: 'inherit' });
  
  console.log('🔨 Attempting to start development servers with turbo...');
  console.log('📋 Running: turbo run dev --parallel');
  
  // Run turbo dev with verbose output and error handling
  try {
    execSync('turbo run dev --parallel --no-cache', { 
      stdio: 'inherit',
      timeout: 120000
    });
  } catch (turboError) {
    const errorMessage = turboError.message || '';
    console.log('\n⚠️  Turbo development startup failed:', errorMessage);
    console.log('\n📋 Troubleshooting steps:');
    console.log('   1. Check if all dependencies are installed:');
    console.log('      npm install');
    console.log('   2. Try running individual dev commands:');
    console.log('      npm run dev:web');
    console.log('      npm run dev:worker');
    console.log('      npm run dev:log-runner');
    console.log('   3. Check browser console for web app errors');
    console.log('   4. Check server logs for worker/log-runner errors');
    console.log('\n📋 Alternative: Start packages individually:');
    console.log('      npm run dev:web   # For web application');
    console.log('      npm run dev:worker  # For worker processes');
    console.log('      npm run dev:log-runner  # For log runner service');
    console.log('\n💡 Note: If the error persists, there may be dependency or configuration issues');
    
    // Don't exit here, let the user decide what to do
    console.log('\n🚧 You can continue to run individual packages manually...');
  }
  
} catch (error) {
  console.error('\n❌ Development startup failed:', error.message);
  console.log('\n📋 For now, run individual package commands:');
  console.log('   npm run dev:web   # For web application');
  console.log('   npm run dev:worker  # For worker processes');
  console.log('   npm run dev:log-runner  # For log runner service');
  process.exit(1);
}