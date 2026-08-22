# Runbook: Disk Spool Safety Cap Breach & Log Runner Recovery

## 1. Trigger Conditions & Severity
- **Severity**: P2 / HIGH
- **Triggers**:
  - Bounded spool buffer directory (`/var/jaago/spool`) exceeding 400 MB (80% of 500 MB hard safety cap).
  - Gzip compression pipeline stalled or `jaago-log-runner.service` process dead.

---

## 2. Immediate Diagnostic Steps
1. **Check Spool Size on Host**:
   ```bash
   du -sh /var/jaago/spool
   ls -la /var/jaago/spool | wc -l
   ```
2. **Check Log Runner Service Status**:
   ```bash
   sudo systemctl status jaago-log-runner.service
   ```
3. **Inspect Log Runner Output**:
   ```bash
   journalctl -u jaago-log-runner.service -n 50 --no-pager
   ```

---

## 3. Mitigation & Remediation Procedures
1. If `jaago-log-runner.service` is stopped, immediately restart it:
   ```bash
   sudo systemctl restart jaago-log-runner.service
   ```
2. If the service is stuck on a corrupted file, archive corrupted files to `/tmp/jaago-spool-quarantine/`:
   ```bash
   mkdir -p /tmp/jaago-spool-quarantine
   mv /var/jaago/spool/corrupted_* /tmp/jaago-spool-quarantine/
   sudo systemctl restart jaago-log-runner.service
   ```
3. Verify spool buffer clears below 50 MB.

---

## 4. Verification
- Open System Control Center (`/admin/control-center`) &rarr; confirm **DISK SPOOL CAP** reads `< 50 MB / 500 MB (Optimal)`.
