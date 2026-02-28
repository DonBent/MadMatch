# Schema Migration Guide

## Overview

The MadMatch application uses versioned localStorage schemas to ensure data integrity and allow safe upgrades. All data structures (Favorites, Cart, Budget) are versioned and validated on load.

## Current Schema Version

**Version:** 2  
**Location:** `frontend/src/utils/storage.js`  
**Constant:** `STORAGE_VERSION`

## Data Structures

### Favorites (madmatch_favorites)
```json
{
  "version": 2,
  "favorites": [1, 2, 3],
  "migratedAt": "2026-02-28T22:00:00.000Z"
}
```

**Validation Rules:**
- `favorites` must be an array
- Each ID must be string or number
- Invalid IDs are filtered out

### Cart (madmatch_cart)
```json
{
  "version": 2,
  "cart": [
    {
      "productId": 1,
      "quantity": 2,
      "addedAt": "2026-02-28T22:00:00.000Z",
      "productSnapshot": {
        "id": 1,
        "titel": "Product Name",
        "normalpris": 100,
        "tilbudspris": 75,
        "besparelse": 25,
        "billedUrl": "url",
        "butik": "Store Name"
      }
    }
  ],
  "savedAt": "2026-02-28T22:00:00.000Z"
}
```

**Validation Rules:**
- `cart` must be an array
- Each item must be an object
- Each item must have `productId`
- `quantity` must be number > 0
- Invalid items are filtered out
- Product snapshot is optional but validated if present

### Budget (madmatch_budget)
```json
{
  "version": 2,
  "budget": 1000,
  "enabled": true,
  "savedAt": "2026-02-28T22:00:00.000Z"
}
```

**Validation Rules:**
- `budget` must be number ≥ 0
- Invalid numbers default to 0
- `enabled` must be boolean
- Invalid enabled defaults to true

## Migration History

### v1 → v2 (2026-02-28)

**Changes:**
- Added comprehensive validation for all data types
- Automatic migration of old cart format (product → productId + productSnapshot)
- Added `migratedAt` timestamp
- Enhanced error recovery

**Migration Logic:**
- Validates all data during migration
- Removes invalid entries
- Preserves valid user data
- Automatic and transparent to users

## How to Add a New Schema Version

### Step 1: Update STORAGE_VERSION
```javascript
// frontend/src/utils/storage.js
export const STORAGE_VERSION = 3; // Increment
```

### Step 2: Add Migration Function
```javascript
const migrateV2ToV3 = (key, data) => {
  console.log(`[Storage] Migrating ${key} from v2 to v3`);
  
  // Perform migration logic
  // Example: Add new field
  if (key === 'madmatch_favorites') {
    return {
      version: 3,
      favorites: data.favorites || [],
      tags: {}, // New field
      migratedAt: new Date().toISOString()
    };
  }
  
  // Return migrated data
  return {
    ...data,
    version: 3,
    migratedAt: new Date().toISOString()
  };
};
```

### Step 3: Update validateAndMigrate Function
```javascript
export const validateAndMigrate = (key, value) => {
  try {
    const data = JSON.parse(value);
    const version = data.version || 1;
    
    if (version === STORAGE_VERSION) {
      // Validate current version
      return data;
    }
    
    // Add new migration path
    if (version === 2) {
      const migrated = migrateV2ToV3(key, data);
      setItem(key, migrated);
      return migrated;
    }
    
    // Existing migrations
    if (version === 1) {
      // Migrate v1 → v2 → v3
      const v2 = migrateV1ToV2(key, data);
      const v3 = migrateV2ToV3(key, v2);
      setItem(key, v3);
      return v3;
    }
    
    // Unknown version
    console.error('[Storage] Unknown schema version:', version);
    return null;
  } catch (error) {
    console.error('[Storage] Migration failed:', error);
    return null;
  }
};
```

### Step 4: Update Validators
```javascript
const validators = {
  validateFavorites: (data) => {
    // Update to validate new fields
    if (!Array.isArray(data)) return [];
    
    // Validate tags if present
    const tags = data.tags || {};
    // ... validation logic
    
    return valid;
  }
};
```

### Step 5: Update Context Loaders
```javascript
// frontend/src/contexts/FavoritesContext.js
const getInitialFavorites = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      
      if (data.version === STORAGE_VERSION) {
        // Handle new fields
        const tags = data.tags || {};
        // ... validation
        
        return { favorites: validFavorites, tags };
      }
    }
  } catch (error) {
    console.error('[FavoritesContext] Load failed:', error);
  }
  return { favorites: [], tags: {} };
};
```

### Step 6: Add Tests
```javascript
// frontend/src/utils/__tests__/storage.validation.test.js
describe('Schema Migration v2 → v3', () => {
  test('migrates favorites from v2 to v3', () => {
    const v2Data = {
      version: 2,
      favorites: [1, 2, 3]
    };
    localStorage.setItem('madmatch_favorites', JSON.stringify(v2Data));

    const result = storage.getItem('madmatch_favorites');
    const parsed = JSON.parse(result);

    expect(parsed.version).toBe(3);
    expect(parsed.favorites).toEqual([1, 2, 3]);
    expect(parsed.tags).toEqual({});
    expect(parsed.migratedAt).toBeDefined();
  });
});
```

### Step 7: Update Documentation
Update this file with:
- New data structure examples
- New validation rules
- Migration notes

## Error Handling Principles

1. **Never Throw**: All validation/migration errors are caught and logged
2. **Graceful Fallback**: Always return valid default state
3. **Preserve Data**: Keep valid data, remove only invalid entries
4. **Log Everything**: Console warnings for debugging
5. **User Transparency**: Silent migration (users don't see errors)

## Testing Checklist

Before deploying a new schema version:

- [ ] All validators updated
- [ ] Migration function implemented
- [ ] Migration path tested (v1 → v2 → v3)
- [ ] Corrupted data handling tested
- [ ] Invalid data filtering tested
- [ ] Context loaders updated
- [ ] All tests passing (≥347 tests)
- [ ] ESLint clean
- [ ] Documentation updated
- [ ] Manual testing in browser
- [ ] Safari testing (if available)

## Debugging

To check current schema version:
```javascript
import { STORAGE_VERSION, getStorageStatus } from './utils/storage';

console.log('Schema version:', STORAGE_VERSION);
console.log('Storage status:', getStorageStatus());
```

To inspect localStorage:
```javascript
// In browser console
const favorites = JSON.parse(localStorage.getItem('madmatch_favorites'));
console.log('Favorites:', favorites);
console.log('Version:', favorites?.version);
```

To force migration:
```javascript
// Set to v1 and reload
localStorage.setItem('madmatch_favorites', JSON.stringify({
  version: 1,
  favorites: [1, 2, 3]
}));
// Reload page - should auto-migrate to current version
```

## Rollback Strategy

If a migration fails in production:

1. **Hotfix**: Deploy previous schema version
2. **Data Recovery**: Users' old data is still in localStorage
3. **Re-migration**: Fix migration logic and redeploy
4. **No Data Loss**: Validation removes invalid entries only

## Contact

For questions about schema migrations, contact:
- ZHC Developer Agent
- Repository: `/opt/madmatch-dev`
