# Epic 4: Recipe Browse & Favorites - Dual-Journey Strategy

## 📋 Quick Info
- **Product:** MadMatch
- **Complexity:** Large (44h / 6 slices)
- **Risk:** Low
- **Data Impact:** None (frontend-only)
- **Correlation ID:** ZHC-MadMatch-20260302-Epic4

---

## 🎯 Problem Statement

MadMatch currently offers only **one customer journey**: Tilbud → Produkt → Opskrift → (dead end). 

**Current limitations:**
- ❌ Cannot browse recipes independently
- ❌ Cannot save recipes for future planning
- ❌ Cannot start from "what do I want to cook?"
- ❌ Blocks dual-journey strategy for Epic 5

**Epic 4 enables:**
```
Journey A: Tilbud → Produkt → Opskrift → Favorit → Ugeplan (Epic 5)
Journey B: Opskrift → Favorit → Ugeplan (Epic 5) ← NEW!
```

---

## 👤 User Story

**As a** meal-planning user  
**I want to** browse and save recipes independent of tilbud  
**So that** I can plan weekly meals around what I want to cook, then find the best deals

---

## ✅ Implementation Plan (6 Slices)

### Slice 1: Recipe Browse View (8h)
- [ ] Create `/opskrifter` route
- [ ] Add "Opskrifter" top-level navigation tab
- [ ] Display 20 recipes per page in responsive grid
- [ ] Pagination controls
- [ ] Loading states

### Slice 2: Recipe Search (6h)
- [ ] Search bar with debounced input (500ms)
- [ ] Full-text search (title + ingredients)
- [ ] Live results update
- [ ] Clear button + empty state

### Slice 3: Recipe Favorites (8h) ⭐ CORE
- [ ] Heart icon on recipe cards
- [ ] Toggle favorite state
- [ ] LocalStorage persistence (`madmatch_favorite_recipes`)
- [ ] `/opskrifter/favoritter` page
- [ ] Favorite count badge
- [ ] Empty state

### Slice 4: Recipe Detail View (6h)
- [ ] Create `/opskrift/:id` route
- [ ] Display full recipe (ingredients, instructions, metadata)
- [ ] Favorite button (synced)
- [ ] **"Tilføj til ugeplan" button (DISABLED - Epic 5 hook)**
- [ ] "Find matchende tilbud" button
- [ ] Breadcrumb navigation

### Slice 5: Recipe-to-Tilbud Linking (4h)
- [ ] "Find matchende tilbud" clickable
- [ ] Navigate to `/tilbud?search=ingredients`
- [ ] Show matching products
- [ ] Fallback message if no matches

### Slice 6: Polish & Accessibility (4h)
- [ ] ARIA labels on all buttons
- [ ] Keyboard navigation
- [ ] Mobile optimization (44x44px touch targets)
- [ ] Lazy loading images
- [ ] `data-testid` attributes (all interactive elements)

---

## 🎯 Acceptance Criteria (Summary)

**Navigation:**
- [ ] "Opskrifter" tab visible (top-level, equal to "Tilbud")
- [ ] "Mine favoritter" accessible

**Browse:**
- [ ] Displays 20 recipes per page
- [ ] Responsive grid (1-4 columns)
- [ ] Loading spinner + error handling

**Search:**
- [ ] Searches title + ingredients
- [ ] Debounced (500ms)
- [ ] Empty state: "Ingen opskrifter fundet"

**Favorites (CORE):**
- [ ] Heart icon toggles state
- [ ] Persists across sessions (localStorage)
- [ ] `/opskrifter/favoritter` shows favorited recipes
- [ ] Badge count visible

**Detail:**
- [ ] Full recipe display (image, ingredients, instructions, metadata)
- [ ] "Tilføj til ugeplan" DISABLED (tooltip: "Kommer i næste version")
- [ ] "Find matchende tilbud" functional

**Accessibility:**
- [ ] All buttons have `aria-label`
- [ ] Keyboard navigation works
- [ ] Mobile: 44x44px touch targets
- [ ] All interactive elements have `data-testid`

---

## 🔧 Technical Notes

**Frontend-Only:**
- Zero backend changes required
- Uses Epic 3.5 API endpoints:
  - `GET /api/recipes/search?language=da&limit=20`
  - `GET /api/recipes/search?q=kylling`
  - `GET /api/recipes/:id`

**LocalStorage Schema:**
```json
{
  "version": 1,
  "favorites": ["recipe-id-1", "recipe-id-2"],
  "updatedAt": "2026-03-02T22:30:00Z"
}
```

**Epic 5 Integration:**
- "Tilføj til ugeplan" button present but DISABLED
- LocalStorage schema v2 ready (adds `weeklyPlan` field)
- RecipeCard/RecipeDetail components reusable in Epic 5

---

## ✅ Definition of Done

**Code:**
- [ ] All 6 slices merged to main
- [ ] Unit tests passing (coverage > 80%)
- [ ] Playwright tests passing (5 scenarios)
- [ ] All components have `data-testid`

**Functionality:**
- [ ] Recipe browse working (`/opskrifter`)
- [ ] Recipe search working
- [ ] Recipe favorites working (localStorage)
- [ ] Recipe detail complete
- [ ] "Tilføj til ugeplan" DISABLED (Epic 5 hook)
- [ ] "Find matchende tilbud" working

**Quality:**
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Accessible (keyboard, ARIA)
- [ ] Performance (browse < 1s, search < 300ms)

**Deployment:**
- [ ] Deployed to DEV
- [ ] Post-deployment QA complete
- [ ] Version: v1.5.0

---

## ⏱️ Timeline

| Slice | Hours | Cumulative |
|-------|-------|------------|
| Slice 1: Browse | 8h | 8h |
| Slice 2: Search | 6h | 14h |
| Slice 3: Favorites | 8h | 22h |
| Slice 4: Detail | 6h | 28h |
| Slice 5: Recipe-to-Tilbud | 4h | 32h |
| Slice 6: Polish | 4h | 36h |
| QA + Deployment | 8h | 44h |

**Total:** 44 hours (~5.5 days)  
**Target:** 2026-03-11  
**Epic 5 Start:** 2026-03-12

---

## 📊 Success Metrics

- 80%+ users navigate to "Opskrifter" tab (first 3 sessions)
- 50%+ users favorite ≥1 recipe (first week)
- 40%+ recipe views via search
- 20%+ clicks "Find matchende tilbud"

---

## 🚫 Out of Scope

- ❌ Meal planning calendar (Epic 5)
- ❌ Weekly meal plan persistence (Epic 5)
- ❌ Shopping list generation (Epic 5)
- ❌ Recipe ratings/reviews
- ❌ User-submitted recipes
- ❌ Advanced filtering (dietary, allergens)

---

## 📎 Related

- Epic 1 (Tilbudsoversigt): ✅ v1.1.0
- Epic 2 (Produktvisning): ✅ Deployed
- Epic 3 (Favoritter & Handlekurv): ✅ Deployed
- Epic 3.5 (Database & Arla Scraper): ✅ 2484/3000 recipes
- **Epic 5 (Meal Planning):** Starts 2026-03-12

---

**Correlation ID:** ZHC-MadMatch-20260302-Epic4  
**Ready for Implementation:** ✅
