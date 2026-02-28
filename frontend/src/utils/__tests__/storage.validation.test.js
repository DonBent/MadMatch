import * as storage from '../storage';

describe('Storage Schema Validation and Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Schema Versioning', () => {
    test('STORAGE_VERSION is defined', () => {
      expect(storage.STORAGE_VERSION).toBeDefined();
      expect(storage.STORAGE_VERSION).toBe(2);
    });

    test('getStorageStatus includes version', () => {
      const status = storage.getStorageStatus();
      expect(status.version).toBe(storage.STORAGE_VERSION);
    });
  });

  describe('Favorites Validation', () => {
    test('validates favorites array on load', () => {
      const validData = {
        version: 2,
        favorites: [1, 2, '3', 4]
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(validData));

      const result = storage.getItem('madmatch_favorites');
      const parsed = JSON.parse(result);

      expect(parsed.favorites).toEqual([1, 2, '3', 4]);
      expect(parsed.version).toBe(2);
    });

    test('removes invalid favorite IDs', () => {
      const invalidData = {
        version: 2,
        favorites: [1, null, undefined, {}, [], 'valid', 2]
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_favorites');
      const parsed = JSON.parse(result);

      expect(parsed.favorites).toEqual([1, 'valid', 2]);
    });

    test('handles empty favorites array', () => {
      const emptyData = {
        version: 2,
        favorites: []
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(emptyData));

      const result = storage.getItem('madmatch_favorites');
      const parsed = JSON.parse(result);

      expect(parsed.favorites).toEqual([]);
    });

    test('handles non-array favorites', () => {
      const invalidData = {
        version: 2,
        favorites: 'not an array'
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_favorites');
      const parsed = JSON.parse(result);

      expect(parsed.favorites).toEqual([]);
    });
  });

  describe('Cart Validation', () => {
    test('validates cart items array on load', () => {
      const validData = {
        version: 2,
        cart: [
          {
            productId: 1,
            quantity: 2,
            addedAt: '2024-01-01T00:00:00.000Z',
            productSnapshot: {
              id: 1,
              titel: 'Test Product',
              normalpris: 100
            }
          }
        ]
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(validData));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.cart).toHaveLength(1);
      expect(parsed.cart[0].productId).toBe(1);
      expect(parsed.cart[0].quantity).toBe(2);
    });

    test('removes cart items without productId', () => {
      const invalidData = {
        version: 2,
        cart: [
          { productId: 1, quantity: 2 },
          { quantity: 3 }, // missing productId
          { productId: 2, quantity: 1 }
        ]
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.cart).toHaveLength(2);
      expect(parsed.cart[0].productId).toBe(1);
      expect(parsed.cart[1].productId).toBe(2);
    });

    test('removes cart items with invalid quantity', () => {
      const invalidData = {
        version: 2,
        cart: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 0 }, // zero quantity
          { productId: 3, quantity: -1 }, // negative quantity
          { productId: 4, quantity: 'invalid' }, // non-number
          { productId: 5, quantity: NaN }, // NaN
          { productId: 6, quantity: Infinity }, // Infinity
          { productId: 7, quantity: 1 }
        ]
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.cart).toHaveLength(2);
      expect(parsed.cart[0].productId).toBe(1);
      expect(parsed.cart[1].productId).toBe(7);
    });

    test('removes cart items that are not objects', () => {
      const invalidData = {
        version: 2,
        cart: [
          { productId: 1, quantity: 2 },
          null,
          undefined,
          'string',
          123,
          { productId: 2, quantity: 1 }
        ]
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.cart).toHaveLength(2);
      expect(parsed.cart[0].productId).toBe(1);
      expect(parsed.cart[1].productId).toBe(2);
    });

    test('handles invalid product snapshot', () => {
      const invalidData = {
        version: 2,
        cart: [
          {
            productId: 1,
            quantity: 2,
            productSnapshot: {} // missing id and titel
          }
        ]
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.cart).toHaveLength(1);
      expect(parsed.cart[0].productSnapshot).toBeUndefined();
    });

    test('handles empty cart array', () => {
      const emptyData = {
        version: 2,
        cart: []
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(emptyData));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.cart).toEqual([]);
    });

    test('handles non-array cart', () => {
      const invalidData = {
        version: 2,
        cart: 'not an array'
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.cart).toEqual([]);
    });
  });

  describe('Budget Validation', () => {
    test('validates budget amount on load', () => {
      const validData = {
        version: 2,
        budget: 1000,
        enabled: true
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(validData));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.budget).toBe(1000);
      expect(parsed.enabled).toBe(true);
    });

    test('defaults invalid budget amount to 0', () => {
      const invalidData = {
        version: 2,
        budget: 'invalid',
        enabled: true
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.budget).toBe(0);
    });

    test('defaults negative budget to 0', () => {
      const invalidData = {
        version: 2,
        budget: -100,
        enabled: true
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.budget).toBe(0);
    });

    test('defaults NaN budget to 0', () => {
      const invalidData = {
        version: 2,
        budget: NaN,
        enabled: true
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.budget).toBe(0);
    });

    test('defaults Infinity budget to 0', () => {
      const invalidData = {
        version: 2,
        budget: Infinity,
        enabled: true
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.budget).toBe(0);
    });

    test('defaults invalid enabled flag to true', () => {
      const invalidData = {
        version: 2,
        budget: 1000,
        enabled: 'invalid'
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(invalidData));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.enabled).toBe(true);
    });

    test('accepts false enabled flag', () => {
      const validData = {
        version: 2,
        budget: 1000,
        enabled: false
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(validData));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.enabled).toBe(false);
    });
  });

  describe('Schema Migration v1 → v2', () => {
    test('migrates favorites from v1 to v2', () => {
      const v1Data = {
        version: 1,
        favorites: [1, 2, 3]
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(v1Data));

      const result = storage.getItem('madmatch_favorites');
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe(2);
      expect(parsed.favorites).toEqual([1, 2, 3]);
      expect(parsed.migratedAt).toBeDefined();
    });

    test('migrates cart from v1 to v2', () => {
      const v1Data = {
        version: 1,
        cart: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 }
        ]
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(v1Data));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe(2);
      expect(parsed.cart).toHaveLength(2);
      expect(parsed.migratedAt).toBeDefined();
    });

    test('migrates old cart format with product field', () => {
      const v1Data = {
        version: 1,
        cart: [
          {
            product: { id: 1, titel: 'Test' },
            quantity: 2
          }
        ]
      };
      localStorage.setItem('madmatch_cart', JSON.stringify(v1Data));

      const result = storage.getItem('madmatch_cart');
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe(2);
      expect(parsed.cart[0].productId).toBe(1);
      expect(parsed.cart[0].productSnapshot).toBeDefined();
    });

    test('migrates budget from v1 to v2', () => {
      const v1Data = {
        version: 1,
        budget: 1000,
        enabled: true
      };
      localStorage.setItem('madmatch_budget', JSON.stringify(v1Data));

      const result = storage.getItem('madmatch_budget');
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe(2);
      expect(parsed.budget).toBe(1000);
      expect(parsed.enabled).toBe(true);
      expect(parsed.migratedAt).toBeDefined();
    });

    test('validates data during migration', () => {
      const v1Data = {
        version: 1,
        favorites: [1, null, 'valid', {}, 2]
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(v1Data));

      const result = storage.getItem('madmatch_favorites');
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe(2);
      expect(parsed.favorites).toEqual([1, 'valid', 2]);
    });
  });

  describe('Corrupted Data Handling', () => {
    test('handles corrupted JSON', () => {
      localStorage.setItem('madmatch_favorites', 'invalid json {{{');

      const result = storage.getItem('madmatch_favorites');
      expect(result).toBeNull();
    });

    test('handles null data', () => {
      localStorage.setItem('madmatch_favorites', JSON.stringify(null));

      const result = storage.getItem('madmatch_favorites');
      expect(result).toBeNull();
    });

    test('handles undefined version', () => {
      const data = {
        favorites: [1, 2, 3]
        // no version field
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(data));

      const result = storage.getItem('madmatch_favorites');
      const parsed = JSON.parse(result);

      // Should migrate from assumed v1 to v2
      expect(parsed.version).toBe(2);
    });

    test('clears data with unknown future version', () => {
      const futureData = {
        version: 999,
        favorites: [1, 2, 3]
      };
      localStorage.setItem('madmatch_favorites', JSON.stringify(futureData));

      const result = storage.getItem('madmatch_favorites');
      expect(result).toBeNull();
    });
  });

  describe('Error Recovery', () => {
    test('never throws on validation failure', () => {
      const badData = [
        'invalid json',
        JSON.stringify(null),
        JSON.stringify(undefined),
        JSON.stringify({ version: 999 }),
        '',
        '{}',
        '[]'
      ];

      badData.forEach(data => {
        localStorage.setItem('madmatch_favorites', data);
        expect(() => storage.getItem('madmatch_favorites')).not.toThrow();
      });
    });

    test('always returns valid default state on error', () => {
      localStorage.setItem('madmatch_favorites', 'corrupted');
      const result = storage.getItem('madmatch_favorites');
      
      // Should return null for corrupted data
      expect(result).toBeNull();
    });
  });
});
