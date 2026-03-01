/**
 * Unit tests for recipeService (Epic 3.5 Slice 5)
 */

import {
  searchRecipes,
  getRecipe,
  getRecipesByIngredient,
  getRecipeSources,
  getRecipesForProduct,
  clearCache,
  getCacheStats
} from './recipeService';

// Mock fetch globally
global.fetch = jest.fn();

describe('RecipeService', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
    // Reset fetch mock
    fetch.mockClear();
  });

  describe('searchRecipes', () => {
    it('should fetch recipes from API', async () => {
      const mockResponse = {
        recipes: [
          {
            id: 'recipe-1',
            title: 'Test Recipe',
            source: { name: 'Arla' }
          }
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await searchRecipes('kylling', { language: 'da' });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/search?q=kylling'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use cached data on second call', async () => {
      const mockResponse = {
        recipes: [{ id: 'recipe-1', title: 'Test Recipe' }],
        total: 1
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First call - should hit API
      const result1 = await searchRecipes('pasta');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await searchRecipes('pasta');
      expect(fetch).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result2).toEqual(result1);
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(searchRecipes('error')).rejects.toThrow('HTTP 500');
    });

    it('should cache different queries separately', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ recipes: [] })
      });

      await searchRecipes('kylling');
      await searchRecipes('pasta');

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRecipe', () => {
    it('should fetch single recipe by ID', async () => {
      const mockRecipe = {
        id: 'recipe-123',
        title: 'Test Recipe',
        source: { name: 'Arla' },
        language: 'da'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecipe
      });

      const result = await getRecipe('recipe-123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/recipe-123'),
        expect.any(Object)
      );
      expect(result).toEqual(mockRecipe);
    });

    it('should handle 404 errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(getRecipe('nonexistent')).rejects.toThrow('not found');
    });

    it('should cache recipe by ID', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'recipe-123', title: 'Cached Recipe' })
      });

      await getRecipe('recipe-123');
      await getRecipe('recipe-123');

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecipesByIngredient', () => {
    it('should fetch recipes by ingredient', async () => {
      const mockResponse = {
        ingredient: 'hakket oksekød',
        recipes: [{ id: 'recipe-1', title: 'Bolognese' }],
        total: 1
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getRecipesByIngredient('hakket oksekød');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/by-ingredient?ingredient=hakket'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should cache ingredient searches', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ingredient: 'egg', recipes: [] })
      });

      await getRecipesByIngredient('egg');
      await getRecipesByIngredient('egg');

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecipeSources', () => {
    it('should fetch recipe sources', async () => {
      const mockSources = {
        sources: [
          { id: 'source-1', name: 'Arla', healthy: true },
          { id: 'source-2', name: 'Spoonacular', healthy: true }
        ],
        total: 2
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSources
      });

      const result = await getRecipeSources();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/sources'),
        expect.any(Object)
      );
      expect(result).toEqual(mockSources);
    });

    it('should cache sources', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sources: [], total: 0 })
      });

      await getRecipeSources();
      await getRecipeSources();

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecipesForProduct (legacy)', () => {
    it('should fetch recipes for product ID', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'recipe-1', title: 'Product Recipe' }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getRecipesForProduct('product-123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/produkt/product-123/recipes'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty data array', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });

      const result = await getRecipesForProduct('product-456');

      expect(result).toEqual([]);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ recipes: [] })
      });

      await searchRecipes('test');
      expect(getCacheStats().size).toBe(1);

      clearCache();
      expect(getCacheStats().size).toBe(0);

      // Should fetch again after clear
      await searchRecipes('test');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should report cache stats', () => {
      const stats = getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttlMs');
      expect(stats.ttlMs).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('should expire cache after TTL', async () => {
      jest.useFakeTimers();

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ recipes: [] })
      });

      await searchRecipes('test');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Advance time by 11 minutes (past TTL)
      jest.advanceTimersByTime(11 * 60 * 1000);

      await searchRecipes('test');
      expect(fetch).toHaveBeenCalledTimes(2); // Cache expired, new fetch

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should log fallback events', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      await expect(searchRecipes('test')).rejects.toThrow();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RecipeService] Fallback triggered'),
        expect.any(String),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchRecipes('test')).rejects.toThrow('Network error');
    });
  });
});
