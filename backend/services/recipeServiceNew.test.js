// Epic 3.5 Slice 2: RecipeService Orchestrator Tests
// Correlation ID: ZHC-MadMatch-20260301-004

const { RecipeService } = require('../services/recipeServiceNew');
const { IRecipeSource } = require('../interfaces/IRecipeSource');

// Mock sources
class MockRecipeSource extends IRecipeSource {
  constructor(id, name, priority, recipes = []) {
    super();
    this.id = id;
    this.name = name;
    this.priority = priority;
    this.recipes = recipes;
    this.enabled = true;
    this.healthy = true;
  }

  async getRecipe(id) {
    return this.recipes.find(r => r.id === id) || null;
  }

  async search(query, filters = {}) {
    return this.recipes.filter(r => 
      r.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, filters.limit || 10);
  }

  async getRecipesByIngredient(ingredient, filters = {}) {
    return this.recipes.filter(r => 
      r.ingredients.some(ing => 
        ing.name.toLowerCase().includes(ingredient.toLowerCase())
      )
    ).slice(0, filters.limit || 10);
  }

  getSourceInfo() {
    return {
      id: this.id,
      name: this.name,
      priority: this.priority,
      enabled: this.enabled,
    };
  }

  async healthCheck() {
    return {
      healthy: this.healthy,
      message: this.healthy ? 'OK' : 'Unavailable',
    };
  }
}

