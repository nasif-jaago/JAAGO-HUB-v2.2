#!/bin/bash
# JAAGO HUB MONITORING SCRIPT

PROJECT_PATH="/home/jfmaster/nextJs"
LOG_DIR="/home/jfmaster/nextJs/log"
LOG_FILE="$LOG_DIR/monitor-$(date +%Y%m%d-%H%M%S).log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Redirect all output to log file
exec >> "$LOG_FILE" 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_deployment_status() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local status="healthy"
    local message="All systems operational"
    
    # Check supervisor status
    if ! supervisorctl status hub-jaago >/dev/null 2>&1; then
        status="critical"
        message="hub-jaago service is not running"
        echo "${RED}CRITICAL: $message at $timestamp${NC}"
    fi
    
    # Check application health
    if ! curl -f -s --max-time 10 "http://localhost:3000/api/v1/health" >/dev/null 2>&1; then
        if [ "$status" = "healthy" ]; then
            status="warning"
            message="Health endpoint is not responding"
        fi
        echo "${YELLOW}WARNING: $message at $timestamp${NC}"
    fi
    
    # Output for monitoring
    echo "Status: $status"
    echo "Message: $message"
    echo "Timestamp: $timestamp"
    
    return 0
}

# Run health check
check_deployment_status

# Send alert if critical
if [ "$status" = "critical" ] && [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
         -H 'Content-type: application/json' \
         --data "{\"text\":\"🚨 CRITICAL: JAAGO HUB deployment issue detected at $timestamp\"}"
fi
