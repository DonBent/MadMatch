/**
 * Robust storage utility with Safari workarounds and schema migration
 * 
 * Implements multi-level fallback chain:
 * 1. localStorage (primary)
 * 2. sessionStorage (if localStorage fails)
 * 3. in-memory storage (last resort)
 * 
 * Handles Safari-specific issues:
 * - Private browsing mode (throws exceptions)
 * - Quota exceeded errors
 * - Timing/race conditions on mobile
 * - Cross-origin restrictions
 * 
 * Schema versioning and migration:
 * - All data structures versioned
 * - Automatic migration between versions
 * - Validation of all loaded data
 * - Graceful fallback to defaults on validation failure
 */

// In-memory fallback storage
const inMemoryStorage = {};

// Storage backend tracking
let currentBackend = 'unknown';
let storageWarningShown = false;

// Current schema version
export const STORAGE_VERSION = 2;

/**
 * Schema validators for different data types
 */
const validators = {
  /**
   * Validate favorites array
   * @param {any} data - Data to validate
   * @returns {Array} Valid favorites array
   */
  validateFavorites: (data) => {
    if (!Array.isArray(data)) {
      console.warn('[Storage] Favorites is not an array, returning empty array');
      return [];
    }
    
    // Filter out invalid IDs (must be string or number)
    const valid = data.filter(id => {
      const isValid = typeof id === 'string' || typeof id === 'number';
      if (!isValid) {
        console.warn('[Storage] Invalid favorite ID removed:', id);
      }
      return isValid;
    });
    
    return valid;
  },
  
  /**
   * Validate cart items array
   * @param {any} data - Data to validate
   * @returns {Array} Valid cart items array
   */
  validateCart: (data) => {
    if (!Array.isArray(data)) {
      console.warn('[Storage] Cart is not an array, returning empty array');
      return [];
    }
    
    // Filter out invalid cart items
    const valid = data.filter(item => {
      // Must be an object
      if (!item || typeof item !== 'object') {
        console.warn('[Storage] Invalid cart item removed (not object):', item);
        return false;
      }
      
      // Must have productId or product
      if (!item.productId && !item.product) {
        console.warn('[Storage] Invalid cart item removed (no productId):', item);
        return false;
      }
      
      // Must have valid quantity > 0
      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
        console.warn('[Storage] Invalid cart item removed (invalid quantity):', item);
        return false;
      }
      
      // If product snapshot exists, validate it has essential fields
      if (item.productSnapshot) {
        if (!item.productSnapshot.id || !item.productSnapshot.titel) {
          console.warn('[Storage] Cart item has invalid product snapshot:', item);
          // Don't reject, just remove the snapshot
          delete item.productSnapshot;
        }
      }
      
      return true;
    });
    
    return valid;
  },
  
  /**
   * Validate budget state
   * @param {any} budgetData - Budget data to validate
   * @param {any} enabledData - Enabled flag to validate
   * @returns {Object} Valid budget state
   */
  validateBudget: (budgetData, enabledData) => {
    // Validate budget amount
    const budget = Number(budgetData);
    const validBudget = Number.isFinite(budget) && budget >= 0 ? budget : 0;
    
    if (validBudget !== budget) {
      console.warn('[Storage] Invalid budget amount, defaulting to 0:', budgetData);
    }
    
    // Validate enabled flag
    const validEnabled = typeof enabledData === 'boolean' ? enabledData : true;
    
    if (validEnabled !== enabledData) {
      console.warn('[Storage] Invalid enabled flag, defaulting to true:', enabledData);
    }
    
    return { budget: validBudget, enabled: validEnabled };
  }
};

/**
 * Migrate data from v1 to v2 schema
 * @param {string} key - Storage key
 * @param {Object} data - v1 data
 * @returns {Object} v2 data
 */
