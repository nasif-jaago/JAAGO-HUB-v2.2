# Runbook: Redis Lock Starvation, Queue Stagnation & Worker Daemon Recovery

## 1. Trigger Conditions & Severity
- **Severity**: P2 / HIGH
- **Triggers**:
  - BullMQ dead-letter queue (DLQ) count > 0.
  - Asynchronous background tasks (CSV exports, PDF generation, email dispatches) stalled for > 10 minutes.
  - Redis distributed lock timeout error (`REDIS_LOCK_TIMEOUT`).

---

## 2. Immediate Diagnostic Steps
1. **Check Worker Service Status**:
   ```bash
   sudo systemctl status jaago-worker.service
   ```
2. **Inspect BullMQ Queue Depths in Redis**:
   ```bash
   redis-cli -h 127.0.0.1 -p 6379 LLEN "bull:jaago-default-queue:wait"
   redis-cli -h 127.0.0.1 -p 6379 LLEN "bull:jaago-default-queue:failed"
   ```
3. **Inspect Worker Journal Logs**:
   ```bash
   journalctl -u jaago-worker.service -n 100 --no-pager
   ```

---

## 3. Mitigation & Remediation Procedures
1. **Clear Stale Distributed Locks**:
   ```bash
   redis-cli -h 127.0.0.1 -p 6379 KEYS "jaago:lock:*" | xargs redis-cli DEL
   ```
2. **Restart Worker Daemons**:
   ```bash
   sudo systemctl restart jaago-worker.service
   ```
3. **Retry Stalled Jobs**:
   - Access `/admin/control-center` &rarr; review queue telemetry &rarr; trigger BullMQ job retry for failed items.

---

## 4. Verification
- Confirm BullMQ queue length drains to 0.
- Confirm System Control Center **QUEUE HEALTH** card shows `100% (Zero DLQ)`.
