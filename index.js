/**
 * =================================================================
 * JAAGO HUB v2.2 — Master Server Entrypoint (Universal Platform Runner)
 * =================================================================
 * Orchestrates all platform services in a single server process:
 *   1. Web Application & API Routes  (apps/web - Next.js)
 *   2. Background Queue Worker       (apps/worker - BullMQ & Async Tasks)
 *   3. Log Runner & Telemetry Spooler(apps/log-runner - Log Uploader)
 *
 * Usage:
 *   node index.js
 *   npm start
 *
 * Environment Controls:
 *   ENABLE_WEB        (default: true)
 *   ENABLE_WORKER     (default: true)
 *   ENABLE_LOG_RUNNER (default: true)
 *   PORT              (default: 3000)
 *   NODE_ENV          (default: development)
 * =================================================================
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 1. Auto-load environment variables from .env
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: envFile });
    console.log('\x1b[32m[SYSTEM] Loaded configuration from .env\x1b[0m');
  } catch (err) {
    const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
    console.log('\x1b[32m[SYSTEM] Parsed .env configuration file\x1b[0m');
  }
}

// 2. Global Configuration & Environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || '3000';
const IS_PROD = NODE_ENV === 'production';

const ENABLE_WEB = process.env.ENABLE_WEB !== 'false';
const ENABLE_WORKER = process.env.ENABLE_WORKER !== 'false';
const ENABLE_LOG_RUNNER = process.env.ENABLE_LOG_RUNNER !== 'false';

// ANSI color formatting helpers
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function formatLog(tag, color, data) {
  const timestamp = new Date().toISOString().substring(11, 19);
  const prefix = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${tag}]${colors.reset} `;
  const text = data.toString();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0 || i < lines.length - 1) {
      process.stdout.write(prefix + lines[i] + '\n');
    }
  }
}

// 3. Print Startup Banner
console.log('\n=================================================================');
console.log(` \x1b[1m\x1b[36mJAAGO HUB v2.2 — Master Server Platform Runner\x1b[0m`);
console.log(` Environment: \x1b[33m${NODE_ENV}\x1b[0m | Node: \x1b[33m${process.version}\x1b[0m | Port: \x1b[33m${PORT}\x1b[0m`);
console.log('-----------------------------------------------------------------');
console.log(` [${ENABLE_WEB ? '✓' : '✗'}] Web & API Server     (apps/web)`);
console.log(` [${ENABLE_WORKER ? '✓' : '✗'}] Background Queue Worker (apps/worker)`);
console.log(` [${ENABLE_LOG_RUNNER ? '✓' : '✗'}] Log Runner & Spooler  (apps/log-runner)`);
console.log('=================================================================\n');

// 4. Subprocess Tracker
const children = [];

function spawnService({ name, color, filterName, devScript = 'dev', prodScript = 'start', env = {} }) {
  console.log(`${colors.green}[SYSTEM] Initializing service: ${name} (@jaago/${filterName})...${colors.reset}`);

  const isWindows = process.platform === 'win32';
  const action = IS_PROD ? prodScript : devScript;

  // Use npm workspace for monorepo package resolution
  const cmd = isWindows ? 'npm.cmd' : 'npm';
  const args = ['run', action, '--workspace', `@jaago/${filterName}`];

  const child = spawn(cmd, args, {
    cwd: __dirname,
    env: { ...process.env, ...env },
    shell: true,
  });

  child.stdout.on('data', (data) => formatLog(name, color, data));
  child.stderr.on('data', (data) => formatLog(name, color, data));

  child.on('error', (err) => {
    formatLog(name, colors.red, `Failed to start process: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    const statusStr = code !== null ? `code ${code}` : `signal ${signal}`;
    formatLog(name, colors.red, `Service stopped (${statusStr})`);
  });

  children.push({ name, process: child });
}

// 5. Initialize Subsystems

// --- A. Web & API Server ---
if (ENABLE_WEB) {
  spawnService({
    name: 'WEB-API',
    color: colors.cyan,
    filterName: 'web',
    devScript: 'dev',
    prodScript: 'start',
    env: { PORT },
  });
}

// --- B. Background Queue Worker ---
if (ENABLE_WORKER) {
  spawnService({
    name: 'WORKER',
    color: colors.yellow,
    filterName: 'worker',
    devScript: 'dev',
    prodScript: 'start',
  });
}

// --- C. Log Runner & Telemetry ---
if (ENABLE_LOG_RUNNER) {
  spawnService({
    name: 'LOG-RUNNER',
    color: colors.magenta,
    filterName: 'log-runner',
    devScript: 'dev',
    prodScript: 'start',
  });
}

// 6. Graceful Shutdown Management
function shutdown(signal) {
  console.log(`\n${colors.red}[SYSTEM] Received ${signal}. Shutting down all platform services gracefully...${colors.reset}`);
  
  if (children.length === 0) {
    process.exit(0);
  }

  const timeout = setTimeout(() => {
    console.log(`${colors.red}[SYSTEM] Forced shutdown after timeout.${colors.reset}`);
    process.exit(1);
  }, 5000);

  children.forEach(({ name, process: child }) => {
    if (child && !child.killed) {
      console.log(`${colors.gray}[SYSTEM] Stopping ${name} (PID: ${child.pid})...${colors.reset}`);
      child.kill('SIGTERM');
    }
  });

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

process.on('uncaughtException', (err) => {
  console.error(`${colors.red}[SYSTEM] Uncaught Exception:${colors.reset}`, err);
});

process.on('unhandledRejection', (reason) => {
  console.error(`${colors.red}[SYSTEM] Unhandled Rejection:${colors.reset}`, reason);
});