const migrateV1ToV2 = (key, data) => {
  console.log(`[Storage] Migrating ${key} from v1 to v2`);
  
  // Favorites migration
  if (key === 'madmatch_favorites') {
    const favorites = validators.validateFavorites(data.favorites || []);
    return {
      version: 2,
      favorites,
      migratedAt: new Date().toISOString()
    };
  }
  
  // Cart migration
  if (key === 'madmatch_cart') {
    const cart = validators.validateCart(data.cart || []);
    
    // Migrate old cart items without productId to new format
    const migratedCart = cart.map(item => {
      // If using old format with 'product' instead of 'productId'
      if (item.product && !item.productId) {
        return {
          ...item,
          productId: item.product.id || item.product,
          productSnapshot: typeof item.product === 'object' ? item.product : undefined
        };
      }
      return item;
    });
    
    return {
      version: 2,
      cart: migratedCart,
      migratedAt: new Date().toISOString()
    };
  }
  
  // Budget migration
  if (key === 'madmatch_budget') {
    const { budget, enabled } = validators.validateBudget(data.budget, data.enabled);
    return {
      version: 2,
      budget,
      enabled,
      migratedAt: new Date().toISOString()
    };
  }
  
  // Unknown key - preserve data but update version
  console.warn('[Storage] Unknown key for migration:', key);
  return {
    ...data,
    version: 2,
    migratedAt: new Date().toISOString()
  };
};

/**
 * Validate and migrate stored data
 * @param {string} key - Storage key
 * @param {string} value - Raw stored value
 * @returns {Object|null} Validated and migrated data
 */
export const validateAndMigrate = (key, value) => {
  try {
    const data = JSON.parse(value);
    
    // Check version
    const version = data.version || 1;
    
    // If already current version, validate and return
    if (version === STORAGE_VERSION) {
      // Validate data structure
      if (key === 'madmatch_favorites') {
        const favorites = validators.validateFavorites(data.favorites);
        if (favorites.length !== (data.favorites || []).length) {
          console.warn('[Storage] Some favorites were invalid and removed');
          return { ...data, favorites };
        }
      } else if (key === 'madmatch_cart') {
        const cart = validators.validateCart(data.cart);
        if (cart.length !== (data.cart || []).length) {
          console.warn('[Storage] Some cart items were invalid and removed');
          return { ...data, cart };
        }
      } else if (key === 'madmatch_budget') {
        const validated = validators.validateBudget(data.budget, data.enabled);
        if (validated.budget !== data.budget || validated.enabled !== data.enabled) {
          console.warn('[Storage] Budget data was invalid and corrected');
          return { ...data, ...validated };
        }
      }
      
      return data;
    }
    
    // Migrate from v1 to v2
    if (version === 1) {
      const migrated = migrateV1ToV2(key, data);
      console.log('[Storage] Migration complete:', key);
      
      // Save migrated data back to storage
      setItem(key, migrated).catch(err => {
        console.error('[Storage] Failed to save migrated data:', err);
      });
      
      return migrated;
    }
    
    // Unknown version - data may be corrupted or from future version
    console.error('[Storage] Unknown schema version, clearing data:', version);
    return null;
    
  } catch (error) {
    console.error('[Storage] Failed to parse or validate data:', error);
    return null;
  }
};

/**
 * Detect if running in Safari browser
 */
const isSafari = () => {
  if (typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  
  return isSafariBrowser || isIOS;
};

/**
 * Detect if in private browsing mode
 * Safari throws exceptions when trying to use localStorage in private mode
 */
const isPrivateBrowsing = () => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return false;
  } catch (e) {
    return true;
  }
};

/**
 * Check available storage quota (Safari has lower limits)
 */
const checkStorageQuota = (storage, key, value) => {
  try {
    const testData = JSON.stringify(value);
    const estimatedSize = new Blob([testData]).size;
    
    // Safari typically has ~5MB limit for localStorage
    if (estimatedSize > 4.5 * 1024 * 1024) {
      console.warn('[Storage] Data size approaching Safari quota limit:', estimatedSize, 'bytes');
      return false;
    }
    
    return true;
  } catch (e) {
    console.warn('[Storage] Failed to check quota:', e);
    return true; // Proceed anyway if quota check fails
  }
};

