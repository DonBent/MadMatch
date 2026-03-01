# QA Test Plan - Epic 3.5: Database Infrastructure & Multi-Source Recipe System

**Version:** 1.0.0  
**Correlation ID:** ZHC-MadMatch-Epic3.5-DatabaseInfrastructure  
**Created:** 2026-03-01  
**QA Owner:** ZHC Developer (testing phase)

---

## Test Overview

This document provides a comprehensive manual testing checklist for Epic 3.5. All acceptance criteria must be verified before deployment to production.

### Test Scope

- ✅ Database infrastructure (PostgreSQL + Prisma)
- ✅ Recipe abstraction layer (DatabaseRecipeSource, SpoonacularRecipeSource)
- ✅ RecipeService orchestrator (multi-source fallback)
- ✅ Arla scraper functionality
- ✅ REST API endpoints (4 endpoints)
- ✅ Frontend integration (source badges, language flags)
- ✅ Backward compatibility (Epic 2)
- ✅ Performance and caching
- ✅ Error handling and edge cases

### Test Environment

**DEV:**
- Backend: http://localhost:4001
- Frontend: http://localhost:3000
- Database: PostgreSQL 17.8 (local)

**PROD:**
- Backend: https://api.madmatch.dk
- Frontend: https://madmatch.dk
- Database: PostgreSQL 17.8 (hosted)

---

## Pre-Test Setup

### ✅ Checklist: Environment Setup

- [ ] PostgreSQL 17.8 installed and running
- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] `.env` file configured with correct DATABASE_URL
- [ ] Database migrations applied (`npm run prisma:migrate:dev`)
- [ ] Database seeded (`npm run seed`)
- [ ] Arla recipes scraped (`npm run scrape:arla -- --limit 100`)
- [ ] Backend server running (`npm start` in backend/)
- [ ] Frontend server running (`npm start` in frontend/)

### Verify Setup

```bash
# 1. Check backend health
curl http://localhost:4001/health
# Expected: {"status":"healthy","timestamp":"..."}

# 2. Check database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes;"
# Expected: >= 100

# 3. Check recipe sources
curl http://localhost:4001/api/recipes/sources
# Expected: {"sources":[...], "total": >= 1}

# 4. Open frontend
open http://localhost:3000
# Expected: Application loads successfully
```

---

## Test Suite 1: Database Infrastructure

### Test 1.1: Database Connection

**Objective:** Verify PostgreSQL database is accessible

**Steps:**
1. Run: `psql $DATABASE_URL -c "SELECT version();"`
2. Verify PostgreSQL version is 17.8+

**Expected Result:**
- ✅ Connection succeeds
- ✅ Version is PostgreSQL 17.8 or higher

### Test 1.2: Schema Validation

**Objective:** Verify all tables and indexes exist

**Steps:**
1. Run Prisma Studio: `npm run prisma:studio`
2. Open http://localhost:5555
3. Verify tables exist:
   - `recipe_sources`
   - `recipes`
   - `recipe_ingredients`
   - `scraping_jobs`

**Expected Result:**
- ✅ All 4 tables visible in Prisma Studio
- ✅ Tables have correct columns (refer to schema.prisma)

### Test 1.3: GIN Indexes

**Objective:** Verify full-text search indexes exist

**Steps:**
1. Run: `psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'recipes';"`
2. Check for `idx_recipe_title_gin`

**Expected Result:**
- ✅ GIN index exists for full-text search
- ✅ Index is on `title` field

### Test 1.4: Seed Data

**Objective:** Verify seed script creates recipe sources

**Steps:**
1. Run: `psql $DATABASE_URL -c "SELECT * FROM recipe_sources;"`
2. Verify Arla source exists

**Expected Result:**
- ✅ At least 1 recipe source exists (Arla)
- ✅ Source has correct fields (id, name, url, language='da')

### Test 1.5: Recipe Count

**Objective:** Verify recipes were scraped

**Steps:**
1. Run: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes;"`

**Expected Result:**
- ✅ At least 100 recipes exist
- ✅ Recipes have ingredients (check `recipe_ingredients` table)

---

