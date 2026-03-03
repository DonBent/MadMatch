# Arla Scraper Scripts

## Quick Start

### Production Scrape (1000 recipes)
```bash
./scrape-arla-wrapper.sh 1000
```

### Test Run (50 recipes)
```bash
./test-process-restart.sh
```

### Dry Run (no database writes)
```bash
./scrape-arla-wrapper.sh 500 --dry-run
```

---

## Files

### `scrape-arla-wrapper.sh` ⭐ **NEW - CDP Timeout Fix**
**Purpose:** Process restart wrapper to break 30-minute CDP barrier  
**Correlation ID:** ZHC-MadMatch-20260302-ProcessRestartFix

**Features:**
- Restarts entire Node.js process every 200 recipes (~20 min)
- Automatic resume from database
- No data loss, no duplicates
- Comprehensive logging
- Enables unlimited scraping

**Usage:**
```bash
# Scrape 1000 recipes with auto-restart
./scrape-arla-wrapper.sh 1000

# Resume interrupted scrape (just run again)
./scrape-arla-wrapper.sh 1000

# Dry run
./scrape-arla-wrapper.sh 500 --dry-run
```

---

### `test-process-restart.sh` ⭐ **NEW**
**Purpose:** Test wrapper with small batch (50 recipes, restart every 25)

**Usage:**
```bash
./test-process-restart.sh
```

**What it tests:**
- Process restart mechanism
- Resume capability
- No duplicate recipes
- Log output

---

### `scrape-arla.js`
**Purpose:** Main scraper CLI (used by wrapper)

**Direct usage (bypasses wrapper, limited to ~900 recipes):**
```bash
node scrape-arla.js --limit 500 --rate-limit 2000
node scrape-arla.js --dry-run --limit 100 --verbose
```

**Options:**
- `--limit <number>`: Max recipes to scrape
- `--dry-run`: Parse without database writes
- `--verbose`: Detailed logging
- `--rate-limit <ms>`: Delay between requests (default: 2000)

---

### `test-arla-scraper.js`
**Purpose:** Unit tests for ArlaScraper class

**Usage:**
```bash
node test-arla-scraper.js
```

---

### `test-single-with-scraper.js`
**Purpose:** Test scraping a single recipe URL

**Usage:**
```bash
node test-single-with-scraper.js
```

---

## Which One Should I Use?

### For Production Scraping (>500 recipes)
✅ **Use `scrape-arla-wrapper.sh`**
- Handles CDP timeout
- Automatic resume
- Unlimited recipes
- Best for large scrapes

### For Quick Tests (<100 recipes)
✅ **Use `scrape-arla.js` directly**
- Faster (no wrapper overhead)
- Good for testing changes
- Won't hit CDP timeout

### For Development/Testing
✅ **Use `test-process-restart.sh`**
- Validates wrapper works
- Small batch (50 recipes)
- Quick feedback

---

## Troubleshooting

### "Scraper script not found"
**Fix:** Run from `/opt/madmatch-dev/backend/scripts/` directory

### "Database connection failed"
**Fix:** Check `.env` file in `/opt/madmatch-dev/backend/`

### "Still hitting timeout"
**Fix:** Reduce `CHUNK_SIZE` in wrapper script (currently 200)

### "Duplicates being created"
**Fix:** This shouldn't happen - scraper checks before insert. Report if seen.

---

## Logs Location

- **Wrapper logs:** `../logs/scraper-wrapper-YYYY-MM-DD.log`
- **Scraper errors:** `../logs/scraper-errors-YYYY-MM-DD.log`
- **Console output:** Real-time with color codes

---

## Documentation

See `/opt/madmatch-dev/backend/PROCESS_RESTART_SOLUTION.md` for:
- Architecture details
- How it works
- Configuration tuning
- Performance metrics
- Full troubleshooting guide

---

**Correlation ID:** ZHC-MadMatch-20260302-ProcessRestartFix  
**Epic:** 3.5 Slice 5 - CDP Timeout Fix
