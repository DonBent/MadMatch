# MadMatch Deployment Guide

**Version:** 1.0.0  
**Correlation ID:** ZHC-MadMatch-20260227-002

## Overview

MadMatch runs in two environments on the same host:

- **DEV:** http://192.168.1.203:8080
- **PROD:** http://192.168.1.203:8081

Each environment has:
- Backend API (Node.js/Express)
- Frontend (React build served via nginx)
- Systemd services for process management

---

## Architecture

```
┌─────────────────────────────────────────┐
│          Nginx (80, 8080, 8081)         │
└─────────────────────────────────────────┘
         │                      │
    DEV (:8080)            PROD (:8081)
         │                      │
    ┌────┴─────┐           ┌────┴─────┐
    │ Frontend │           │ Frontend │
    │  (build) │           │  (build) │
    └──────────┘           └──────────┘
         │                      │
    ┌────┴─────┐           ┌────┴─────┐
    │ Backend  │           │ Backend  │
    │  :4001   │           │  :4002   │
    └──────────┘           └──────────┘
```

---

## Deployment Methods

### 1. Automated Deployment (Recommended)

Deploy both environments with automated validation:

```bash
cd /opt/madmatch
./madmatch-deploy.sh both
```

Deploy only DEV:

```bash
./madmatch-deploy.sh dev
```

Deploy only PROD:

```bash
./madmatch-deploy.sh prod
```

Skip validation tests (not recommended):

```bash
./madmatch-deploy.sh both skip-validation
```

---

### 2. Manual Deployment

If you need to deploy manually:

#### Backend

```bash
cd /opt/madmatch/backend
npm install --production
sudo systemctl restart madmatch-dev-backend
sudo systemctl restart madmatch-prod-backend
```

#### Frontend

```bash
cd /opt/madmatch/frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## Validation Testing

### Run Validation Tests Standalone

After deployment, verify everything works:

```bash
cd /opt/madmatch
./validate-deployment.sh
```

### What Gets Validated

The validation suite checks:

1. **Backend Health Checks**
   - DEV backend responds HTTP 200 at `/api/health`
   - PROD backend responds HTTP 200 at `/api/health`
   - Health endpoints return valid JSON with `"status":"ok"`

2. **Frontend Availability**
   - DEV frontend serves HTML with HTTP 200
   - PROD frontend serves HTML with HTTP 200
   - HTML contains "MadMatch" title
   - HTML references bundle.js/main.js

3. **API Data Validation**
   - DEV `/api/tilbud` returns valid JSON array
   - PROD `/api/tilbud` returns valid JSON array
   - Data structure has required fields: id, navn, butik, kategori
   - Returns at least 1 tilbud

4. **Service Status**
   - All systemd services running:
     - `madmatch-dev-backend`
     - `madmatch-dev-frontend`
     - `madmatch-prod-backend`
     - `nginx`
   - No critical errors in nginx error log (last 100 lines)

### Test Output

```
==================================================
MadMatch Deployment Validation Test Suite
Correlation ID: ZHC-MadMatch-20260227-002
Started: Thu Feb 27 16:00:00 CET 2026
==================================================

TEST: Backend Health Check - DEV
✓ PASS: DEV backend responds with HTTP 200
✓ PASS: DEV health endpoint returns valid JSON with status:ok

[... more tests ...]

