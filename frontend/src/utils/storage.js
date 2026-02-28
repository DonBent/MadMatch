/**
 * Robust storage utility with Safari workarounds
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
 */

// In-memory fallback storage
const inMemoryStorage = {};

// Storage backend tracking
let currentBackend = 'unknown';
let storageWarningShown = false;

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
 * Get item from storage with multi-level fallback
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
        return value;
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
  clear
};
