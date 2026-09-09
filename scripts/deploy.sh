#!/bin/bash
set -euo pipefail

# JAAGO HUB DEPLOYMENT SCRIPT
# Usage: ./scripts/deploy.sh [rollback]

PROJECT_PATH="/home/jfmaster/nextJs"
BACKUP_DIR="/home/jfmaster/backups"
LOG_DIR="/home/jfmaster/nextJs/log"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

check_prerequisites() {
    log "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        error_exit "package.json not found. Are you in the correct directory?"
    fi
    
    # Check if supervisor is available
    if ! command -v supervisorctl >/dev/null 2>&1; then
        error_exit "supervisorctl not found"
    fi
    
    # Check service status
    if supervisorctl status hub-jaago >/dev/null 2>&1; then
        log "Current service status: $(supervisorctl status hub-jaago)"
    else
        log "${YELLOW}Warning: hub-jaago service is not registered or not running${NC}"
    fi
    
    log "${GREEN}Prerequisites check completed${NC}"
}

create_backup() {
    log "${YELLOW}Creating backup...${NC}"
    
    cd "$PROJECT_PATH" || error_exit "Cannot access project directory"
    
    # Create git backup
    git status --porcelain | grep -v '^??' && git stash push -m "backup-$(date +%Y%m%d-%H%M%S)" || true
    
    # Create project backup
    if tar -czf "$BACKUP_DIR/current-$(date +%Y%m%d-%H%M%S).tar.gz" . 2>/dev/null; then
        log "${GREEN}Backup created successfully${NC}"
    else
        error_exit "Backup creation failed"
    fi
}

deploy() {
    log "${YELLOW}Starting deployment...${NC}"
    
    # Pull latest changes
    log "${YELLOW}Pulling latest changes...${NC}"
    cd "$PROJECT_PATH" || error_exit "Cannot access project directory"
    git pull origin main || error_exit "Git pull failed"
    
    # Clean and install
    log "${YELLOW}Installing dependencies...${NC}"
    npm ci || error_exit "npm install failed"
    
    # Build
    log "${YELLOW}Building project...${NC}"
    npm run build || error_exit "Build failed"
    
    # Restart services (your existing supervisor command)
    log "${YELLOW}Restarting services...${NC}"
    if supervisorctl restart hub-jaago; then
        log "${GREEN}Services restarted successfully${NC}"
    else
        error_exit "Failed to restart hub-jaago"
    fi
    
    # Health check
    log "${YELLOW}Running health check...${NC}"
    sleep 15
    
    if curl -f -s --max-time 30 http://localhost:3000/api/v1/health; then
        log "${GREEN}Health check passed!${NC}"
    else
        error_exit "Health check failed"
    fi
    
    # Verify module registration
    log "${YELLOW}Verifying module registration...${NC}"
    if curl -s http://localhost:3000/api/v1/modules | grep -q '"key"'; then
        log "${GREEN}Module registration verified!${NC}"
    else
        error_exit "Module registration failed"
    fi
    
    log "${GREEN}Deployment completed successfully!${NC}"
}

rollback() {
    log "${YELLOW}Starting rollback...${NC}"
    
    cd "$PROJECT_PATH" || error_exit "Cannot access project directory"
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/current-*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error_exit "No backup found to rollback to"
    fi
    
    log "${YELLOW}Rolling back to: $LATEST_BACKUP${NC}"
    
    # Stop current service
    log "${YELLOW}Stopping current service...${NC}"
    if supervisorctl stop hub-jaago; then
        log "${GREEN}Service stopped successfully${NC}"
    else
        error_exit "Failed to stop hub-jaago"
    fi
    
    # Restore backup
    log "${YELLOW}Restoring backup...${NC}"
    rm -rf *
    tar -xzf "$LATEST_BACKUP" || error_exit "Failed to restore backup"
    rm "$LATEST_BACKUP"
    
    # Install and restart
    log "${YELLOW}Installing dependencies...${NC}"
    npm ci || error_exit "npm install failed during rollback"
    
    log "${YELLOW}Starting service...${NC}"
    if supervisorctl start hub-jaago; then
        log "${GREEN}Service started successfully${NC}"
    else
        error_exit "Failed to start hub-jaago after rollback"
    fi
    
    # Health check
    log "${YELLOW}Running health check...${NC}"
    sleep 10
    
    if curl -f -s --max-time 30 http://localhost:3000/api/v1/health; then
        log "${GREEN}Rollback successful and health check passed!${NC}"
    else
        error_exit "Rollback successful but health check failed"
    fi
    
    log "${GREEN}Rollback completed successfully!${NC}"
}

cleanup() {
    log "${YELLOW}Cleaning up old backups...${NC}"
    
    # Remove backups older than 7 days
    find "$BACKUP_DIR" -name "current-*.tar.gz" -mtime +7 -delete
    
    # Keep only recent backups (last 5)
    cd "$BACKUP_DIR" || return
    ls -t current-*.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    log "${GREEN}Cleanup completed${NC}"
}

# Main script
if [ "$1" = "rollback" ]; then
    create_backup
    rollback
else
    check_prerequisites
    create_backup
    deploy
    cleanup
    
    log "${GREEN}=== DEPLOYMENT SUMMARY ==="
    log "${GREEN}✅ Deployment completed at $(date)"
    log "${GREEN}✅ All checks passed"
    log "${GREEN}✅ Backups maintained"
    log "${GREEN}=== END SUMMARY ==="
fi

# Usage help
if [ "$1" = "--help" ]; then
    echo "JAAGO HUB Deployment Script"
    echo "============================"
    echo ""
    echo "USAGE:"
    echo "  ./scripts/deploy.sh                    # Deploy new changes"
    echo "  ./scripts/deploy.sh rollback           # Emergency rollback to latest backup"
    echo ""
    echo "OPTIONS:"
    echo "  --help                                 Show this help message"
    echo ""
    echo "The script will:"
    echo "1. Check prerequisites (package.json, supervisor)"
    echo "2. Create backup of current code"
    echo "3. Deploy latest changes (git pull, npm install, build)"
    echo "4. Restart services (hub-jaago)"
    echo "5. Run health checks"
    echo "6. Clean up old backups"
    echo ""
    echo "LOGS:"
    echo "  All deployment logs are saved to: $LOG_DIR/deploy-<timestamp>.log"
    exit 0
fi