## Test Suite 2: Arla Scraper

### Test 2.1: Dry Run Mode

**Objective:** Verify dry run works without database writes

**Steps:**
1. Run: `npm run scrape:arla -- --limit 5 --dry-run --verbose`
2. Observe console output

**Expected Result:**
- ✅ 5 recipes parsed
- ✅ No database errors
- ✅ Console shows parsed recipe data
- ✅ Recipe count in database unchanged

### Test 2.2: Scraping 10 Recipes

**Objective:** Verify scraper can scrape and insert recipes

**Steps:**
1. Note current recipe count: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes WHERE source_id = (SELECT id FROM recipe_sources WHERE name = 'Arla');"`
2. Run: `npm run scrape:arla -- --limit 10 --verbose`
3. Check new count

**Expected Result:**
- ✅ Recipe count increased by ~10 (allowing for duplicates)
- ✅ No errors in console
- ✅ Scraping job created in `scraping_jobs` table with status 'COMPLETED'

### Test 2.3: Duplicate Detection

**Objective:** Verify scraper doesn't insert duplicates

**Steps:**
1. Run scraper twice with same limit: `npm run scrape:arla -- --limit 5`
2. Check for duplicate titles: `psql $DATABASE_URL -c "SELECT title, COUNT(*) FROM recipes GROUP BY title HAVING COUNT(*) > 1;"`

**Expected Result:**
- ✅ No duplicate titles in database
- ✅ Second run logs "duplicate" for existing recipes

### Test 2.4: Rate Limiting

**Objective:** Verify scraper respects rate limits

**Steps:**
1. Run: `npm run scrape:arla -- --limit 10 --rate-limit 2000`
2. Measure time taken
3. Calculate average time per request

**Expected Result:**
- ✅ Average time per request >= 2 seconds
- ✅ No HTTP 429 (Too Many Requests) errors

### Test 2.5: Error Handling

**Objective:** Verify scraper handles errors gracefully

**Steps:**
1. Disconnect internet (or block Arla.dk in hosts file)
2. Run: `npm run scrape:arla -- --limit 5`
3. Observe behavior

**Expected Result:**
- ✅ Scraper logs errors but doesn't crash
- ✅ Error details logged to `logs/scraper-errors-*.log`
- ✅ Scraping job status set to 'FAILED'

---

## Test Suite 3: Recipe API Endpoints

### Test 3.1: GET /api/recipes/search

**Objective:** Verify recipe search endpoint works

**Test Cases:**

#### 3.1.1: Basic Search (Danish)
```bash
curl "http://localhost:4001/api/recipes/search?q=kylling&language=da&limit=5"
```

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response has `recipes` array with <= 5 items
- ✅ Each recipe has: id, title, source, language='da'
- ✅ Response has: total, limit=5, offset=0, hasMore

#### 3.1.2: Search with Filters
```bash
curl "http://localhost:4001/api/recipes/search?q=kylling&language=da&difficulty=easy&max_time=30&limit=3"
```

**Expected Result:**
- ✅ Status: 200 OK
- ✅ All recipes have difficulty='EASY' (or 'easy')
- ✅ All recipes have totalTimeMinutes <= 30 (if field exists)
- ✅ Max 3 recipes returned

#### 3.1.3: Pagination
```bash
# Page 1
curl "http://localhost:4001/api/recipes/search?q=test&limit=2&offset=0"

# Page 2
curl "http://localhost:4001/api/recipes/search?q=test&limit=2&offset=2"
```

**Expected Result:**
- ✅ Page 1 returns 2 recipes (offset 0-1)
- ✅ Page 2 returns different 2 recipes (offset 2-3)
- ✅ No overlap between pages

#### 3.1.4: Missing Required Parameter
```bash
curl "http://localhost:4001/api/recipes/search?language=da"
```

**Expected Result:**
- ✅ Status: 400 Bad Request
- ✅ Error message: "Query parameter 'q' is required"
- ✅ Response has correlationId and timestamp

#### 3.1.5: Invalid Filters
```bash
curl "http://localhost:4001/api/recipes/search?q=test&difficulty=invalid&max_time=-10"
```

