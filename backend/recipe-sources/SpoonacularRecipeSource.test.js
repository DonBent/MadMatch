// Epic 3.5 Slice 2: SpoonacularRecipeSource Tests
// Correlation ID: ZHC-MadMatch-20260301-004

const { SpoonacularRecipeSource } = require('../recipe-sources/SpoonacularRecipeSource');

// Mock fetch
global.fetch = jest.fn();

describe('SpoonacularRecipeSource', () => {
  let source;

  beforeEach(() => {
    source = new SpoonacularRecipeSource({
      apiKey: 'test-api-key',
      sourceId: 'spoonacular',
      sourceName: 'Spoonacular',
      priority: 2,
    });

    jest.clearAllMocks();
  });

  describe('getSourceInfo', () => {
    test('returns correct metadata', () => {
      const info = source.getSourceInfo();
      
      expect(info).toEqual({
        id: 'spoonacular',
        name: 'Spoonacular',
        priority: 2,
        enabled: true,
      });
    });

    test('shows disabled when no API key', () => {
      const noKeySource = new SpoonacularRecipeSource({ apiKey: null });
      const info = noKeySource.getSourceInfo();
      
      expect(info.enabled).toBe(false);
    });
  });

  describe('getRecipe', () => {
    const mockApiResponse = {
      id: 12345,
      title: 'Chicken Alfredo',
      summary: 'A delicious pasta dish',
      image: 'https://example.com/image.jpg',
      readyInMinutes: 45,
      servings: 4,
      extendedIngredients: [
        { name: 'chicken', amount: 500, unit: 'g' },
        { name: 'pasta', amount: 200, unit: 'g' },
      ],
      analyzedInstructions: [
        {
          steps: [
            { step: 'Cook pasta' },
            { step: 'Grill chicken' },
          ],
        },
      ],
    };

    test('fetches recipe from API', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await source.getRecipe('12345');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/12345/information'),
        expect.any(Object)
      );

      expect(result).toMatchObject({
        id: 'spoonacular-12345',
        title: 'Chicken Alfredo',
        language: 'en',
        difficulty: 'MEDIUM',
        ingredients: [
          { name: 'chicken', quantity: '500 g', order: 1 },
          { name: 'pasta', quantity: '200 g', order: 2 },
        ],
        instructions: ['Cook pasta', 'Grill chicken'],
      });
    });

    test('handles spoonacular- prefix in ID', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      await source.getRecipe('spoonacular-12345');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/12345/information'),
        expect.any(Object)
      );
    });

    test('returns null on API error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await source.getRecipe('99999');

      expect(result).toBeNull();
    });

    test('uses cache on second request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      await source.getRecipe('12345');
      const cached = await source.getRecipe('12345');

      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
      expect(cached).toBeDefined();
    });
  });

  describe('search', () => {
    const mockSearchResponse = {
      results: [
        {
          id: 123,
          title: 'Pasta Primavera',
          image: 'https://example.com/pasta.jpg',
          readyInMinutes: 30,
        },
        {
          id: 456,
          title: 'Spaghetti Carbonara',
          image: 'https://example.com/spaghetti.jpg',
          readyInMinutes: 25,
        },
      ],
    };

    test('searches recipes by query', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      });

      const results = await source.search('pasta', { limit: 10 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/complexSearch'),
        expect.any(Object)
      );

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Pasta Primavera');
      expect(results[0].language).toBe('en');
    });

    test('applies maxTime filter', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockSearchResponse,
      });

      await source.search('quick meals', { maxTime: 30 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('maxReadyTime=30'),
        expect.any(Object)
      );
    });

    test('returns empty array on API error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await source.search('test');

      expect(results).toEqual([]);
    });
  });

  describe('getRecipesByIngredient', () => {
    const mockIngredientResponse = [
      {
        id: 789,
        title: 'Beef Stew',
        image: 'https://example.com/stew.jpg',
        usedIngredients: [
          { name: 'beef', amount: 500, unit: 'g' },
        ],
        missedIngredients: [
          { name: 'potatoes', amount: 3, unit: '' },
        ],
      },
    ];

    test('searches by ingredient', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockIngredientResponse,
      });

      const results = await source.getRecipesByIngredient('hakket oksekød');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/findByIngredients'),
        expect.any(Object)
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Beef Stew');
      expect(results[0].ingredients).toHaveLength(2);
    });

    test('cleans ingredient name', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockIngredientResponse,
      });

      await source.getRecipesByIngredient('Hakket Oksekød 8-12% Økologisk');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/findByIngredients'),
        expect.any(Object)
      );
      
      // Verify ingredient was cleaned (removed percentages and "økologisk")
      const call = global.fetch.mock.calls[0][0];
      expect(call).toContain('ingredients=hakket');
    });
  });

  describe('healthCheck', () => {
    test('returns healthy when API accessible', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ recipes: [{ id: 1 }] }),
      });

      const health = await source.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toContain('accessible');
    });

    test('returns unhealthy on API error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const health = await source.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('unavailable');
    });

    test('returns unhealthy when no API key', async () => {
      const noKeySource = new SpoonacularRecipeSource({ apiKey: null });
      const health = await noKeySource.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('not configured');
    });
  });

  describe('difficulty calculation', () => {
    test('calculates EASY for <30 min', () => {
      expect(source._calculateDifficulty(25)).toBe('EASY');
    });

    test('calculates MEDIUM for 30-60 min', () => {
      expect(source._calculateDifficulty(45)).toBe('MEDIUM');
    });

    test('calculates HARD for >60 min', () => {
      expect(source._calculateDifficulty(90)).toBe('HARD');
    });

    test('defaults to MEDIUM if no time', () => {
      expect(source._calculateDifficulty(null)).toBe('MEDIUM');
    });
  });

  describe('ingredient extraction', () => {
    test('removes percentage ranges', () => {
      expect(source._extractIngredient('Hakket Oksekød 8-12%')).toBe('hakket oksekød');
    });

    test('removes økologisk and dansk', () => {
      expect(source._extractIngredient('Dansk Økologisk Kylling')).toBe('kylling');
    });

    test('takes first part before separators', () => {
      expect(source._extractIngredient('Hakket Oksekød, Frossen')).toBe('hakket oksekød');
    });
  });

  describe('cache', () => {
    test('clears cache', () => {
      source.cache.set('test', { data: 'value', expiresAt: Date.now() + 10000 });
      
      source.clearCache();
      
      expect(source.cache.size).toBe(0);
    });
  });
});