/**
 * Compress data for Safari (reduce storage footprint)
 */
const compressData = (value) => {
  try {
    // If Safari and data is object, remove unnecessary fields
    if (isSafari() && typeof value === 'object') {
      const data = JSON.parse(JSON.stringify(value));
      
      // Remove timestamps if present (can be regenerated)
      if (data.savedAt) delete data.savedAt;
      
      // Compress product snapshots if present
      if (data.cart && Array.isArray(data.cart)) {
        data.cart = data.cart.map(item => {
          if (item.productSnapshot) {
            // Keep only essential fields
            const {
              id, titel, normalpris, tilbudspris, 
              besparelse, billedUrl, butik
            } = item.productSnapshot;
            
            return {
              ...item,
              productSnapshot: {
                id, titel, normalpris, tilbudspris,
                besparelse, billedUrl, butik
              }
            };
          }
          return item;
        });
      }
      
      return data;
    }
    
    return value;
  } catch (e) {
    console.warn('[Storage] Compression failed, using original data:', e);
    return value;
  }
};

/**
 * Try to store data with retry logic
 */
const setWithRetry = (storage, key, value, attempts = 3, delay = 100) => {
  return new Promise((resolve, reject) => {
    const attempt = (remainingAttempts) => {
      try {
        storage.setItem(key, value);
        resolve(true);
      } catch (e) {
        if (remainingAttempts > 1) {
          console.warn(`[Storage] Set failed, retrying... (${remainingAttempts - 1} attempts left)`, e.message);
          setTimeout(() => attempt(remainingAttempts - 1), delay);
        } else {
          reject(e);
        }
      }
    };
    
    attempt(attempts);
  });
};

/**
 * Get item from storage with multi-level fallback and validation
 */
export const getItem = (key) => {
  const backends = ['localStorage', 'sessionStorage', 'memory'];
  
  for (const backend of backends) {
    try {
      let value;
      
      if (backend === 'localStorage') {
        value = localStorage.getItem(key);
        if (value !== null) {
          currentBackend = 'localStorage';
          console.log(`[Storage] Retrieved from localStorage: ${key}`);
        }
      } else if (backend === 'sessionStorage') {
        value = sessionStorage.getItem(key);
        if (value !== null) {
          currentBackend = 'sessionStorage';
          console.log(`[Storage] Retrieved from sessionStorage (fallback): ${key}`);
        }
      } else if (backend === 'memory') {
        value = inMemoryStorage[key];
        if (value !== undefined) {
          currentBackend = 'memory';
          console.log(`[Storage] Retrieved from memory (fallback): ${key}`);
        }
      }
      
      if (value !== null && value !== undefined) {
        // Validate and migrate data
        const validated = validateAndMigrate(key, value);
        if (validated) {
          return JSON.stringify(validated);
        } else {
          console.warn(`[Storage] Data validation failed for ${key}, removing invalid data`);
          removeItem(key);
          return null;
        }
      }
    } catch (e) {
      console.warn(`[Storage] Failed to get from ${backend}:`, e.message);
    }
  }
  
  console.log(`[Storage] No data found for key: ${key}`);
  return null;
};

/**
 * Set item to storage with multi-level fallback
 */