**Expected Result:**
- ✅ Status: 400 Bad Request
- ✅ Error message mentions invalid difficulty or max_time

### Test 3.2: GET /api/recipes/:id

**Objective:** Verify get recipe by ID endpoint works

**Test Cases:**

#### 3.2.1: Valid Recipe ID
```bash
# Get a recipe ID first
RECIPE_ID=$(curl -s "http://localhost:4001/api/recipes/search?q=test&limit=1" | jq -r '.recipes[0].id')

# Get recipe by ID
curl "http://localhost:4001/api/recipes/$RECIPE_ID"
```

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response is single recipe object (not array)
- ✅ Recipe has all fields: id, title, description, imageUrl, ingredients, instructions, source, etc.
- ✅ Ingredients array has items with name, quantity, order

#### 3.2.2: Non-Existent Recipe ID
```bash
curl "http://localhost:4001/api/recipes/non-existent-id-12345"
```

**Expected Result:**
- ✅ Status: 404 Not Found
- ✅ Error message: "Recipe with ID ... does not exist"
- ✅ Response has correlationId

### Test 3.3: GET /api/recipes/by-ingredient

**Objective:** Verify ingredient search endpoint works

**Test Cases:**

#### 3.3.1: Basic Ingredient Search
```bash
curl "http://localhost:4001/api/recipes/by-ingredient?ingredient=hakket%20oksekød&language=da"
```

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response has `ingredient` field: "hakket oksekød"
- ✅ Response has `recipes` array
- ✅ Each recipe has `matchedIngredients` array
- ✅ matchedIngredients contains "hakket oksekød" (or similar)

#### 3.3.2: Ingredient with Limit
```bash
curl "http://localhost:4001/api/recipes/by-ingredient?ingredient=kylling&limit=3"
```

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Max 3 recipes returned
- ✅ All recipes contain "kylling" ingredient

#### 3.3.3: Missing Ingredient Parameter
```bash
curl "http://localhost:4001/api/recipes/by-ingredient?language=da"
```

**Expected Result:**
- ✅ Status: 400 Bad Request
- ✅ Error message: "Query parameter 'ingredient' is required"

### Test 3.4: GET /api/recipes/sources

**Objective:** Verify recipe sources endpoint works

**Test Cases:**

#### 3.4.1: List All Sources
```bash
curl "http://localhost:4001/api/recipes/sources"
```

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response has `sources` array with at least 1 source
- ✅ Response has `total` field
- ✅ Each source has: id, name, priority, enabled, healthy, message
- ✅ At least one source is healthy=true

#### 3.4.2: Source Priority Order
```bash
curl "http://localhost:4001/api/recipes/sources" | jq '.sources'
```

**Expected Result:**
- ✅ Sources ordered by priority (ascending)
- ✅ Database source has priority=1
- ✅ Spoonacular source (if enabled) has priority=2

---

## Test Suite 4: Multi-Source Fallback Logic

### Test 4.1: Database First

**Objective:** Verify database is queried first

**Steps:**
1. Search for common Danish term: `curl "http://localhost:4001/api/recipes/search?q=kylling&language=da&limit=10"`
2. Check response sources

**Expected Result:**
- ✅ Results include recipes from database (source.name = 'Arla' or similar)
- ✅ Database recipes appear first in results

### Test 4.2: Spoonacular Fallback

**Objective:** Verify fallback to Spoonacular when database has few results

**Steps:**
1. Search for English-only term unlikely in database: `curl "http://localhost:4001/api/recipes/search?q=xylophone-pasta&language=en&limit=10"`
2. Check response sources

**Expected Result:**
- ✅ If Spoonacular API key configured: Results include Spoonacular recipes
- ✅ If no API key: Empty results (no crash)

### Test 4.3: Result Deduplication

**Objective:** Verify duplicate recipes are removed

**Steps:**
1. Search for common term: `curl "http://localhost:4001/api/recipes/search?q=pasta&limit=20"`
2. Extract titles: `... | jq -r '.recipes[].title'`
3. Check for duplicates

**Expected Result:**
- ✅ No duplicate titles in results
- ✅ Each recipe appears only once

