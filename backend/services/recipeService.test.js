const { RecipeService } = require('./recipeService');
const fs = require('fs').promises;
const path = require('path');

// Mock fetch globally
global.fetch = jest.fn();

describe('RecipeService', () => {
  let recipeService;
  let testCachePath;

  beforeEach(async () => {
    // Create a temporary cache file for testing
    testCachePath = path.join(__dirname, '../data/recipe-cache.test.json');
    
    recipeService = new RecipeService({
      apiKey: 'test-api-key',
      cacheFilePath: testCachePath,
      cacheTTL: 1000 // 1 second for testing
    });

    await recipeService.initialize();
    
    // Clear fetch mock
    fetch.mockClear();
  });

  afterEach(async () => {
    // Clean up test cache file
    try {
      await fs.unlink(testCachePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('initialize', () => {
    it('should initialize with empty cache if no file exists', async () => {
      expect(recipeService.cache).toEqual({});
    });

    it('should load existing cache from file', async () => {
      const cacheData = {
        test_product: {
          data: [{ id: '1', title: 'Test Recipe' }],
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        }
      };

      await fs.writeFile(testCachePath, JSON.stringify(cacheData), 'utf8');
      
      const newService = new RecipeService({
        apiKey: 'test-api-key',
        cacheFilePath: testCachePath
      });
      
      await newService.initialize();
      
      expect(newService.cache).toHaveProperty('test_product');
      expect(newService.cache.test_product.data).toHaveLength(1);
    });
  });

  describe('extractIngredient', () => {
    it('should extract clean ingredient from product name', () => {
      expect(recipeService.extractIngredient('Hakket Oksekød 8-12%')).toBe('hakket oksekød');
      expect(recipeService.extractIngredient('Økologisk Mælk 500g')).toBe('mælk 500g');
      expect(recipeService.extractIngredient('Dansk Smør 250g')).toBe('smør 250g');
    });

    it('should handle product names with separators', () => {
      expect(recipeService.extractIngredient('Tomater - Cherry, 250g')).toBe('tomater');
      expect(recipeService.extractIngredient('Ost, Cheddar')).toBe('ost');
    });

    it('should remove percentages', () => {
      expect(recipeService.extractIngredient('Fløde 38%')).toBe('fløde');
      expect(recipeService.extractIngredient('Yoghurt 0,5%')).toBe('yoghurt');
    });
  });

  describe('calculateDifficulty', () => {
    it('should return easy for quick recipes', () => {
      expect(recipeService.calculateDifficulty(15)).toBe('easy');
      expect(recipeService.calculateDifficulty(25)).toBe('easy');
    });

    it('should return medium for moderate recipes', () => {
      expect(recipeService.calculateDifficulty(30)).toBe('medium');
      expect(recipeService.calculateDifficulty(45)).toBe('medium');
    });

    it('should return hard for long recipes', () => {
      expect(recipeService.calculateDifficulty(60)).toBe('hard');
      expect(recipeService.calculateDifficulty(90)).toBe('hard');
    });
  });

  describe('cache management', () => {
    it('should cache recipes with TTL', async () => {
      const recipes = [
        { id: '1', title: 'Test Recipe 1' },
        { id: '2', title: 'Test Recipe 2' }
      ];

      await recipeService.storeInCache('Test Product', recipes);
      
      expect(recipeService.cache).toHaveProperty('test_product');
      expect(recipeService.cache.test_product.data).toEqual(recipes);
      expect(recipeService.cache.test_product).toHaveProperty('cachedAt');
      expect(recipeService.cache.test_product).toHaveProperty('expiresAt');
    });

    it('should retrieve valid cached recipes', async () => {
      const recipes = [{ id: '1', title: 'Cached Recipe' }];
      await recipeService.storeInCache('Test Product', recipes);
      
      const cached = recipeService.getFromCache('Test Product');
      expect(cached).toEqual(recipes);
    });

    it('should return null for expired cache', async () => {
      const recipes = [{ id: '1', title: 'Expired Recipe' }];
      
      // Manually create expired cache entry
      recipeService.cache['test_product'] = {
        data: recipes,
        cachedAt: new Date(Date.now() - 2000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
      };
      
      const cached = recipeService.getFromCache('Test Product');
      expect(cached).toBeNull();
    });

    it('should clean expired cache entries', async () => {
      // Add valid entry
      recipeService.cache['valid_product'] = {
        data: [{ id: '1', title: 'Valid' }],
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };
      
      // Add expired entry
      recipeService.cache['expired_product'] = {
        data: [{ id: '2', title: 'Expired' }],
        cachedAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString()
      };
      
      await recipeService.cleanExpiredCache();
      
      expect(recipeService.cache).toHaveProperty('valid_product');
      expect(recipeService.cache).not.toHaveProperty('expired_product');
    });

    it('should clear all cache', async () => {
      await recipeService.storeInCache('Product 1', [{ id: '1' }]);
      await recipeService.storeInCache('Product 2', [{ id: '2' }]);
      
      expect(Object.keys(recipeService.cache).length).toBe(2);
      
      await recipeService.clearCache();
      
      expect(Object.keys(recipeService.cache).length).toBe(0);
    });
  });

  describe('fetchFromAPI', () => {
    it('should fetch recipes from Spoonacular API', async () => {
      const mockApiResponse = [
        {
          id: 12345,
          title: 'Beef Tacos',
          image: 'https://spoonacular.com/recipeImages/12345-312x231.jpg',
          readyInMinutes: 30,
          servings: 4
        },
        {
          id: 67890,
          title: 'Spaghetti Bolognese',
          image: 'https://spoonacular.com/recipeImages/67890-312x231.jpg',
          readyInMinutes: 45,
          servings: 6
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const recipes = await recipeService.fetchFromAPI('Hakket Oksekød');
      
      expect(fetch).toHaveBeenCalledTimes(1);
      // Should translate "Hakket Oksekød" to "ground beef"
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('ingredients=ground%20beef'),
        expect.any(Object)
      );
      
      expect(recipes).toHaveLength(2);
      expect(recipes[0]).toMatchObject({
        id: '12345',
        title: 'Beef Tacos',
        imageUrl: 'https://spoonacular.com/recipeImages/12345-312x231.jpg',
        prepTime: 30,
        servings: 4,
        difficulty: 'medium',
        apiSource: 'spoonacular'
      });
    });

    it('should limit to max recipes (3)', async () => {
      const mockApiResponse = [
        { id: 1, title: 'Recipe 1', readyInMinutes: 20, servings: 2 },
        { id: 2, title: 'Recipe 2', readyInMinutes: 25, servings: 3 },
        { id: 3, title: 'Recipe 3', readyInMinutes: 30, servings: 4 },
        { id: 4, title: 'Recipe 4', readyInMinutes: 35, servings: 5 },
        { id: 5, title: 'Recipe 5', readyInMinutes: 40, servings: 6 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const recipes = await recipeService.fetchFromAPI('Test Product');
      
      expect(recipes).toHaveLength(3);
      expect(recipes.map(r => r.id)).toEqual(['1', '2', '3']);
    });

    it('should return empty array when API key is missing', async () => {
      const serviceWithoutKey = new RecipeService({
        apiKey: null,
        cacheFilePath: testCachePath
      });
      
      await serviceWithoutKey.initialize();
      
      const recipes = await serviceWithoutKey.fetchFromAPI('Test Product');
      
      expect(recipes).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle API quota exceeded (402)', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        statusText: 'Payment Required'
      });

      const recipes = await recipeService.fetchFromAPI('Test Product');
      
      expect(recipes).toEqual([]);
    });

    it('should handle invalid API key (401)', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const recipes = await recipeService.fetchFromAPI('Test Product');
      
      expect(recipes).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const recipes = await recipeService.fetchFromAPI('Test Product');
      
      expect(recipes).toEqual([]);
    });

    it('should return empty array for empty product name', async () => {
      const recipes = await recipeService.fetchFromAPI('');
      
      expect(recipes).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('getRecipes', () => {
    it('should return cached recipes if available', async () => {
      const cachedRecipes = [{ id: '1', title: 'Cached Recipe' }];
      await recipeService.storeInCache('Test Product', cachedRecipes);
      
      const recipes = await recipeService.getRecipes('Test Product');
      
      expect(recipes).toEqual(cachedRecipes);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache if not in cache', async () => {
      const mockApiResponse = [
        {
          id: 123,
          title: 'API Recipe',
          image: 'http://example.com/image.jpg',
          readyInMinutes: 20,
          servings: 2
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const recipes = await recipeService.getRecipes('New Product');
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(recipes).toHaveLength(1);
      expect(recipes[0].title).toBe('API Recipe');
      
      // Verify it was cached
      const cached = recipeService.getFromCache('New Product');
      expect(cached).toEqual(recipes);
    });

    it('should cache empty results to avoid repeated API calls', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const recipes = await recipeService.getRecipes('Unknown Product');
      
      expect(recipes).toEqual([]);
      
      // Second call should use cache
      const recipesAgain = await recipeService.getRecipes('Unknown Product');
      
      expect(recipesAgain).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1); // Only once, second used cache
    });

    it('should return empty array for null product name', async () => {
      const recipes = await recipeService.getRecipes(null);
      
      expect(recipes).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return empty array for undefined product name', async () => {
      const recipes = await recipeService.getRecipes(undefined);
      
      expect(recipes).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('integration with real-world product names', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 999,
            title: 'Test Recipe',
            image: 'http://example.com/recipe.jpg',
            readyInMinutes: 30,
            servings: 4
          }
        ]
      });
    });

    it('should handle Danish meat products', async () => {
      await recipeService.getRecipes('Hakket Oksekød 8-12%');
      
      // Should translate "Hakket Oksekød" to "ground beef"
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('ground%20beef'),
        expect.any(Object)
      );
    });

    it('should handle dairy products', async () => {
      await recipeService.getRecipes('Økologisk Mælk 3,5%');
      
      // Should translate "Mælk" to "milk"
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('milk'),
        expect.any(Object)
      );
    });

    it('should handle vegetables', async () => {
      await recipeService.getRecipes('Tomater - Cherry');
      
      // Should translate "Tomater" to "tomatoes"
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tomatoes'),
        expect.any(Object)
      );
    });
  });
});
