# Runbook: Security Incident, API Key Compromise & Vault Master Key Rotation

## 1. Trigger Conditions & Severity
- **Severity**: P1 / CRITICAL
- **Triggers**:
  - API Client Key (`jg_live_*`) exposed in public repository or unauthorized network traffic.
  - Integration Vault AES-256-GCM key compromise.
  - Unauthorized brute-force login attempts detected by Threat Shield.

---

## 2. Immediate Diagnostic Steps
1. **Identify the Compromised Credential**:
   - Query `/admin/api-keys` or inspect auth logs in `/admin/logs` filtering for `EVENT_TYPE: SECURITY`.
2. **Review Affected IP Addresses**:
   - Inspect sliding window rate limiter telemetry in System Control Center.

---

## 3. Mitigation & Remediation Procedures

### Procedure A: Immediate API Key Revocation
1. Log in as Super Administrator at `https://jaagohub.jaago.com.bd/admin/api-keys`.
2. Locate the compromised key (e.g. `jg_live_...`).
3. Click **Revoke Key Immediately**.
4. The key hash is instantly deleted from active cache and DB, terminating all in-flight requests.

### Procedure B: Vault Master Key Rotation (AES-256-GCM)
1. Generate a new 32-byte cryptographically secure hex key:
   ```bash
   openssl rand -hex 32
   ```
2. Update `/etc/jaago-hub/web.env` and `/etc/jaago-hub/worker.env` with `VAULT_MASTER_KEY=<new_hex_key>`.
3. Set strict file permissions:
   ```bash
   sudo chmod 600 /etc/jaago-hub/*.env
   sudo chown jaago:jaago /etc/jaago-hub/*.env
   ```
4. Restart all services:
   ```bash
   sudo systemctl restart jaago-web.service jaago-worker.service
   ```

---

## 4. Verification
- Confirm revoked API keys receive `HTTP 401 Unauthorized`.
- Confirm integration connectors function normally with the rotated vault key.
