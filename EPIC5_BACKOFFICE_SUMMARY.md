# Epic 5: Back Office Dashboard - Summary for GitHub Issue

**Correlation ID:** ZHC-MadMatch-20260302-Epic5  
**Product:** MadMatch  
**Type:** Internal tooling (admin/ops)  
**Complexity:** Medium (36h / 6 slices)  
**Risk:** Low (isolated admin route)

---

## 🎯 Problem Statement

MadMatch operationer mangler synlighed:
- ❌ Kan ikke monitorere scraper jobs live (Arla scraper tog 2+ timer, ingen live status)
- ❌ Ingen database statistik (hvor mange opskrifter, hvilke kilder, vækst)
- ❌ Ingen API performance tracking (response times, error rates)
- ❌ Ingen system health dashboard

**Epic 5 enables:**
- Real-time scraper job monitoring (active jobs + history)
- Database metrics (total recipes, growth, data quality)
- API performance (response times, error rates, uptime)
- System health (backend status, DB connection, disk usage)

---

## 👤 User Story

**As an** operations team member (CEO + future ops)  
**I want to** monitor MadMatch system health and scraper jobs  
**So that** I can track progress, diagnose issues, and ensure data quality

---

## ✅ Implementation Plan (6 Slices)

### Slice 1: Authentication & Layout (6h)
- [ ] `/admin` route with password protection
- [ ] Login page (password input, bcrypt hash comparison)
- [ ] Session token (30min expiry, localStorage)
- [ ] Left sidebar menu (Dashboard, Scrapers, Database, API, Health)
- [ ] Logout button
- [ ] Rate limiting on login endpoint

### Slice 2: Dashboard Overview (4h)
- [ ] Overview cards (Total Recipes, Active Jobs, API Uptime, Error Rate)
- [ ] Recent scraper jobs list (last 10)
- [ ] Quick links to sections
- [ ] Responsive grid layout

### Slice 3: Scraper Job Monitoring (8h)
- [ ] Active jobs table (source, progress %, start time, ETA)
- [ ] Job history table (last 30 days, filterable by source/status)
- [ ] Success/failure rate chart (line chart, last 30 days)
- [ ] Resume capability indicator (which scrapers support resume)
- [ ] Poll `/api/admin/scrapers/active` every 10s

### Slice 4: Database Statistics (6h)
- [ ] Total recipes count (real-time)
- [ ] Recipes by source (pie chart: Arla, Føtex, etc.)
- [ ] Growth chart (last 30 days, line chart)
- [ ] Data quality metrics (% recipes with images, % with nutrition data)
- [ ] Disk usage (recipes table size in MB)

### Slice 5: API Performance (6h)
- [ ] Response time chart (p50, p95, p99 - last 24h)
- [ ] Error rate chart (last 7 days)
- [ ] Top slowest endpoints table
- [ ] Uptime percentage (last 30 days)
- [ ] Poll `/api/admin/performance` every 30s

### Slice 6: Polish & System Health (6h)
- [ ] System health indicators (backend status, DB connection)
- [ ] Memory/CPU usage (if available)
- [ ] Accessibility (keyboard nav, ARIA labels)
- [ ] Mobile responsive (collapsible sidebar)
- [ ] Error boundaries
- [ ] Loading states

---

## 🔧 Technical Notes

**Frontend:**
- Route: `/admin` in MadMatch React app
- Charts: Recharts library (lightweight, already used)
- Real-time: HTTP polling (10s for jobs, 30s for performance)
- Auth: Session token in localStorage (30min expiry)

**Backend:**
- Endpoints: `/api/admin/login`, `/api/admin/scrapers/*`, `/api/admin/stats/*`, `/api/admin/performance/*`
- Middleware: `requireAdmin()` (check session token)
- Database: New `scraper_jobs` table (id, source, status, recipes_scraped, start_time, end_time)
- Auth: bcrypt hash comparison, env var `ADMIN_PASSWORD`

**Database Schema (scraper_jobs):**
```sql
CREATE TABLE scraper_jobs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
  recipes_scraped INT DEFAULT 0,
  total_target INT,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  error_message TEXT,
  resume_capable BOOLEAN DEFAULT FALSE
);
```

---

## ✅ Acceptance Criteria (Summary)

**Authentication:**
- [ ] `/admin` password protected (bcrypt)
- [ ] Session token expires after 30min
- [ ] Rate limiting (5 attempts/min)

**Dashboard:**
- [ ] Overview cards (4 key metrics)
- [ ] Recent jobs (last 10)

**Scraper Monitoring:**
- [ ] Active jobs visible with progress %
- [ ] Job history (last 30 days)
- [ ] Success/failure chart

**Database Stats:**
- [ ] Total recipes count
- [ ] Recipes by source (pie chart)
- [ ] Growth chart (30 days)

**API Performance:**
- [ ] Response time chart (p50/p95/p99)
- [ ] Error rate (7 days)
- [ ] Uptime percentage

**System Health:**
- [ ] Backend status indicator
- [ ] DB connection status
- [ ] Disk usage

---

## ⏱️ Timeline

| Slice | Hours | Cumulative |
|-------|-------|------------|
| Slice 1: Auth & Layout | 6h | 6h |
| Slice 2: Dashboard | 4h | 10h |
| Slice 3: Scrapers | 8h | 18h |
| Slice 4: Database | 6h | 24h |
| Slice 5: API Performance | 6h | 30h |
| Slice 6: Polish & Health | 6h | 36h |

**Total:** 36 hours (~4.5 days)  
**Target:** TBD (after Epic 4 complete)

---

## 🚫 Out of Scope

- ❌ User management (single admin password only)
- ❌ Scraper job triggering (manual only via CLI)
- ❌ Database migrations UI
- ❌ Email alerts (future)
- ❌ Slack notifications (future)

---

## 📊 Success Metrics

- CEO checks dashboard 2x/day during scraper runs
- Debugging time reduced by 50% (vs. checking logs manually)
- Scraper failures detected within 1 minute

---

**Correlation ID:** ZHC-MadMatch-20260302-Epic5  
**Ready for Implementation:** After Epic 4 complete  
**GitHub Issue:** TBD
