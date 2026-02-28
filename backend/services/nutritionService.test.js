const { NutritionService } = require('../services/nutritionService');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

// Mock node-fetch
jest.mock('node-fetch');

describe('NutritionService', () => {
  let nutritionService;
  let testCacheFilePath;

  beforeEach(async () => {
    // Use a test cache file
    testCacheFilePath = path.join(__dirname, '../data/nutrition-cache-test.json');
    nutritionService = new NutritionService({
      cacheFilePath: testCacheFilePath,
      cacheTTL: 3600000 // 1 hour
    });
    await nutritionService.initialize();
  });

  afterEach(async () => {
    // Clean up test cache file
    try {
      await fs.unlink(testCacheFilePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('initialization', () => {
    test('should initialize with empty cache', async () => {
      const stats = nutritionService.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    test('should create cache file if it does not exist', async () => {
      const fileExists = await fs.access(testCacheFilePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('getNutritionData', () => {
    test('should return null for empty product name', async () => {
      const result = await nutritionService.getNutritionData('', '1');
      expect(result).toBeNull();
    });

    test('should fetch from API on cache miss', async () => {
      const mockResponse = {
        products: [
          {
            product_name: 'Test Product',
            nutriments: {
              'energy-kcal_100g': 250,
              'energy-kj_100g': 1046,
              'proteins_100g': 20.0,
              'fat_100g': 18.0,
              'saturated-fat_100g': 7.5,
              'carbohydrates_100g': 0.5,
              'sugars_100g': 0.1,
              'fiber_100g': 0,
              'salt_100g': 0.15
            },
            serving_size: '100g'
          }
        ]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await nutritionService.getNutritionData('Test Product', '1');

      expect(result).not.toBeNull();
      expect(result.energyKcal).toBe(250);
      expect(result.protein).toBe(20.0);
      expect(result.fat).toBe(18.0);
      expect(result.carbohydrates).toBe(0.5);
      expect(result.source).toBe('openfoodfacts');
    });

    test('should return cached data on cache hit', async () => {
      // First call - cache miss, fetch from API
      const mockResponse = {
        products: [
          {
            product_name: 'Test Product',
            nutriments: {
              'energy-kcal_100g': 250,
              'proteins_100g': 20.0
            }
          }
        ]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result1 = await nutritionService.getNutritionData('Test Product', '1');
      expect(result1).not.toBeNull();

      // Clear the mock
      fetch.mockClear();

      // Second call - should hit cache, no API call
      const result2 = await nutritionService.getNutritionData('Test Product', '1');
      expect(result2).not.toBeNull();
      expect(result2.energyKcal).toBe(250);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should return null when API returns no products', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] })
      });

      const result = await nutritionService.getNutritionData('Nonexistent Product', '999');
      expect(result).toBeNull();
    });

    test('should handle API errors gracefully', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await nutritionService.getNutritionData('Test Product', '1');
      expect(result).toBeNull();
    });

    test('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await nutritionService.getNutritionData('Test Product', '1');
      expect(result).toBeNull();
    });
  });

  describe('_parseNutritionData', () => {
    test('should parse complete nutrition data', () => {
      const product = {
        nutriments: {
          'energy-kcal_100g': 250,
          'energy-kj_100g': 1046,
          'proteins_100g': 20.0,
          'fat_100g': 18.0,
          'saturated-fat_100g': 7.5,
          'carbohydrates_100g': 0.5,
          'sugars_100g': 0.1,
          'fiber_100g': 0.0,
          'salt_100g': 0.15
        },
        serving_size: '100g'
      };

      const result = nutritionService._parseNutritionData(product);

      expect(result.energyKcal).toBe(250);
      expect(result.energyKj).toBe(1046);
      expect(result.protein).toBe(20.0);
      expect(result.fat).toBe(18.0);
      expect(result.saturatedFat).toBe(7.5);
      expect(result.carbohydrates).toBe(0.5);
      expect(result.sugars).toBe(0.1);
      expect(result.fiber).toBe(0.0);
      expect(result.salt).toBe(0.15);
      expect(result.servingSize).toBe('100g');
      expect(result.source).toBe('openfoodfacts');
    });

    test('should handle missing nutrition fields', () => {
      const product = {
        nutriments: {
          'energy-kcal_100g': 250,
          'proteins_100g': 20.0
        }
      };

      const result = nutritionService._parseNutritionData(product);

      expect(result.energyKcal).toBe(250);
      expect(result.protein).toBe(20.0);
      expect(result.fat).toBeNull();
      expect(result.carbohydrates).toBeNull();
      expect(result.servingSize).toBe('100g'); // Default
    });

    test('should use fallback fields when _100g variants missing', () => {
      const product = {
        nutriments: {
          'energy-kcal': 250,
          'energy-kj': 1046,
          proteins: 20.0,
          fat: 18.0
        },
        serving_size: '150g'
      };

      const result = nutritionService._parseNutritionData(product);

      expect(result.energyKcal).toBe(250);
      expect(result.energyKj).toBe(1046);
      expect(result.protein).toBe(20.0);
      expect(result.fat).toBe(18.0);
      expect(result.servingSize).toBe('150g');
    });
  });

  describe('cache management', () => {
    test('should cache data with correct TTL', async () => {
      const mockResponse = {
        products: [
          {
            nutriments: { 'energy-kcal_100g': 250 }
          }
        ]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await nutritionService.getNutritionData('Test Product', '1');

      const stats = nutritionService.getCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.active).toBe(1);
    });

    test('should expire cache entries after TTL', async () => {
      // Use a very short TTL for testing
      const shortTTLService = new NutritionService({
        cacheFilePath: testCacheFilePath,
        cacheTTL: 100 // 100ms
      });
      await shortTTLService.initialize();

      const mockResponse = {
        products: [{ nutriments: { 'energy-kcal_100g': 250 } }]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      // Cache data
      await shortTTLService.getNutritionData('Test Product', '1');
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should fetch from API again
      fetch.mockClear();
      await shortTTLService.getNutritionData('Test Product', '1');
      
      expect(fetch).toHaveBeenCalled();
    });

    test('should clear entire cache', async () => {
      const mockResponse = {
        products: [{ nutriments: { 'energy-kcal_100g': 250 } }]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await nutritionService.getNutritionData('Product 1', '1');
      await nutritionService.getNutritionData('Product 2', '2');

      let stats = nutritionService.getCacheStats();
      expect(stats.entries).toBe(2);

      await nutritionService.clearCache();

      stats = nutritionService.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    test('should clean expired entries', async () => {
      // Manually add an expired entry
      const now = new Date();
      const expiredTime = new Date(now.getTime() - 7200000); // 2 hours ago
      
      nutritionService.cache['expired-product'] = {
        data: { energyKcal: 100 },
        cachedAt: expiredTime.toISOString(),
        expiresAt: new Date(expiredTime.getTime() + 3600000).toISOString() // 1 hour later (still expired)
      };

      await nutritionService._saveCache();

      let stats = nutritionService.getCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.expired).toBe(1);

      await nutritionService._cleanExpiredEntries();

      stats = nutritionService.getCacheStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('API integration', () => {
    test('should include correct User-Agent header', async () => {
      const mockResponse = {
        products: [{ nutriments: { 'energy-kcal_100g': 250 } }]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await nutritionService.getNutritionData('Test Product', '1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('world.openfoodfacts.org'),
        expect.objectContaining({
          headers: {
            'User-Agent': 'MadMatch/1.2.0 (contact@madmatch.dk)'
          }
        })
      );
    });

    test('should encode search query properly', async () => {
      const mockResponse = {
        products: [{ nutriments: { 'energy-kcal_100g': 250 } }]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await nutritionService.getNutritionData('Hakket Oksekød 8-12%', '1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('Hakket%20Oksek%C3%B8d%208-12%25'),
        expect.any(Object)
      );
    });
  });

  describe('getCacheStats', () => {
    test('should return correct cache statistics', async () => {
      const mockResponse = {
        products: [{ nutriments: { 'energy-kcal_100g': 250 } }]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await nutritionService.getNutritionData('Product 1', '1');
      await nutritionService.getNutritionData('Product 2', '2');

      const stats = nutritionService.getCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.expired).toBe(0);
    });
  });
});
