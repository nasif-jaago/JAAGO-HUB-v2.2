# Runbook: PostgreSQL Database Failover, Pool Starvation & Encrypted Disaster Recovery

## 1. Trigger Conditions & Severity
- **Severity**: P1 / CRITICAL
- **Triggers**:
  - PostgreSQL connection timeout / pool exhaustion (`DATABASE_POOL_EXHAUSTED`).
  - Read/write replica replication lag exceeding 10 seconds.
  - Catastrophic storage corruption or accidental data drop.

---

## 2. Immediate Diagnostic Steps
1. **Check Pool Telemetry**:
   - Access the System Control Center at `https://jaagohub.jaago.com.bd/admin/control-center`.
   - Inspect the **PostgreSQL & RLS Isolation** card for active/idle client counts.
2. **Inspect Server Logs**:
   ```bash
   journalctl -u jaago-web.service -n 100 --no-pager | grep "DATABASE"
   ```
3. **Check PostgreSQL Process State**:
   ```bash
   sudo -u postgres psql -c "SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state != 'idle';"
   ```

---

## 3. Mitigation & Remediation Procedures

### Procedure A: Remediating Connection Pool Exhaustion
1. Terminate long-running or stalled queries:
   ```bash
   sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';"
   ```
2. Restart the application connection pool:
   ```bash
   sudo systemctl restart jaago-web.service
   ```

### Procedure B: Restoring from Encrypted AES-256-GCM Backup Archive
1. Identify the latest verified backup package in Google Drive or `/var/jaago/backups/`:
   ```bash
   ls -la /var/jaago/backups/backup_*.enc
   ```
2. Decrypt and verify manifest checksums:
   ```bash
   pnpm --filter @jaago/storage run restore --archive=/var/jaago/backups/backup_latest.enc
   ```
3. Verify tenant RLS isolation and integrity:
   ```bash
   pnpm test
   ```

---

## 4. Verification & Post-Mortem
- Confirm `/health/ready` returns HTTP 200 with database status `healthy`.
- Review AI Log Diagnostics report in Control Center for root cause analysis.
