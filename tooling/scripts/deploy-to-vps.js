// tooling/scripts/deploy-to-vps.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = {
  projectPath: process.env.PROJECT_PATH || '/home/jfmaster/nextJs',
  backupDir: process.env.BACKUP_DIR || '/home/jfmaster/backups',
  logDir: process.env.LOG_DIR || '/home/jfmaster/nextJs/log',
  nodeEnv: process.env.NODE_ENV || 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  vpsHost: process.env.VPS_HOST,
  vpsUser: process.env.VPS_USER,
  vpsPort: process.env.VPS_PORT || '22',
  vpsPassword: process.env.VPS_PASSWORD,
  slackWebhook: process.env.SLACK_WEBHOOK,
};

// Validate required configuration
function validateConfig() {
  const required = ['vpsHost', 'vpsUser', 'vpsPassword'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required config: ${missing.join(', ')}`);
    process.exit(1);
  }
}

function generateDeploymentId() {
  return `deploy-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function log(message, level = 'info') {
  const timestamp = new Date().toISOString().substring(11, 19);
  const levelColors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    header: '\x1b[1m\x1b[36m'
  };
  const reset = '\x1b[0m';
  
  const color = levelColors[level] || levelColors.info;
  const formatted = `${timestamp} ${color}[${level.toUpperCase()}]${reset} ${message}`;
  
  console.log(formatted);
  
  // Write to log file
  const logFile = path.join(config.logDir, `${generateDeploymentId()}.log`);
  fs.appendFileSync(logFile, formatted + '\n');
}

function createBackupTimestamp() {
  return `backup-${Date.now()}`;
}

async function executeDeployment() {
  const deploymentId = generateDeploymentId();
  log(`🚀 Starting deployment (${deploymentId})`, 'header');
  
  try {
    validateConfig();
    
    log(`📍 Target environment: production`, 'info');
    log(`🏗️ Project path: ${config.projectPath}`, 'info');
    log(`🔐 Using SSH port: ${config.vpsPort}`, 'info');
    
    // Build SSH command
    const sshCommand = `
      set -euo pipefail
      
      PROJECT_PATH="${config.projectPath}"
      BACKUP_DIR="${config.backupDir}"
      LOG_DIR="${config.logDir}"
      
      echo "=== 🚀 Starting Deployment at $(date) ==="
      echo "📍 Project Path: \$PROJECT_PATH"
      echo "🆔 Deployment ID: ${deploymentId}"
      
      # Create backup
      BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
      git stash push -m "pre-deploy-\$BACKUP_TIMESTAMP" || true
      
      echo "💾 Creating deployment backup..."
      tar -czf "\$BACKUP_DIR/current-\$BACKUP_TIMESTAMP.tar.gz" . || {
        echo "❌ ERROR: Backup creation failed"
        exit 1
      }
      echo "✅ Backup created: \$BACKUP_DIR/current-\$BACKUP_TIMESTAMP.tar.gz"
      
      echo "🧹 Cleaning project directory..."
      cd "\$PROJECT_PATH" || exit 1
      rm -rf *
      
      echo "📦 Deploying new code from checkout..."
      # The deployment package should already be present in the checkout
      # If using the simplified workflow, we just copy the entire project
      cp -r /home/runner/work/JAAGO-HUB-v2.2/* . || {
        echo "❌ ERROR: Failed to copy project files"
        exit 1
      }
      
      echo "🔄 Restoring git changes..."
      git stash pop 2>/dev/null || true
      
      echo "📥 Installing dependencies..."
      npm ci --prefer-offline || {
        echo "❌ ERROR: npm install failed"
        exit 1
      }
      echo "✅ Dependencies installed successfully"
      
      echo "🏗️ Building application..."
      npm run build || {
        echo "❌ ERROR: Build failed"
        exit 1
      }
      echo "✅ Build completed successfully"
      
      echo "🔄 Restarting services..."
      if supervisorctl restart hub-jaago; then
        echo "✅ Services restarted successfully"
      else
        echo "❌ ERROR: Failed to restart hub-jaago"
        exit 1
      fi
      
      echo "🏥 Running comprehensive health checks..."
      sleep 20
      
      if curl -f -s --max-time 60 "http://localhost:3000/api/v1/health"; then
        echo "✅ Health check passed"
      else
        echo "❌ ERROR: Health check failed"
        supervisorctl stop hub-jaago
        exit 1
      fi
      
      MODULE_RESPONSE=\$(curl -s "http://localhost:3000/api/v1/modules")
      if echo "\$MODULE_RESPONSE" | grep -q "'key'"; then
        echo "✅ Module registration verified"
      else
        echo "❌ ERROR: Module registration failed"
        echo "📋 Module response: \$MODULE_RESPONSE"
        supervisorctl stop hub-jaago
        exit 1
      fi
      
      echo "🎉 === Deployment completed successfully at $(date) ==="
      echo "Deployment successful at $(date)" > "\$PROJECT_PATH/deployment-success.marker"
    `;
    
    // Execute deployment via SSH
    const { execSync } = require('child_process');
    const sshCommandFull = `ssh -o ConnectTimeout=30 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${config.vpsUser}@${config.vpsHost} -p ${config.vpsPort} "${sshCommand}""`;
    
    log('🚀 Executing deployment on VPS...', 'header');
    execSync(sshCommandFull, { stdio: 'inherit' });
    
    log('🎉 Production deployment completed successfully!', 'success');
    
    // Success notification
    if (config.slackWebhook) {
      try {
        const { execSync } = require('child_process');
        execSync(`curl -X POST "${config.slackWebhook}" -H 'Content-type: application/json' --data '{"text":"🚀 JAAGO HUB deployed successfully!"}'`, { stdio: 'ignore' });
        log('📱 Success notification sent to Slack', 'info');
      } catch (error) {
        log('⚠️ Failed to send Slack notification', 'warning');
      }
    }
    
  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`, 'error');
    
    // Initiate rollback on failure
    log('🔄 Initiating emergency rollback...', 'header');
    await executeRollback();
    
    // Rollback notification
    if (config.slackWebhook) {
      try {
        const { execSync } = require('child_process');
        execSync(`curl -X POST "${config.slackWebhook}" -H 'Content-type: application/json' --data '{"text":"🚨 EMERGENCY: JAAGO HUB ROLLED BACK at $(date)"}'`, { stdio: 'ignore' });
      } catch (error) {
        // Ignore Slack notification errors
      }
    }
    
    process.exit(1);
  }
}

async function executeRollback() {
  log('🔄 Executing emergency rollback...', 'header');
  
  try {
    const sshCommand = `
      set -euo pipefail
      
      PROJECT_PATH="${config.projectPath}"
      BACKUP_DIR="${config.backupDir}"
      LOG_DIR="${config.logDir}"
      
      echo "=== 🚀 Starting Rollback at $(date) ==="
      
      cd "\$PROJECT_PATH" || {
        echo "❌ ERROR: Cannot access project directory"
        exit 1
      }
      
      LATEST_BACKUP=\$(ls -t "\$BACKUP_DIR"/current-*.tar.gz 2>/dev/null | head -1)
      
      if [ -z "\$LATEST_BACKUP" ]; then
        echo "❌ ERROR: No backup found to rollback to"
        exit 1
      fi
      
      echo "🔄 Rolling back to: \$LATEST_BACKUP"
      
      echo "🛑 Stopping hub-jaago service..."
      if supervisorctl stop hub-jaago; then
        echo "✅ Service stopped successfully"
      else
        echo "❌ ERROR: Failed to stop hub-jaago"
        exit 1
      fi
      
      echo "🔄 Restoring backup..."
      rm -rf *
      tar -xzf "\$LATEST_BACKUP"
      rm "\$LATEST_BACKUP"
      
      echo "📥 Installing dependencies..."
      npm ci --prefer-offline || {
        echo "❌ ERROR: npm install failed during rollback"
        exit 1
      }
      echo "✅ Dependencies installed successfully"
      
      echo "▶️ Starting service..."
      if supervisorctl start hub-jaago; then
        echo "✅ Service started successfully"
      else
        echo "❌ ERROR: Failed to start hub-jaago after rollback"
        exit 1
      fi
      
      echo "🏥 Verifying rollback with health checks..."
      sleep 15
      
      if curl -f -s --max-time 60 "http://localhost:3000/api/v1/health"; then
        echo "✅ Health check passed"
      else
        echo "❌ ERROR: Health check failed after rollback"
        supervisorctl stop hub-jaago
        exit 1
      fi
      
      if curl -s "http://localhost:3000/api/v1/modules" | grep -q "'key'"; then
        echo "✅ Module registration verified"
      else
        echo "❌ ERROR: Module registration failed after rollback"
        supervisorctl stop hub-jaago
        exit 1
      fi
      
      echo "🎉 === Emergency rollback completed at $(date) ==="
      echo "✅ System restored to previous working state"
    `;
    
    const { execSync } = require('child_process');
    const sshCommandFull = `ssh -o ConnectTimeout=30 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${config.vpsUser}@${config.vpsHost} -p ${config.vpsPort} "${sshCommand}""`;
    
    execSync(sshCommandFull, { stdio: 'inherit' });
    
    log('🔄 Emergency rollback completed successfully!', 'success');
    
  } catch (error) {
    log(`❌ Emergency rollback failed: ${error.message}`, 'error');
    throw error;
  }
}

if (require.main === module) {
  executeDeployment().catch(console.error);
}

module.exports = { executeDeployment, executeRollback };