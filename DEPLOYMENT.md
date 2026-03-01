# MadMatch Deployment Checklist

## Pre-Deployment (MANDATORY)

**1. Run pre-deployment check:**
```bash
cd /opt/madmatch-{env}
./pre-deploy-check.sh
```

This script:
- ✅ Verifies `.env` exists (creates from `.env.example` if missing)
- ✅ Prevents "API endpoint not defined" errors
- ✅ Takes 2 seconds

**NEVER skip this step.**

## Deployment Steps

**2. Pull latest code:**
```bash
git pull origin main
```

**3. Install dependencies:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

**4. Restart services:**
```bash
sudo systemctl restart madmatch-{env}-backend
sudo systemctl restart madmatch-{env}-frontend
```

**5. Verify:**
```bash
curl http://localhost:4001/health
curl http://localhost:8080
```

## Rollback (if needed)

```bash
git log --oneline -5  # Find last working commit
git reset --hard <commit-hash>
./pre-deploy-check.sh
sudo systemctl restart madmatch-{env}-backend madmatch-{env}-frontend
```