==================================================
TEST SUMMARY
==================================================
Total Tests: 18
Passed: 18
Failed: 0
Duration: 8s
==================================================
✓ ALL TESTS PASSED
```

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

### Test Duration

Tests complete in **<30 seconds** under normal conditions.

---

## Service Management

### Check Service Status

```bash
sudo systemctl status madmatch-dev-backend
sudo systemctl status madmatch-dev-frontend
sudo systemctl status madmatch-prod-backend
sudo systemctl status nginx
```

### View Logs

```bash
# Backend logs
sudo journalctl -u madmatch-dev-backend -f
sudo journalctl -u madmatch-prod-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
sudo systemctl restart madmatch-dev-backend
sudo systemctl restart madmatch-prod-backend
sudo systemctl reload nginx
```

---

## Rollback

To rollback to a previous version:

```bash
cd /opt/madmatch
git checkout <previous-tag>  # e.g., v0.9.0
./madmatch-deploy.sh both
```

Verify rollback:

```bash
./validate-deployment.sh
```

---

## Health Check Endpoints

### DEV
- Backend Health: http://192.168.1.203:8080/api/health
- Frontend: http://192.168.1.203:8080/
- API Tilbud: http://192.168.1.203:8080/api/tilbud

### PROD
- Backend Health: http://192.168.1.203:8081/api/health
- Frontend: http://192.168.1.203:8081/
- API Tilbud: http://192.168.1.203:8081/api/tilbud

---

## Troubleshooting

### Homepage Doesn't Load

**Symptom:** Blank page or 502 Bad Gateway

**Common Causes:**
1. Nginx IPv6 binding issue
2. Backend service not running
3. Frontend build missing

**Solutions:**

```bash
# Check nginx config
sudo nginx -t

# Check backend services
sudo systemctl status madmatch-dev-backend
sudo systemctl status madmatch-prod-backend

# Check if backend is listening
sudo netstat -tlnp | grep :4001
sudo netstat -tlnp | grep :4002

# Rebuild frontend
cd /opt/madmatch/frontend
npm run build
sudo systemctl reload nginx
```

### Validation Tests Fail

**Symptom:** `./validate-deployment.sh` exits with code 1

**Solutions:**

1. Read the test output - it shows exactly which test failed and why
2. Check the specific URL mentioned in the error
3. Check service status: `sudo systemctl status <service-name>`
4. Check logs: `sudo journalctl -u <service-name> -n 50`

### Backend Not Responding

**Symptom:** Health check returns HTTP 000 or timeouts

**Solutions:**

```bash
# Restart backend
sudo systemctl restart madmatch-dev-backend

# Check logs
sudo journalctl -u madmatch-dev-backend -n 50

# Check if port is in use
sudo netstat -tlnp | grep :4001
```

### Nginx Errors

**Symptom:** Critical errors in validation tests

**Solutions:**

```bash
# Check nginx error log
sudo tail -n 100 /var/log/nginx/error.log | grep -E '\[emerg\]|\[alert\]|\[crit\]'

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## CI/CD Integration

The validation test suite can be integrated into CI/CD pipelines:

```bash
# In your CI script
./madmatch-deploy.sh both
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "Deployment or validation failed"
  exit 1
fi
```

---

## Pre-Deployment Checklist

Before deploying to PROD:

- [ ] Code merged to `main` branch
- [ ] Version tag created (semantic versioning)
- [ ] Deploy to DEV first
- [ ] Run validation tests on DEV
- [ ] Manual smoke test on DEV
- [ ] Deploy to PROD
- [ ] Run validation tests on PROD
- [ ] Verify critical flows in PROD

---

## Emergency Procedures

### Complete Service Restart

```bash
sudo systemctl restart madmatch-dev-backend
sudo systemctl restart madmatch-prod-backend
sudo systemctl reload nginx
sleep 5
./validate-deployment.sh
```

### Nuclear Option (Fresh Deployment)

```bash
cd /opt/madmatch
git fetch --all
git reset --hard origin/main
./madmatch-deploy.sh both
```

---

## Monitoring

### Quick Health Check

```bash
# Check all services at once
systemctl is-active madmatch-dev-backend madmatch-prod-backend nginx

# Run full validation
./validate-deployment.sh
```

### Automated Monitoring

Add to crontab for periodic validation:

```bash
# Run validation every hour and log results
0 * * * * cd /opt/madmatch && ./validate-deployment.sh >> /var/log/madmatch-validation.log 2>&1
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-27 | Initial deployment with validation suite |

---

## Support

For deployment issues:

1. Run `./validate-deployment.sh` and capture output
2. Check service logs: `sudo journalctl -u <service> -n 100`
3. Check nginx logs: `sudo tail -n 100 /var/log/nginx/error.log`
4. Document exact error messages and steps to reproduce