export const setItem = async (key, value) => {
  const safari = isSafari();
  const privateBrowsing = isPrivateBrowsing();
  
  // Log Safari detection
  if (safari) {
    console.log('[Storage] Safari browser detected, using enhanced storage strategy');
  }
  
  // Warn about private browsing
  if (privateBrowsing && !storageWarningShown) {
    console.warn('[Storage] Private browsing mode detected - storage may be limited');
    storageWarningShown = true;
  }
  
  // Compress data if Safari
  const dataToStore = safari ? compressData(value) : value;
  const stringValue = typeof dataToStore === 'string' ? dataToStore : JSON.stringify(dataToStore);
  
  // Try localStorage first
  try {
    // Check quota before attempting
    if (!checkStorageQuota(localStorage, key, dataToStore)) {
      throw new Error('Storage quota warning - data may be too large');
    }
    
    // Attempt with retry logic for Safari
    if (safari) {
      await setWithRetry(localStorage, key, stringValue, 3, 100);
    } else {
      localStorage.setItem(key, stringValue);
    }
    
    currentBackend = 'localStorage';
    console.log(`[Storage] Saved to localStorage: ${key} (${stringValue.length} bytes)`);
    
    // Verify persistence for Safari
    if (safari) {
      const verified = localStorage.getItem(key);
      if (verified !== stringValue) {
        throw new Error('Storage verification failed - data not persisted');
      }
      console.log('[Storage] Safari persistence verified ✓');
    }
    
    return { success: true, backend: 'localStorage' };
  } catch (localStorageError) {
    console.warn('[Storage] localStorage failed:', localStorageError.message);
    
    // Try sessionStorage fallback
    try {
      if (safari) {
        await setWithRetry(sessionStorage, key, stringValue, 3, 100);
      } else {
        sessionStorage.setItem(key, stringValue);
      }
      
      currentBackend = 'sessionStorage';
      console.log(`[Storage] Saved to sessionStorage (fallback): ${key}`);
      
      return { success: true, backend: 'sessionStorage', warning: 'Data will not persist across browser restarts' };
    } catch (sessionStorageError) {
      console.warn('[Storage] sessionStorage failed:', sessionStorageError.message);
      
      // Final fallback: in-memory storage
      try {
        inMemoryStorage[key] = stringValue;
        currentBackend = 'memory';
        console.log(`[Storage] Saved to memory (final fallback): ${key}`);
        
        return { success: true, backend: 'memory', warning: 'Data will not persist across page reloads' };
      } catch (memoryError) {
        console.error('[Storage] All storage backends failed:', memoryError);
        return { success: false, error: 'All storage methods failed' };
      }
    }
  }
};

/**
 * Remove item from all storage backends
 */
export const removeItem = (key) => {
  let removed = false;
  
  // Try all backends
  try {
    localStorage.removeItem(key);
    removed = true;
  } catch (e) {
    console.warn('[Storage] Failed to remove from localStorage:', e.message);
  }
  
  try {
    sessionStorage.removeItem(key);
    removed = true;
  } catch (e) {
    console.warn('[Storage] Failed to remove from sessionStorage:', e.message);
  }
  
  if (inMemoryStorage[key]) {
    delete inMemoryStorage[key];
    removed = true;
  }
  
  if (removed) {
    console.log(`[Storage] Removed from all backends: ${key}`);
  }
  
  return removed;
};

/**
 * Get current storage backend status
 */
export const getStorageStatus = () => {
  return {
    backend: currentBackend,
    version: STORAGE_VERSION,
    isSafari: isSafari(),
    isPrivateBrowsing: isPrivateBrowsing(),
    localStorageAvailable: (() => {
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    })(),
    sessionStorageAvailable: (() => {
      try {
        const test = '__test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    })()
  };
};

/**
 * Clear all storage backends
 */
export const clear = () => {
  try {
    localStorage.clear();
  } catch (e) {
    console.warn('[Storage] Failed to clear localStorage:', e.message);
  }
  
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('[Storage] Failed to clear sessionStorage:', e.message);
  }
  
  Object.keys(inMemoryStorage).forEach(key => {
    delete inMemoryStorage[key];
  });
  
  console.log('[Storage] Cleared all storage backends');
};

export default {
  getItem,
  setItem,
  removeItem,
  getStorageStatus,
  clear,
  validateAndMigrate,
  STORAGE_VERSION
};