### Test 4.4: Source Health Check

**Objective:** Verify unhealthy sources are skipped

**Steps:**
1. Check source health: `curl "http://localhost:4001/api/recipes/sources"`
2. If a source is unhealthy, verify searches still work

**Expected Result:**
- ✅ Search continues to work even if one source is unhealthy
- ✅ Results come from healthy sources only

---

## Test Suite 5: Frontend Integration

### Test 5.1: RecipeSuggestions Component

**Objective:** Verify recipes display in frontend

**Steps:**
1. Open http://localhost:3000
2. Navigate to ProductDetailPage (any product with recipes)
3. Scroll to RecipeSuggestions section

**Expected Result:**
- ✅ Recipes display with images
- ✅ Recipe titles are clickable
- ✅ Cooking time displayed (if available)
- ✅ Servings displayed (if available)
- ✅ No JavaScript errors in console

### Test 5.2: Source Badges

**Objective:** Verify source badges display correctly

**Steps:**
1. Navigate to ProductDetailPage with recipes
2. Inspect recipe cards for source badges

**Expected Result:**
- ✅ Arla recipes show "🥛 Arla" badge (green background)
- ✅ Spoonacular recipes show "🌐 Spoonacular" badge (blue background)
- ✅ Badges have correct styling (rounded corners, padding)
- ✅ Badge colors match design (green for Arla, blue for Spoonacular)

### Test 5.3: Language Flags

**Objective:** Verify language flags display correctly

**Steps:**
1. View recipes from different sources
2. Check for language flags

**Expected Result:**
- ✅ Danish recipes (language='da') show 🇩🇰 flag
- ✅ English recipes (language='en') show 🇬🇧 flag
- ✅ Flags are visually distinct and aligned

### Test 5.4: Recipe Click Behavior

**Objective:** Verify clicking a recipe works

**Steps:**
1. Click on a recipe card
2. Observe behavior

**Expected Result:**
- ✅ Recipe modal/page opens OR external link opens in new tab
- ✅ Recipe details display (full ingredients, instructions)
- ✅ Back button or close button works

### Test 5.5: Loading State

**Objective:** Verify loading indicator displays

**Steps:**
1. Open DevTools → Network tab
2. Throttle network to "Slow 3G"
3. Navigate to ProductDetailPage
4. Observe RecipeSuggestions section

**Expected Result:**
- ✅ Loading spinner or skeleton displays while fetching
- ✅ Spinner disappears when recipes load
- ✅ No flash of unstyled content

### Test 5.6: Error State

**Objective:** Verify error handling in frontend

**Steps:**
1. Stop backend server
2. Refresh ProductDetailPage
3. Observe RecipeSuggestions section

**Expected Result:**
- ✅ Error message displays (e.g., "Failed to load recipes")
- ✅ No crash or blank screen
- ✅ Error message is user-friendly

---

## Test Suite 6: Performance & Caching

### Test 6.1: Database Query Performance

**Objective:** Verify database queries are fast

**Steps:**
1. Run search query 5 times: `curl "http://localhost:4001/api/recipes/search?q=kylling&language=da"`
2. Measure response times

**Expected Result:**
- ✅ Average response time < 300ms
- ✅ P95 response time < 500ms
- ✅ No timeouts

### Test 6.2: Cache Hit Performance

**Objective:** Verify caching speeds up repeated requests

**Steps:**
1. Clear cache (restart backend)
2. First request: `time curl "http://localhost:4001/api/recipes/search?q=test"`
3. Second request (same query): `time curl "http://localhost:4001/api/recipes/search?q=test"`
4. Compare times

**Expected Result:**
- ✅ Second request is significantly faster (< 20ms)
- ✅ Cache hit reduces response time by 90%+

### Test 6.3: Cache Expiration

**Objective:** Verify cache expires after TTL

**Steps:**
1. Search: `curl "http://localhost:4001/api/recipes/search?q=test"`
2. Wait 11 minutes (cache TTL is 10 minutes)
3. Search again

**Expected Result:**
- ✅ Second request queries database (slower)
- ✅ No stale data returned

