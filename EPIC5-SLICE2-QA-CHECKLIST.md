# Epic 5 Slice 2 - Manual QA Test Checklist

**Branch:** `feature/epic5-slice2-assignment`  
**Correlation ID:** ZHC-MadMatch-20260305-Epic5-Slice2  
**Issue:** #27

---

## 🧪 Pre-Test Setup

1. [ ] Pull latest from `feature/epic5-slice2-assignment` branch
2. [ ] `cd frontend && npm install` (verify dependencies)
3. [ ] `npm start` (start dev server)
4. [ ] Open browser DevTools → Application → Local Storage
5. [ ] Clear `madmatch_weekly_plan` key if exists (start fresh)

---

## ✅ Test Scenarios

### Test 1: Basic Recipe Assignment Flow

**Steps:**
1. [ ] Navigate to `/opskrifter` (Recipe Browse)
2. [ ] Click any recipe to view detail page
3. [ ] Verify "Tilføj til ugeplan" button exists
4. [ ] Verify button has `data-testid="recipe-add-to-plan-button"`
5. [ ] Click "Tilføj til ugeplan" button
6. [ ] Verify modal opens with 7 day cards (Mon-Sun)
7. [ ] Verify modal has `data-testid="assignment-modal"`
8. [ ] Verify current day has "I dag" badge
9. [ ] Verify recipe preview shows image + title at top of modal
10. [ ] Click on any empty day card
11. [ ] Verify modal closes
12. [ ] Navigate to `/ugeplan` (Weekly Calendar)
13. [ ] Verify recipe appears on selected day with:
    - [ ] Recipe thumbnail image
    - [ ] Recipe title (with `data-testid="day-card-recipe-title"`)
    - [ ] "4 portioner" text
    - [ ] Green border on day card

**Expected Result:** ✅ Recipe assigned and visible in calendar

---

### Test 2: localStorage Persistence

**Steps:**
1. [ ] Assign recipe to Monday (as in Test 1)
2. [ ] Open DevTools → Application → Local Storage
3. [ ] Verify `madmatch_weekly_plan` key exists
4. [ ] Inspect JSON structure:
   ```javascript
   {
     version: 1,
     weekStart: "YYYY-MM-DD", // This week's Monday
     days: [
       { date: "...", dayName: "Mandag", recipe: {...} },
       // ...
     ]
   }
   ```
5. [ ] Verify `days[0].recipe` has:
   - [ ] `id` (string)
   - [ ] `title` (string)
   - [ ] `imageUrl` (string or null)
   - [ ] `servings` (number, should be 4)
6. [ ] Reload page (F5 or Cmd+R)
7. [ ] Verify recipe still shows on Monday in calendar

**Expected Result:** ✅ Data persists across page reloads

---

### Test 3: Duplicate Assignment Confirmation

**Steps:**
1. [ ] Assign Recipe A to Tuesday
2. [ ] Navigate back to Recipe Browse
3. [ ] Select Recipe B (different recipe)
4. [ ] Click "Tilføj til ugeplan"
5. [ ] Click on Tuesday (already has Recipe A)
6. [ ] Verify confirmation dialog appears with `data-testid="duplicate-confirm-dialog"`
7. [ ] Verify dialog shows:
   - [ ] Title: "Erstat eksisterende opskrift?"
   - [ ] Message: "Der er allerede en opskrift planlagt for Tirsdag..."
   - [ ] "Annuller" button (gray)
   - [ ] "Erstat" button (green)
8. [ ] Click "Annuller"
9. [ ] Verify dialog closes, modal stays open
10. [ ] Click Tuesday again
11. [ ] This time click "Erstat"
12. [ ] Verify modal closes
13. [ ] Navigate to `/ugeplan`
14. [ ] Verify Tuesday now shows Recipe B (not Recipe A)

**Expected Result:** ✅ User can cancel or confirm replacement

---

### Test 4: Multiple Day Assignments

**Steps:**
1. [ ] Assign different recipes to all 7 days
2. [ ] Navigate to `/ugeplan`
3. [ ] Verify all 7 day cards show:
   - [ ] Unique recipe images
   - [ ] Unique recipe titles
   - [ ] All show "4 portioner"
   - [ ] All have green border
4. [ ] Reload page
5. [ ] Verify all 7 recipes persist

**Expected Result:** ✅ All 7 days can have recipes

---

### Test 5: Modal Interactions

**Steps:**
1. [ ] Open assignment modal (from any recipe)
2. [ ] Verify day cards have correct `data-testid`:
   - [ ] `assignment-day-monday`
   - [ ] `assignment-day-tuesday`
   - [ ] `assignment-day-wednesday`
   - [ ] `assignment-day-thursday`
   - [ ] `assignment-day-friday`
   - [ ] `assignment-day-saturday`
   - [ ] `assignment-day-sunday`
