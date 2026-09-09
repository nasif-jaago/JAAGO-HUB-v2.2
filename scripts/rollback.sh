#!/bin/bash
set -euo pipefail

# QUICK ROLLBACK SCRIPT
# Usage: ./scripts/rollback.sh

PROJECT_PATH="/home/jfmaster/nextJs"
BACKUP_DIR="/home/jfmaster/backups"
LOG_DIR="/home/jfmaster/nextJs/log"
LOG_FILE="$LOG_DIR/rollback-$(date +%Y%m%d-%H%M%S).log"

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

# Check if backups exist
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/current-*.tar.gz 2>/dev/null)" ]; then
    error_exit "No backups found. Cannot rollback."
fi

# Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/current-*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    error_exit "Could not find a valid backup"
fi

log "${YELLOW}Starting rollback process...${NC}"
log "${YELLOW}Using backup: $LATEST_BACKUP${NC}"

# Stop current service
log "${YELLOW}Stopping hub-jaago service...${NC}"
if ! supervisorctl stop hub-jaago; then
    error_exit "Failed to stop hub-jaago service"
fi

# Restore backup
log "${YELLOW}Restoring backup...${NC}"
cd "$PROJECT_PATH" || error_exit "Cannot access project directory"

rm -rf *
tar -xzf "$LATEST_BACKUP" || error_exit "Failed to restore backup"
rm "$LATEST_BACKUP"

# Install and restart
log "${YELLOW}Installing dependencies...${NC}"
npm ci || error_exit "npm install failed during rollback"

log "${YELLOW}Starting service...${NC}"
if ! supervisorctl start hub-jaago; then
    error_exit "Failed to start hub-jaago service"
fi

# Health check
log "${YELLOW}Running health check...${NC}"
sleep 10

if curl -f -s --max-time 30 http://localhost:3000/api/v1/health; then
    log "${GREEN}✅ Rollback completed successfully!${NC}"
    log "${GREEN}✅ Service is healthy and responding${NC}"
else
    error_exit "Rollback failed - health check failed"
fi

log "${GREEN}=== ROLLBACK SUMMARY ==="
log "${GREEN}✅ Rollback completed at $(date)"
log "${GREEN}✅ Service is running"
log "${GREEN}=== END SUMMARY ==="
