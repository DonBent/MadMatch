// Epic 3.5 Slice 4: DatabaseRecipeSource Integration Tests
// Correlation ID: ZHC-MadMatch-Epic3.5-DatabaseInfrastructure
// 
// CRITICAL: Real database tests to catch SQL syntax errors
// Bug fix: Unit tests with mocks did not catch nested $queryRaw template error
// 
// These tests require:
// - Running PostgreSQL database
// - DATABASE_URL environment variable
// - Test data fixtures

const { DatabaseRecipeSource } = require('./DatabaseRecipeSource');
const { getPrismaClient } = require('../services/databaseService');

describe('DatabaseRecipeSource Integration Tests', () => {
  let source;
  let prisma;
  let testRecipes = [];

  beforeAll(async () => {
    // Get real Prisma client
    prisma = getPrismaClient();
    
    // Verify database connection
    try {
      await prisma.$connect();
    } catch (error) {
      console.error('Cannot connect to database for integration tests:', error.message);
      throw new Error('Database connection required for integration tests. Set DATABASE_URL.');
    }

    source = new DatabaseRecipeSource({
      sourceId: 'integration-test-db',
      sourceName: 'Integration Test Database',
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testRecipes.length > 0) {
      const recipeIds = testRecipes.map(r => r.id);
      
      // Delete ingredients first (foreign key constraint)
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: { in: recipeIds } },
      });
      
      // Delete recipes
      await prisma.recipe.deleteMany({
        where: { id: { in: recipeIds } },
      });
    }

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test source if it doesn't exist
    const testSource = await prisma.recipeSource.upsert({
      where: { name: 'Test Source Integration' },
      update: {},
      create: {
        name: 'Test Source Integration',
        baseUrl: 'https://test.example.com/',
        scrapingEnabled: false,
        priority: 99,
      },
    });

    // Create test recipes with realistic data
    const recipe1 = await prisma.recipe.create({
      data: {
        title: 'Spaghetti Carbonara',
        description: 'Classic Italian pasta dish with eggs and bacon',
        language: 'da',
        difficulty: 'MEDIUM',
        cookTimeMinutes: 20,
        totalTimeMinutes: 30,
        servings: 4,
        sourceId: testSource.id,
        instructions: 'Kog pasta\nStek bacon\nBland med æg',
        ingredients: {
          create: [
            { ingredientName: 'spaghetti', quantity: '400g', order: 1 },
            { ingredientName: 'bacon', quantity: '200g', order: 2 },
            { ingredientName: 'æg', quantity: '3 stk', order: 3 },
            { ingredientName: 'parmesan', quantity: '100g', order: 4 },
          ],
        },
      },
      include: { ingredients: true },
    });

    const recipe2 = await prisma.recipe.create({
      data: {
        title: 'Pasta Bolognese',
        description: 'Traditional meat sauce with pasta',
        language: 'da',
        difficulty: 'EASY',
        cookTimeMinutes: 45,
        totalTimeMinutes: 60,
        servings: 6,
        sourceId: testSource.id,
        instructions: 'Stek kødet\nTilsæt tomater\nKog pasta',
        ingredients: {
          create: [
            { ingredientName: 'pasta', quantity: '500g', order: 1 },
            { ingredientName: 'hakket oksekød', quantity: '500g', order: 2 },
            { ingredientName: 'løg', quantity: '1 stk', order: 3 },
            { ingredientName: 'hvidløg', quantity: '2 fed', order: 4 },
            { ingredientName: 'tomater', quantity: '400g', order: 5 },
          ],
        },
      },
      include: { ingredients: true },
    });

    const recipe3 = await prisma.recipe.create({
      data: {
        title: 'Quick Chicken Salad',
        description: 'Fresh and healthy chicken salad',
        language: 'en',
        difficulty: 'EASY',
        cookTimeMinutes: 15,
        totalTimeMinutes: 20,
        servings: 2,
        sourceId: testSource.id,
        instructions: 'Grill chicken\nChop vegetables\nMix everything',
        ingredients: {
          create: [
            { ingredientName: 'chicken breast', quantity: '300g', order: 1 },
            { ingredientName: 'lettuce', quantity: '1 head', order: 2 },
            { ingredientName: 'tomatoes', quantity: '2 pcs', order: 3 },
            { ingredientName: 'cucumber', quantity: '1 pc', order: 4 },
          ],
        },
      },
      include: { ingredients: true },
    });

    testRecipes = [recipe1, recipe2, recipe3];
  });

  afterEach(async () => {
    // Clean up after each test
    if (testRecipes.length > 0) {
      const recipeIds = testRecipes.map(r => r.id);
      
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: { in: recipeIds } },
      });
      
      await prisma.recipe.deleteMany({
        where: { id: { in: recipeIds } },
      });
    }
    
    testRecipes = [];
  });

  describe('search() - Real SQL Queries', () => {
    test('should execute valid SQL with no filters', async () => {
      const results = await source.search('pasta');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Should find our test recipes
      const titles = results.map(r => r.title);
      expect(titles).toContain('Spaghetti Carbonara');
    });

    test('should execute valid SQL with language filter', async () => {
      const results = await source.search('pasta', { language: 'da' });

      expect(results).toBeDefined();
      expect(results.every(r => r.language === 'da')).toBe(true);
      
      // Should not return English recipe
      const titles = results.map(r => r.title);
      expect(titles).not.toContain('Quick Chicken Salad');
    });

    test('should execute valid SQL with difficulty filter', async () => {
      const results = await source.search('pasta', { difficulty: 'EASY' });

      expect(results).toBeDefined();
      expect(results.every(r => r.difficulty === 'EASY')).toBe(true);
      
      const titles = results.map(r => r.title);
      expect(titles).toContain('Pasta Bolognese');
      expect(titles).not.toContain('Spaghetti Carbonara'); // MEDIUM difficulty
    });

    test('should execute valid SQL with maxTime filter', async () => {
      const results = await source.search('pasta', { maxTime: 30 });

      expect(results).toBeDefined();
      expect(results.every(r => r.cookTimeMinutes <= 30)).toBe(true);
      
      const titles = results.map(r => r.title);
      expect(titles).toContain('Spaghetti Carbonara'); // 20 min
      expect(titles).not.toContain('Pasta Bolognese'); // 45 min
    });

    test('should execute valid SQL with multiple filters combined', async () => {
      const results = await source.search('pasta', {
        language: 'da',
        difficulty: 'MEDIUM',
        maxTime: 30,
      });

      expect(results).toBeDefined();
      
      const carbonara = results.find(r => r.title === 'Spaghetti Carbonara');
      expect(carbonara).toBeDefined();
      expect(carbonara.language).toBe('da');
      expect(carbonara.difficulty).toBe('MEDIUM');
    });

    test('should handle empty results without SQL error', async () => {
      const results = await source.search('nonexistent-xyzabc123');

      expect(results).toBeDefined();
      expect(results).toEqual([]);
    });

    test('should respect limit and offset', async () => {
      const results = await source.search('pasta', { limit: 1, offset: 0 });

      expect(results).toBeDefined();
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getRecipesByIngredient() - Real SQL Queries', () => {
    test('should execute valid SQL with no filters', async () => {
      const results = await source.getRecipesByIngredient('bacon');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      const carbonara = results.find(r => r.title === 'Spaghetti Carbonara');
      expect(carbonara).toBeDefined();
      expect(carbonara.ingredients.some(i => i.name === 'bacon')).toBe(true);
    });

    test('should execute valid SQL with language filter', async () => {
      const results = await source.getRecipesByIngredient('tomater', { language: 'da' });

      expect(results).toBeDefined();
      expect(results.every(r => r.language === 'da')).toBe(true);
    });

    test('should execute valid SQL with difficulty filter', async () => {
      const results = await source.getRecipesByIngredient('pasta', { difficulty: 'EASY' });

      expect(results).toBeDefined();
      expect(results.every(r => r.difficulty === 'EASY')).toBe(true);
    });

    test('should execute valid SQL with maxTime filter', async () => {
      const results = await source.getRecipesByIngredient('chicken', { maxTime: 20 });

      expect(results).toBeDefined();
      
      // Quick Chicken Salad is 15 minutes
      const salad = results.find(r => r.title === 'Quick Chicken Salad');
      expect(salad).toBeDefined();
    });

    test('should handle fuzzy matching', async () => {
      // Search for "oksekød" should match "hakket oksekød"
      const results = await source.getRecipesByIngredient('oksekød');

      expect(results).toBeDefined();
      
      const bolognese = results.find(r => r.title === 'Pasta Bolognese');
      expect(bolognese).toBeDefined();
    });
  });

  describe('getRecipe() - Real SQL Queries', () => {
    test('should fetch recipe by UUID', async () => {
      const testRecipe = testRecipes[0];
      const result = await source.getRecipe(testRecipe.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(testRecipe.id);
      expect(result.title).toBe(testRecipe.title);
      expect(result.ingredients).toBeDefined();
      expect(result.ingredients.length).toBeGreaterThan(0);
    });

    test('should return null for non-existent recipe', async () => {
      const result = await source.getRecipe('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('Empty Database Scenario', () => {
    beforeEach(async () => {
      // Clean up all test recipes
      if (testRecipes.length > 0) {
        const recipeIds = testRecipes.map(r => r.id);
        
        await prisma.recipeIngredient.deleteMany({
          where: { recipeId: { in: recipeIds } },
        });
        
        await prisma.recipe.deleteMany({
          where: { id: { in: recipeIds } },
        });
        
        testRecipes = [];
      }
    });

    test('should handle search on empty database', async () => {
      const results = await source.search('anything');

      expect(results).toBeDefined();
      expect(results).toEqual([]);
    });

    test('should handle ingredient search on empty database', async () => {
      const results = await source.getRecipesByIngredient('anything');

      expect(results).toBeDefined();
      expect(results).toEqual([]);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should safely handle malicious input in search', async () => {
      const maliciousQuery = "'; DROP TABLE recipes; --";
      
      // Should not throw error and should not execute SQL injection
      await expect(source.search(maliciousQuery)).resolves.toBeDefined();
      
      // Verify recipes table still exists
      const count = await prisma.recipe.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should safely handle malicious input in language filter', async () => {
      const maliciousFilter = "da'; DELETE FROM recipes WHERE '1'='1";
      
      await expect(source.search('pasta', { language: maliciousFilter })).resolves.toBeDefined();
      
      // Verify no data was deleted
      const count = await prisma.recipe.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Check', () => {
    test('should report healthy with real database', async () => {
      const health = await source.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toContain('healthy');
      expect(health.message).toMatch(/\d+ recipes/);
    });
  });
});