3. [ ] Press `Escape` key
4. [ ] Verify modal closes
5. [ ] Open modal again
6. [ ] Click on backdrop (outside modal card)
7. [ ] Verify modal closes
8. [ ] Open modal again
9. [ ] Click "✕" close button
10. [ ] Verify modal closes

**Expected Result:** ✅ Modal closes via Escape, backdrop, or close button

---

### Test 6: Empty State Display

**Steps:**
1. [ ] Clear localStorage (`madmatch_weekly_plan` key)
2. [ ] Reload page
3. [ ] Navigate to `/ugeplan`
4. [ ] Verify all 7 day cards show:
   - [ ] "Ingen måltid planlagt" (gray italic text)
   - [ ] No recipe images
   - [ ] No green borders

**Expected Result:** ✅ Empty state displays correctly

---

### Test 7: Responsive Design (Mobile)

**Steps:**
1. [ ] Open DevTools → Toggle device toolbar (mobile view)
2. [ ] Set viewport to iPhone 12 (390x844)
3. [ ] Navigate to `/ugeplan`
4. [ ] Verify calendar grid shows 2 columns (not 7)
5. [ ] Verify day cards show short names (Man, Tir, Ons...)
6. [ ] Open assignment modal
7. [ ] Verify modal fills most of screen
8. [ ] Verify day grid shows 2 columns
9. [ ] Verify recipe preview image is smaller (60px)
10. [ ] Verify all text is readable

**Expected Result:** ✅ Mobile layout adapts correctly

---

### Test 8: Accessibility

**Steps:**
1. [ ] Open assignment modal
2. [ ] Tab through elements with keyboard
3. [ ] Verify focus indicators are visible
4. [ ] Verify tab order is logical:
   - Close button → Recipe preview → Day cards → Confirm dialog (if shown)
5. [ ] Use screen reader (if available)
6. [ ] Verify ARIA labels are announced:
   - [ ] Modal has `role="dialog"` and `aria-modal="true"`
   - [ ] Confirm dialog has `role="alertdialog"`
   - [ ] Buttons have `aria-label` attributes
7. [ ] Verify color contrast meets WCAG AA (use DevTools Accessibility tab)

**Expected Result:** ✅ Accessible to keyboard and screen reader users

---

### Test 9: Edge Cases

**Scenario A: Recipe without image**
1. [ ] Find recipe with `imageUrl: null` (or mock one)
2. [ ] Assign to calendar
3. [ ] Verify day card shows title without breaking

**Scenario B: Very long recipe title**
1. [ ] Find recipe with 100+ character title
2. [ ] Assign to calendar
3. [ ] Verify title truncates with ellipsis (2-line clamp)

**Scenario C: Week rollover**
1. [ ] Assign recipes to current week
2. [ ] Manually change system date to next Monday (in VM/test env)
3. [ ] Reload page
4. [ ] Verify calendar shows new empty week (old week cleared)

**Expected Result:** ✅ Edge cases handled gracefully

---

### Test 10: Integration with Epic 4 (Recipe Detail)

**Steps:**
1. [ ] Navigate to Recipe Detail via `/opskrifter/:id`
2. [ ] Verify "Tilføj til ugeplan" button is NOT disabled
3. [ ] Verify button styling matches existing buttons
4. [ ] Verify button icon is 📅
5. [ ] Verify other buttons still work:
   - [ ] "Tilføj til favoritter" (toggle favorite)
   - [ ] "Find matchende tilbud" (navigate to tilbud)

**Expected Result:** ✅ Integrates seamlessly with existing UI

---

## 🐛 Known Issues / Limitations

- [ ] No toast notification on successful assignment (future enhancement)
- [ ] No "Remove recipe" button on DayCard (Slice 3)
- [ ] Portion selector fixed to 4 (Slice 3 will add adjustment)
- [ ] No "Edit recipe" on calendar (Slice 3)
- [ ] No savings calculator (Slice 4)
- [ ] No shopping list (Slice 5)

---

## 📊 Performance Checks

1. [ ] Page load time < 2 seconds
2. [ ] Modal open animation smooth (no jank)
3. [ ] localStorage read/write < 50ms
4. [ ] No console errors
5. [ ] No console warnings (except expected React Hook ones)
6. [ ] Bundle size increase acceptable (+2.08 KB)

---

## ✅ Sign-Off

**Tester Name:** _______________________  
**Date:** _______________________  
**All Tests Passed:** [ ] Yes [ ] No  
**Issues Found:** _______________________  
**Notes:** _______________________

---

**Next Step:** If all tests pass, approve for merge to `main`.