### Test 6.4: Large Result Set

**Objective:** Verify performance with 50 results

**Steps:**
1. Search with max limit: `curl "http://localhost:4001/api/recipes/search?q=test&limit=50"`
2. Measure response time and size

**Expected Result:**
- ✅ Response time < 500ms
- ✅ All 50 recipes returned (if available)
- ✅ No pagination errors

---

## Test Suite 7: Backward Compatibility

### Test 7.1: Epic 2 Endpoint

**Objective:** Verify old ProductDetailPage endpoint still works

**Steps:**
1. Get a product ID from Epic 2
2. Call: `curl "http://localhost:4001/api/produkt/123/recipes"`

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response format matches Epic 2: `{ success: true, count: 3, data: [...] }`
- ✅ Recipes returned (from new RecipeService)

### Test 7.2: Epic 2 Frontend

**Objective:** Verify Epic 2 ProductDetailPage works with new backend

**Steps:**
1. Open ProductDetailPage (Epic 2 version)
2. Verify recipes display

**Expected Result:**
- ✅ Recipes display as before
- ✅ No JavaScript errors
- ✅ Same functionality as Epic 2

---

## Test Suite 8: Edge Cases & Error Handling

### Test 8.1: Empty Search Query

**Objective:** Verify empty query handling

**Steps:**
1. Search with empty query: `curl "http://localhost:4001/api/recipes/search?q=&language=da"`

**Expected Result:**
- ✅ Status: 400 Bad Request
- ✅ Error message: "Query parameter 'q' is required and cannot be empty"

### Test 8.2: Special Characters in Query

**Objective:** Verify special character handling

**Steps:**
1. Search with special chars: `curl "http://localhost:4001/api/recipes/search?q=<script>alert('xss')</script>&language=da"`

**Expected Result:**
- ✅ Status: 200 OK (query sanitized)
- ✅ No XSS injection
- ✅ Special characters removed or escaped

### Test 8.3: Very Long Query

**Objective:** Verify long query truncation

**Steps:**
1. Search with 500-character query
2. Check response

**Expected Result:**
- ✅ Query truncated to 200 characters max
- ✅ No database error
- ✅ Results returned (or empty array)

### Test 8.4: Database Connection Lost

**Objective:** Verify graceful degradation

**Steps:**
1. Stop PostgreSQL: `sudo systemctl stop postgresql`
2. Search: `curl "http://localhost:4001/api/recipes/search?q=test"`

**Expected Result:**
- ✅ Status: 503 Service Unavailable
- ✅ Error message: "Unable to connect to database"
- ✅ No backend crash

### Test 8.5: No Recipes in Database

**Objective:** Verify empty database handling

**Steps:**
1. Clear recipes: `psql $DATABASE_URL -c "DELETE FROM recipes;"`
2. Search: `curl "http://localhost:4001/api/recipes/search?q=test"`

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Empty recipes array: `{ recipes: [], total: 0 }`
- ✅ No error message

---

## Test Suite 9: Visual Validation

### Test 9.1: Desktop Layout

**Objective:** Verify layout on desktop screens

**Steps:**
1. Open frontend on desktop browser (1920x1080)
2. Navigate to ProductDetailPage with recipes
3. Inspect RecipeSuggestions section

**Expected Result:**
- ✅ Recipes displayed in grid (3-4 columns)
- ✅ Source badges visible and properly styled
- ✅ Language flags aligned correctly
- ✅ Images load and display at correct size
- ✅ No layout overflow or misalignment

### Test 9.2: Mobile Layout

**Objective:** Verify layout on mobile screens

**Steps:**
1. Open frontend on mobile browser or DevTools device emulation (375x667)
2. Navigate to ProductDetailPage with recipes
3. Inspect RecipeSuggestions section

**Expected Result:**
- ✅ Recipes displayed in single column
- ✅ Source badges visible on mobile
- ✅ Language flags visible
- ✅ Touch targets >= 44x44px
- ✅ No horizontal scrolling

### Test 9.3: Tablet Layout

**Objective:** Verify layout on tablet screens

