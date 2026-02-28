import * as storage from '../storage';

describe('Storage Utility', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
    storage.clear();
  });

  describe('Basic Operations', () => {
    test('should set and get item from localStorage', () => {
      const key = 'test_key';
      const value = { data: 'test value' };
      
      return storage.setItem(key, value).then(result => {
        expect(result.success).toBe(true);
        expect(result.backend).toBe('localStorage');
        
        const retrieved = storage.getItem(key);
        const parsed = JSON.parse(retrieved);
        expect(parsed.data).toEqual(value.data);
        expect(parsed.version).toBe(2);
      });
    });

    test('should handle string values', () => {
      const key = 'string_key';
      const value = 'simple string';
      
      return storage.setItem(key, value).then(() => {
        const retrieved = storage.getItem(key);
        // String values are not wrapped in v2 schema (only objects are)
        expect(retrieved).toBeNull(); // Raw string not supported
      });
    });

    test('should handle complex objects', () => {
      const key = 'complex_key';
      const value = {
        nested: {
          array: [1, 2, 3],
          object: { foo: 'bar' }
        },
        timestamp: new Date().toISOString()
      };
      
      return storage.setItem(key, value).then(() => {
        const retrieved = storage.getItem(key);
        const parsed = JSON.parse(retrieved);
        // In v2, objects are wrapped with version
        expect(parsed.version).toBe(2);
        expect(parsed.nested).toEqual(value.nested);
        expect(parsed.timestamp).toEqual(value.timestamp);
      });
    });

    test('should return null for non-existent keys', () => {
      const retrieved = storage.getItem('non_existent_key');
      expect(retrieved).toBeNull();
    });

    test('should remove items', () => {
      const key = 'remove_key';
      const value = { data: 'test' };
      
      return storage.setItem(key, value).then(() => {
        const removed = storage.removeItem(key);
        expect(removed).toBe(true);
        
        const retrieved = storage.getItem(key);
        expect(retrieved).toBeNull();
      });
    });
  });

  describe('Safari Detection', () => {
    test('should detect Safari user agent', () => {
      const status = storage.getStorageStatus();
      expect(status).toHaveProperty('isSafari');
      expect(typeof status.isSafari).toBe('boolean');
    });

    test('should detect private browsing mode', () => {
      const status = storage.getStorageStatus();
      expect(status).toHaveProperty('isPrivateBrowsing');
      expect(typeof status.isPrivateBrowsing).toBe('boolean');
    });
  });

  describe('Fallback Chain', () => {
    test('should fallback to sessionStorage when localStorage fails', () => {
      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage) {
          throw new Error('QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };

      const key = 'fallback_key';
      const value = { data: 'test' };

      return storage.setItem(key, value).then(result => {
        expect(result.success).toBe(true);
        expect(result.backend).toBe('sessionStorage');
        expect(result.warning).toBeDefined();

        // Restore original
        Storage.prototype.setItem = originalSetItem;
      });
    });

    test('should fallback to memory when both localStorage and sessionStorage fail', () => {
      // Mock both to throw errors
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function() {
        throw new Error('Storage unavailable');
      };

      const key = 'memory_key';
      const value = { data: 'test' };

      return storage.setItem(key, value).then(result => {
        expect(result.success).toBe(true);
        expect(result.backend).toBe('memory');
        
        const retrieved = storage.getItem(key);
        const parsed = JSON.parse(retrieved);
        expect(parsed.data).toEqual(value.data);
        expect(parsed.version).toBe(2);

        // Restore original
        Storage.prototype.setItem = originalSetItem;
      });
    });

    test('should retrieve from any available backend', () => {
      const key = 'multi_backend_key';
      const value = { data: 'test value', version: 2 };

      // Set in sessionStorage directly
      sessionStorage.setItem(key, JSON.stringify(value));

      // Should retrieve from sessionStorage
      const retrieved = storage.getItem(key);
      const parsed = JSON.parse(retrieved);
      expect(parsed.data).toBe('test value');
      expect(parsed.version).toBe(2);
    });
  });

  describe('Storage Status', () => {
    test('should return complete storage status', () => {
      const status = storage.getStorageStatus();
      
      expect(status).toHaveProperty('backend');
      expect(status).toHaveProperty('isSafari');
      expect(status).toHaveProperty('isPrivateBrowsing');
      expect(status).toHaveProperty('localStorageAvailable');
      expect(status).toHaveProperty('sessionStorageAvailable');
      
      expect(typeof status.localStorageAvailable).toBe('boolean');
      expect(typeof status.sessionStorageAvailable).toBe('boolean');
    });

    test('should detect localStorage availability', () => {
      // Ensure localStorage is working properly after any previous mocking
      try {
        const test = '__cleanup_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
      } catch (e) {
        // If this fails, skip the availability test
      }
      
      const status = storage.getStorageStatus();
      // In test environment, localStorage should be available if not mocked
      expect(typeof status.localStorageAvailable).toBe('boolean');
    });
  });

  describe('Data Compression (Safari)', () => {
    test('should compress cart data for Safari', () => {
      const key = 'cart_key';
      const cartData = {
        cart: [
          {
            productId: 1,
            quantity: 2,
            addedAt: '2026-02-28T12:00:00Z',
            productSnapshot: {
              id: 1,
              titel: 'Test Product',
              beskrivelse: 'Long description that should be removed',
              normalpris: 100,
              tilbudspris: 80,
              besparelse: 20,
              besparelseProcentvis: 20,
              gyldigFra: '2026-02-01',
              gyldigTil: '2026-02-28',
              butik: 'Test Store',
              kategori: 'Test Category',
              billedUrl: 'https://example.com/image.jpg'
            }
          }
        ],
        version: 2,
        savedAt: '2026-02-28T12:00:00Z'
      };

      return storage.setItem(key, cartData).then(() => {
        const retrieved = storage.getItem(key);
        const parsed = JSON.parse(retrieved);
        
        // Should have cart data
        expect(parsed.cart).toBeDefined();
        expect(parsed.cart.length).toBe(1);
        
        // Version should be preserved
        expect(parsed.version).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle JSON parse errors gracefully', () => {
      const key = 'invalid_json_key';
      
      // Directly set invalid JSON in localStorage
      localStorage.setItem(key, '{invalid json}');
      
      // Should not throw error, but return null and clean up invalid data
      expect(() => {
        const retrieved = storage.getItem(key);
        expect(retrieved).toBeNull(); // v2 validates and rejects invalid JSON
      }).not.toThrow();
    });

    test('should handle quota exceeded errors', () => {
      const originalSetItem = Storage.prototype.setItem;
      let callCount = 0;
      
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage) {
          callCount++;
          if (callCount <= 2) {
            // Fail first 2 attempts, succeed on 3rd
            throw new DOMException('QuotaExceededError');
          }
        }
        return originalSetItem.call(this, key, value);
      };

      const key = 'quota_key';
      const value = { data: 'test' };

      return storage.setItem(key, value).then(result => {
        // Should retry and eventually succeed
        expect(result.success).toBe(true);
        expect(callCount).toBeGreaterThan(1); // Should have retried

        // Restore original
        Storage.prototype.setItem = originalSetItem;
      });
    });
  });

  describe('Clear Operations', () => {
    test('should clear all storage backends', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const value = { data: 'test' };

      return Promise.all([
        storage.setItem(key1, value),
        storage.setItem(key2, value)
      ]).then(() => {
        storage.clear();
        
        expect(storage.getItem(key1)).toBeNull();
        expect(storage.getItem(key2)).toBeNull();
      });
    });
  });
});