describe('RecipeService', () => {
  let service;
  let databaseSource;
  let spoonacularSource;

  const dbRecipes = [
    {
      id: 'db-1',
      title: 'Danish Chicken',
      language: 'da',
      sourceId: 'database',
      sourceName: 'Database',
      ingredients: [{ name: 'chicken', quantity: '500g', order: 1 }],
    },
    {
      id: 'db-2',
      title: 'Danish Pasta',
      language: 'da',
      sourceId: 'database',
      sourceName: 'Database',
      ingredients: [{ name: 'pasta', quantity: '200g', order: 1 }],
    },
  ];

  const spoonacularRecipes = [
    {
      id: 'spoon-1',
      title: 'Chicken Alfredo',
      language: 'en',
      sourceId: 'spoonacular',
      sourceName: 'Spoonacular',
      ingredients: [{ name: 'chicken', quantity: '300g', order: 1 }],
    },
    {
      id: 'spoon-2',
      title: 'Pasta Carbonara',
      language: 'en',
      sourceId: 'spoonacular',
      sourceName: 'Spoonacular',
      ingredients: [{ name: 'pasta', quantity: '250g', order: 1 }],
    },
  ];

  beforeEach(() => {
    databaseSource = new MockRecipeSource('database', 'Database', 1, dbRecipes);
    spoonacularSource = new MockRecipeSource('spoonacular', 'Spoonacular', 2, spoonacularRecipes);

    service = new RecipeService({
      sources: [databaseSource, spoonacularSource],
      cacheTTL: 100, // Short TTL for testing
    });
  });

  describe('initialization', () => {
    test('sorts sources by priority', () => {
      const unsortedService = new RecipeService({
        sources: [spoonacularSource, databaseSource], // Wrong order
      });

      const sources = unsortedService.sources;
      expect(sources[0].getSourceInfo().id).toBe('database'); // Priority 1 first
      expect(sources[1].getSourceInfo().id).toBe('spoonacular'); // Priority 2 second
    });

    test('initializes default sources when none provided', () => {
      // Mock environment
      process.env.SPOONACULAR_API_KEY = 'test-key';
      
      const defaultService = new RecipeService();
      
      expect(defaultService.sources.length).toBeGreaterThan(0);
    });
  });

  describe('getRecipe', () => {
    test('fetches recipe from first available source', async () => {
      const recipe = await service.getRecipe('db-1');

      expect(recipe).toBeDefined();
      expect(recipe.id).toBe('db-1');
      expect(recipe.title).toBe('Danish Chicken');
    });

    test('falls back to second source if not found in first', async () => {
      const recipe = await service.getRecipe('spoon-1');

      expect(recipe).toBeDefined();
      expect(recipe.id).toBe('spoon-1');
      expect(recipe.title).toBe('Chicken Alfredo');
    });

    test('returns null if not found in any source', async () => {
      const recipe = await service.getRecipe('nonexistent');

      expect(recipe).toBeNull();
    });

    test('uses cache on second request', async () => {
      const spy = jest.spyOn(databaseSource, 'getRecipe');

      await service.getRecipe('db-1');
      await service.getRecipe('db-1'); // Should hit cache

      expect(spy).toHaveBeenCalledTimes(1); // Only called once
    });

    test('skips disabled sources', async () => {
      databaseSource.enabled = false;
      
      const recipe = await service.getRecipe('db-1');

      expect(recipe).toBeNull(); // Not found because database disabled
    });
  });

  describe('search', () => {
    test('returns results from highest priority source', async () => {
      // Service has minResultsBeforeFallback = 3 by default
      // So it will query both sources if first has < 3 results
      const results = await service.search('chicken');

      expect(results.length).toBeGreaterThan(0);
      // First result should be from database (higher priority)
      expect(results[0].id).toBe('db-1');
      expect(results[0].sourceName).toBe('Database');
    });

    test('falls back to lower priority source if insufficient results', async () => {
      const results = await service.search('pasta', {
        minResultsBeforeFallback: 3, // Need 3 results
      });

      // Should get 1 from database + 1 from Spoonacular
      expect(results.length).toBeGreaterThan(1);
      expect(results.some(r => r.sourceId === 'database')).toBe(true);
      expect(results.some(r => r.sourceId === 'spoonacular')).toBe(true);
    });

    test('deduplicates results by title', async () => {
      // Add duplicate recipe to Spoonacular
      spoonacularSource.recipes.push({
        id: 'spoon-dup',
        title: 'Danish Chicken', // Same title as db-1
        language: 'en',
        sourceId: 'spoonacular',
        sourceName: 'Spoonacular',
        ingredients: [],
      });

      service.fallbackStrategy = 'all';
      const results = await service.search('chicken');

      // Should only have one "Danish Chicken" even though in both sources
      const chickenRecipes = results.filter(r => r.title === 'Danish Chicken');
      expect(chickenRecipes).toHaveLength(1);
    });

    test('applies limit filter', async () => {
      service.fallbackStrategy = 'all';
      const results = await service.search('chicken', { limit: 1 });

      expect(results).toHaveLength(1);
    });

    test('uses cache', async () => {
      const spy = jest.spyOn(databaseSource, 'search');

      await service.search('chicken');
      await service.search('chicken'); // Cached

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecipesByIngredient', () => {
    test('searches by ingredient across sources', async () => {
      const results = await service.getRecipesByIngredient('chicken');

      expect(results.length).toBeGreaterThan(0);
      // First result should be from database (higher priority)
      expect(results[0].id).toBe('db-1');
    });

    test('falls back if insufficient results', async () => {
      service.minResultsBeforeFallback = 2;
      
      const results = await service.getRecipesByIngredient('chicken');

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    test('deduplicates results', async () => {
      service.fallbackStrategy = 'all';
      
      const results = await service.getRecipesByIngredient('pasta');

      const titles = results.map(r => r.title);
      const uniqueTitles = [...new Set(titles)];
      
      expect(titles.length).toBe(uniqueTitles.length);
    });
  });

  describe('getSources', () => {
    test('returns metadata for all sources', async () => {
      const sources = await service.getSources();

      expect(sources).toHaveLength(2);
      expect(sources[0]).toMatchObject({
        id: 'database',
        name: 'Database',
        priority: 1,
        healthy: true,
      });
      expect(sources[1]).toMatchObject({
        id: 'spoonacular',
        name: 'Spoonacular',
        priority: 2,
        healthy: true,
      });
    });
  });

  describe('healthCheck', () => {
    test('returns healthy when all sources healthy', async () => {
      const health = await service.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.sources).toHaveLength(2);
    });

    test('returns unhealthy when any source unhealthy', async () => {
      databaseSource.healthy = false;

      const health = await service.healthCheck();

      expect(health.healthy).toBe(false);
    });
  });

  describe('source management', () => {
    test('adds a new source', () => {
      const newSource = new MockRecipeSource('new', 'New Source', 3, []);
      
      service.addSource(newSource);

      expect(service.sources).toHaveLength(3);
    });

    test('removes a source', () => {
      service.removeSource('spoonacular');

      expect(service.sources).toHaveLength(1);
      expect(service.sources[0].getSourceInfo().id).toBe('database');
    });

    test('re-sorts after adding source', () => {
      const highPrioritySource = new MockRecipeSource('high', 'High Priority', 0, []);
      
      service.addSource(highPrioritySource);

      expect(service.sources[0].getSourceInfo().id).toBe('high');
    });
  });

  describe('clearCache', () => {
    test('clears orchestrator cache', async () => {
      const spy = jest.spyOn(databaseSource, 'search');

      await service.search('chicken');
      service.clearCache();
      await service.search('chicken'); // Should not hit cache

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('backward compatibility', () => {
    test('getRecipes method still works', async () => {
      const results = await service.getRecipes('chicken');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    test('continues to next source on error', async () => {
      jest.spyOn(databaseSource, 'search').mockRejectedValue(new Error('DB error'));

      const results = await service.search('pasta');

      // Should still get Spoonacular results
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].sourceId).toBe('spoonacular');
    });

    test('returns empty array if all sources fail', async () => {
      jest.spyOn(databaseSource, 'search').mockRejectedValue(new Error('DB error'));
      jest.spyOn(spoonacularSource, 'search').mockRejectedValue(new Error('API error'));

      const results = await service.search('test');

      expect(results).toEqual([]);
    });
  });
});