**Steps:**
1. Open frontend on tablet browser or DevTools (768x1024)
2. Navigate to ProductDetailPage with recipes

**Expected Result:**
- ✅ Recipes displayed in 2 columns
- ✅ All UI elements visible and accessible

### Test 9.4: Image Loading

**Objective:** Verify recipe images load correctly

**Steps:**
1. View recipes with images
2. Check DevTools Network tab

**Expected Result:**
- ✅ Images load from correct URLs
- ✅ Broken images show placeholder or alt text
- ✅ No CORS errors

### Test 9.5: Color Contrast

**Objective:** Verify accessibility (WCAG AA compliance)

**Steps:**
1. Use browser extension (e.g., WAVE, axe DevTools)
2. Check color contrast for source badges and text

**Expected Result:**
- ✅ Text has contrast ratio >= 4.5:1
- ✅ Source badges have sufficient contrast
- ✅ No accessibility warnings for recipe section

---

## Test Suite 10: Accessibility

### Test 10.1: Keyboard Navigation

**Objective:** Verify keyboard-only navigation works

**Steps:**
1. Navigate to ProductDetailPage
2. Use Tab key to navigate to recipe cards
3. Press Enter to open recipe

**Expected Result:**
- ✅ All interactive elements focusable via Tab
- ✅ Focus indicator visible
- ✅ Enter key activates recipe links
- ✅ No keyboard traps

### Test 10.2: Screen Reader

**Objective:** Verify screen reader compatibility

**Steps:**
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to RecipeSuggestions section
3. Listen to announcements

**Expected Result:**
- ✅ Recipe titles announced
- ✅ Source badges announced (e.g., "Arla source")
- ✅ Language announced (e.g., "Danish recipe")
- ✅ Ingredient count announced (if visible)

### Test 10.3: ARIA Labels

**Objective:** Verify ARIA attributes are correct

**Steps:**
1. Inspect RecipeSuggestions component in DevTools
2. Check ARIA attributes

**Expected Result:**
- ✅ Recipe list has role="list"
- ✅ Recipe cards have role="listitem"
- ✅ Links have descriptive aria-label
- ✅ Images have alt text

---

## Test Summary Checklist

### Slice 1: Database Infrastructure ✅
- [ ] PostgreSQL 17.8 connected
- [ ] All 4 tables exist
- [ ] GIN indexes created
- [ ] Seed script works
- [ ] Recipe count >= 100

### Slice 2: Recipe Abstraction Layer ✅
- [ ] IRecipeSource interface implemented
- [ ] DatabaseRecipeSource works
- [ ] SpoonacularRecipeSource works
- [ ] RecipeService orchestrator works
- [ ] Multi-source fallback functional
- [ ] Caching functional

### Slice 3: Arla Scraper ✅
- [ ] Dry run works
- [ ] Scraping inserts recipes
- [ ] Duplicate detection works
- [ ] Rate limiting respected
- [ ] Error handling graceful

### Slice 4: API Endpoints ✅
- [ ] GET /api/recipes/search works
- [ ] GET /api/recipes/:id works
- [ ] GET /api/recipes/by-ingredient works
- [ ] GET /api/recipes/sources works
- [ ] Request validation works
- [ ] Error handling works

### Slice 5: Frontend Integration ✅
- [ ] RecipeSuggestions displays recipes
- [ ] Source badges visible
- [ ] Language flags visible
- [ ] Loading state works
- [ ] Error state works
- [ ] Backward compatibility maintained

### Slice 6: Testing & Documentation ✅
- [ ] Integration tests pass
- [ ] All documentation complete
- [ ] README.md updated
- [ ] No broken links

---

## Sign-Off

**QA Completed By:** ___________________  
**Date:** ___________________  
**Epic Status:** [ ] PASS [ ] FAIL  
**Notes:**

---

**Deployment Approval:**

Product Owner: ___________________  Date: ___________  
Developer: ___________________  Date: ___________  
DevOps: ___________________  Date: ___________

---

## Issue Tracking

| Issue # | Description | Severity | Status | Assigned To |
|---------|-------------|----------|--------|-------------|
| (none) | | | | |

---

**End of QA Test Plan**
