const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../');
const zipName = 'deploy_ready.zip';
const targetZip = path.join(rootDir, zipName);

console.log('🚀 Preparing ultra-lightweight deployment package...');

const excludeList = [
  'node_modules',
  '.next',
  '.turbo',
  '.git',
  '.deploy_staging',
  'ops.zip',
  'deploy_ready.zip',
  '.tempmediaStorage',
  '.system_generated',
  '.user_uploaded',
  '.env.local',
];

const stagingDir = path.join(rootDir, '.deploy_staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

function copyFiltered(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (excludeList.includes(base)) return;

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (excludeList.includes(entry)) continue;
      copyFiltered(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const base = path.basename(src);
    if (excludeList.includes(base)) return;
    fs.copyFileSync(src, dest);
  }
}

// Copy source files
const items = fs.readdirSync(rootDir);
for (const item of items) {
  if (excludeList.includes(item)) continue;
  copyFiltered(path.join(rootDir, item), path.join(stagingDir, item));
}

// Create zip using PowerShell Compress-Archive
console.log('📦 Compressing clean source files into deploy_ready.zip...');
if (fs.existsSync(targetZip)) fs.unlinkSync(targetZip);

try {
  execSync(`powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${targetZip}' -Force"`, {
    stdio: 'inherit',
  });
} finally {
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

if (fs.existsSync(targetZip)) {
  const sizeBytes = fs.statSync(targetZip).size;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Done! Lightweight deployment zip created:`);
  console.log(`📍 File: ${targetZip}`);
  console.log(`📊 Size: ${sizeMB} MB (Reduced from 310+ MB!)`);
}
