# Manual PR Creation Instructions

**Status:** Branch `feat/real-data-integration` has been successfully pushed to GitHub.

**Correlation ID:** ZHC-MadMatch-20260227-003

## Current State ✅
- [x] All changes committed to branch `feat/real-data-integration`
- [x] Branch pushed to origin
- [x] Commit hash: `f6b0d71`
- [x] 8 files changed, 6,439 insertions

## Required Manual Steps

### Step 1: Create GitHub Issue

1. Go to: https://github.com/DonBent/MadMatch/issues/new
2. **Title:** `Integrate real tilbud data from Salling Group API`
3. **Body:** Copy from `/tmp/issue_body.md` (or use shortened version below)
4. **Labels:** `enhancement`, `epic-2`, `high-priority`, `backend`
5. **Note the issue number** (e.g., #3)

**Shortened Issue Body:**
```markdown
# Integrate Real Tilbud Data Source

**Epic:** Epic 2 - Real Data Integration  
**Correlation ID:** ZHC-MadMatch-20260227-003  

## Problem
MadMatch currently uses 15 hardcoded mock tilbud. Need real data from Salling Group API.

## Solution
- Integrate Salling Group Food Waste API
- Add caching layer (1h TTL)
- Fallback to mock data on API failure
- Preserve existing API contract (no frontend changes)

## Acceptance Criteria
- Real tilbud data displays (min 10 tilbud)
- Data refreshes hourly
- API failures don't crash app
- Tests pass
- Structured logging
```

### Step 2: Create Pull Request

1. Go to: https://github.com/DonBent/MadMatch/compare/main...feat/real-data-integration
2. Click "Create pull request"
3. **Title:** `feat: integrate Salling Group API for real tilbud data`
4. **Body:** Copy from `/tmp/pr_body.md` 
   - **Important:** Update `related-issue: TBD` to the issue number from Step 1
   - Example: `related-issue: 3`
5. Click "Create pull request"

**Quick PR Body** (if needed):
```markdown
---
type: feature
product: MadMatch
version-impact: minor
data-impact: none
requires-migration: false
breaking-change: false
correlation-id: ZHC-MadMatch-20260227-003
related-issue: #TBD
---

## Summary
Integration of Salling Group Food Waste API for real tilbud data.

## Changes
- New: `backend/services/tilbudDataService.js` (12KB)
- Tests: `tilbudDataService.test.js` (11KB, 20 test cases)
- Updated: `server.js`, `package.json`
- Config: `.env.example` with API variables
- Docs: `TILBUD_DATA_RESEARCH.md`, `IMPLEMENTATION_COMPLETE.md`

## Features
- Hybrid approach: Real API + mock fallback
- 1-hour caching (NodeCache)
- Error handling with multi-level fallback
- 40 enhanced mock tilbud as safety net
- Backward compatible (zero frontend changes)

## Tests
✅ All 20+ tests passing
- Salling API integration (mocked)
- Caching behavior
- Error fallback chain
- Filter logic
- Schema validation

## Next Steps
1. zhc-tester: QA with real API key
2. zhc-deployer: Production deployment
```

## File Locations

All necessary files are ready:
- **Issue body:** `/tmp/issue_body.md` (full version)
- **PR body:** `/tmp/pr_body.md` (complete with OUTPUT_FORMATS.md compliance)
- **Commit:** `f6b0d71` on branch `feat/real-data-integration`

## URLs

- **Create Issue:** https://github.com/DonBent/MadMatch/issues/new
- **Create PR:** https://github.com/DonBent/MadMatch/compare/main...feat/real-data-integration
- **Branch URL:** https://github.com/DonBent/MadMatch/tree/feat/real-data-integration

## Verification

After creating PR, verify:
- PR shows 8 files changed
- All tests pass in PR view
- Issue is referenced in PR body
- Labels are applied
- Ready for zhc-tester to review

---

**Reason for manual creation:** GitHub API authentication failed (401). Branch push succeeded via git credentials, but REST API requires different token configuration.

**Alternative:** If GitHub CLI (`gh`) is installed:
```bash
# Create issue
gh issue create --repo DonBent/MadMatch --title "Integrate real tilbud data from Salling Group API" --body-file /tmp/issue_body.md --label "enhancement,epic-2,high-priority,backend"

# Create PR (update issue number)
gh pr create --repo DonBent/MadMatch --base main --head feat/real-data-integration --title "feat: integrate Salling Group API for real tilbud data" --body-file /tmp/pr_body.md
```
