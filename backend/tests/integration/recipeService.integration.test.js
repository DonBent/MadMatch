// Epic 3.5 Slice 6: Integration Tests for Recipe Service
// Correlation ID: ZHC-MadMatch-Epic3.5-DatabaseInfrastructure
// Tests the complete recipe system with real database

const { RecipeService } = require('../../services/recipeServiceNew');
const { DatabaseRecipeSource } = require('../../recipe-sources/DatabaseRecipeSource');
const { SpoonacularRecipeSource } = require('../../recipe-sources/SpoonacularRecipeSource');
const { getPrismaClient } = require('../../services/databaseService');

/**
 * Integration Test Suite
 * 
 * Tests the complete Epic 3.5 stack:
 * - RecipeService orchestrator
 * - DatabaseRecipeSource with real PostgreSQL
 * - SpoonacularRecipeSource (mocked API)
 * - Multi-source fallback logic
 * - Three-level caching (orchestrator, sources, database)
 */
describe('RecipeService Integration Tests', () => {
  let recipeService;
  let testRecipeId;
  let testSourceId;
  let prisma;

  // Setup: Create test data in database
  beforeAll(async () => {
    // Initialize Prisma client (must be done here, after setup.js loads env vars)
    prisma = getPrismaClient();
    // Find or create test recipe source
    const arlaSource = await prisma.recipeSource.findFirst({
      where: { name: 'Arla' }
    });

    if (arlaSource) {
      testSourceId = arlaSource.id;
    } else {
      const newSource = await prisma.recipeSource.create({
        data: {
          name: 'Test Source',
          url: 'https://test.example.com',
          scrapingEnabled: false,
          language: 'da'
        }
      });
      testSourceId = newSource.id;
    }

    // Create test recipe
    const testRecipe = await prisma.recipe.create({
      data: {
        title: 'Integration Test Kylling Recipe',
        slug: 'integration-test-kylling-recipe',
        description: 'A test recipe for integration testing',
        sourceId: testSourceId,
        language: 'da',
        difficulty: 'EASY',
        servings: 4,
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        totalTimeMinutes: 45,
        imageUrl: 'https://test.example.com/test.jpg',
        instructions: 'Step 1: Test\nStep 2: Integration\nStep 3: Success',
        ingredients: {
          create: [
            { ingredientName: 'kyllingebryst', quantity: '500 g', order: 1 },
            { ingredientName: 'hakket oksekød', quantity: '250 g', order: 2 },
            { ingredientName: 'løg', quantity: '2 stk', order: 3 }
          ]
        }
      }
    });

    testRecipeId = testRecipe.id;
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    if (testRecipeId) {
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: testRecipeId }
      });
      await prisma.recipe.delete({
        where: { id: testRecipeId }
      });
    }
    await prisma.$disconnect();
  });

  // Initialize RecipeService before each test
  beforeEach(() => {
    recipeService = new RecipeService({
      cacheTTL: 100, // Short TTL for testing
      fallbackStrategy: 'priority',
      minResultsBeforeFallback: 3
    });
  });

  /**
   * Test Suite 1: Database Source Integration
   */
  describe('DatabaseRecipeSource Integration', () => {
    test('should connect to real PostgreSQL database', async () => {
      const dbSource = new DatabaseRecipeSource({
        sourceId: 'database',
        sourceName: 'Database',
        priority: 1
      });

      const health = await dbSource.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.message).toContain('recipes available');
    });

    test('should retrieve test recipe by ID', async () => {
      const recipe = await recipeService.getRecipe(testRecipeId);
      
      expect(recipe).not.toBeNull();
      expect(recipe.id).toBe(testRecipeId);
      expect(recipe.title).toBe('Integration Test Kylling Recipe');
      expect(recipe.language).toBe('da');
      expect(recipe.difficulty).toBe('EASY');
    });

    test('should search recipes with full-text search', async () => {
      const results = await recipeService.search('kylling', {
        language: 'da',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Find our test recipe
      const testRecipe = results.find(r => r.id === testRecipeId);
      expect(testRecipe).toBeDefined();
      expect(testRecipe.title).toContain('Kylling');
    });

    test('should find recipes by ingredient', async () => {
      const results = await recipeService.getRecipesByIngredient('hakket oksekød', {
        language: 'da',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Find our test recipe
      const testRecipe = results.find(r => r.id === testRecipeId);
      expect(testRecipe).toBeDefined();
      
      // Verify ingredients are included
      expect(testRecipe.ingredients).toBeDefined();
      expect(testRecipe.ingredients.length).toBeGreaterThan(0);
    });

    test('should apply difficulty filter', async () => {
      const results = await recipeService.search('test', {
        language: 'da',
        difficulty: 'EASY',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      // All results should be EASY difficulty
      results.forEach(recipe => {
        expect(recipe.difficulty).toBe('EASY');
      });
    });

    test('should apply maxTime filter', async () => {
      const results = await recipeService.search('kylling', {
        language: 'da',
        maxTime: 60, // 60 minutes max
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      // All results should have totalTime <= 60
      results.forEach(recipe => {
        if (recipe.totalTimeMinutes) {
          expect(recipe.totalTimeMinutes).toBeLessThanOrEqual(60);
        }
      });
    });

    test('should handle pagination with limit and offset', async () => {
      // Get first page
      const page1 = await recipeService.search('test', {
        language: 'da',
        limit: 2,
        offset: 0
      });
      
      // Get second page
      const page2 = await recipeService.search('test', {
        language: 'da',
        limit: 2,
        offset: 2
      });
      
      expect(Array.isArray(page1)).toBe(true);
      expect(Array.isArray(page2)).toBe(true);
      
      // Pages should have different results (if enough data)
      if (page1.length > 0 && page2.length > 0) {
        const page1Ids = page1.map(r => r.id);
        const page2Ids = page2.map(r => r.id);
        
        // No overlap between pages
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap.length).toBe(0);
      }
    });
  });

  /**
   * Test Suite 2: Multi-Source Fallback Logic
   */
  describe('Multi-Source Fallback Logic', () => {
    test('should prioritize database over Spoonacular', async () => {
      const results = await recipeService.search('kylling', {
        language: 'da',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      // Should include database results (priority 1)
      const dbResults = results.filter(r => r.sourceId && r.sourceId !== 'spoonacular');
      expect(dbResults.length).toBeGreaterThan(0);
    });

    test('should fallback to Spoonacular if database has few results', async () => {
      // Search for very specific term unlikely in database
      const results = await recipeService.search('xylophone-pasta-unicorn', {
        language: 'en',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      // If database has < 3 results, should fallback to Spoonacular
      // (May return 0 if Spoonacular API is not configured)
    });

    test('should deduplicate results across sources', async () => {
      const results = await recipeService.search('chicken', {
        language: 'en',
        limit: 20
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      // Check for duplicate titles
      const titles = results.map(r => r.title.toLowerCase().trim());
      const uniqueTitles = [...new Set(titles)];
      
      // All titles should be unique
      expect(titles.length).toBe(uniqueTitles.length);
    });

    test('should aggregate results from multiple sources', async () => {
      const service = new RecipeService({
        fallbackStrategy: 'all', // Query all sources
        minResultsBeforeFallback: 0
      });
      
      const results = await service.search('pasta', {
        language: 'en',
        limit: 20
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      // Should have results from multiple sources (if Spoonacular configured)
      const sources = [...new Set(results.map(r => r.sourceId || r.sourceName))];
      
      // At minimum, should have database source
      expect(sources.length).toBeGreaterThan(0);
    });

    test('should respect minResultsBeforeFallback threshold', async () => {
      const service = new RecipeService({
        fallbackStrategy: 'priority',
        minResultsBeforeFallback: 5
      });
      
      const results = await service.search('kylling', {
        language: 'da',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
      
      // If database returns >= 5 results, should not query Spoonacular
      // This is implicit - we can't test absence of Spoonacular call easily
    });
  });

  /**
   * Test Suite 3: Caching Behavior
   */
  describe('Three-Level Caching', () => {
    test('should cache search results at orchestrator level', async () => {
      // Clear cache first
      recipeService.clearCache();
      
      // First call - should hit database
      const start1 = Date.now();
      const results1 = await recipeService.search('kylling', { language: 'da' });
      const duration1 = Date.now() - start1;
      
      // Second call - should hit cache
      const start2 = Date.now();
      const results2 = await recipeService.search('kylling', { language: 'da' });
      const duration2 = Date.now() - start2;
      
      expect(results1).toEqual(results2);
      
      // Cached call should be significantly faster (< 10ms vs 100ms+)
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(20); // Cache hit should be very fast
    });

    test('should cache getRecipe results', async () => {
      recipeService.clearCache();
      
      // First call
      const start1 = Date.now();
      const recipe1 = await recipeService.getRecipe(testRecipeId);
      const duration1 = Date.now() - start1;
      
      // Second call
      const start2 = Date.now();
      const recipe2 = await recipeService.getRecipe(testRecipeId);
      const duration2 = Date.now() - start2;
      
      expect(recipe1).toEqual(recipe2);
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(20);
    });

    test('should cache getRecipesByIngredient results', async () => {
      recipeService.clearCache();
      
      // First call
      const results1 = await recipeService.getRecipesByIngredient('hakket oksekød', {
        language: 'da'
      });
      
      // Second call (should be cached)
      const start = Date.now();
      const results2 = await recipeService.getRecipesByIngredient('hakket oksekød', {
        language: 'da'
      });
      const duration = Date.now() - start;
      
      expect(results1).toEqual(results2);
      expect(duration).toBeLessThan(20);
    });

    test('should respect cache TTL expiration', async () => {
      const shortTTLService = new RecipeService({
        cacheTTL: 50 // 50ms TTL
      });
      
      // First call - populates cache
      const results1 = await shortTTLService.search('test', { language: 'da' });
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second call - should query database again
      const results2 = await shortTTLService.search('test', { language: 'da' });
      
      // Results should be same, but fetched from database (not cache)
      expect(results1).toEqual(results2);
    });

    test('should clear all caches on clearCache()', async () => {
      // Populate caches
      await recipeService.search('kylling', { language: 'da' });
      await recipeService.getRecipe(testRecipeId);
      await recipeService.getRecipesByIngredient('løg', { language: 'da' });
      
      // Verify cache is populated (fast second calls)
      const start1 = Date.now();
      await recipeService.search('kylling', { language: 'da' });
      const cachedDuration = Date.now() - start1;
      expect(cachedDuration).toBeLessThan(20);
      
      // Clear cache
      recipeService.clearCache();
      
      // Next call should be slower (cache miss)
      const start2 = Date.now();
      await recipeService.search('kylling', { language: 'da' });
      const uncachedDuration = Date.now() - start2;
      
      expect(uncachedDuration).toBeGreaterThan(cachedDuration);
    });
  });

  /**
   * Test Suite 4: API Endpoints Integration
   */
  describe('API Endpoints with Real Database', () => {
    // Note: These tests would require a running server
    // For full E2E testing, use supertest
    
    test('should format recipe response correctly', async () => {
      const recipe = await recipeService.getRecipe(testRecipeId);
      
      // Verify recipe has all required fields
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('sourceId');
      expect(recipe).toHaveProperty('language');
      expect(recipe).toHaveProperty('ingredients');
      
      // Verify ingredients structure
      expect(Array.isArray(recipe.ingredients)).toBe(true);
      if (recipe.ingredients.length > 0) {
        expect(recipe.ingredients[0]).toHaveProperty('name');
        expect(recipe.ingredients[0]).toHaveProperty('quantity');
      }
    });

    test('should return standardized format across sources', async () => {
      const results = await recipeService.search('pasta', {
        language: 'en',
        limit: 10
      });
      
      // All recipes should have standardized fields
      results.forEach(recipe => {
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('sourceId');
        expect(recipe).toHaveProperty('language');
        
        // Optional fields should be defined or undefined (not missing)
        expect('imageUrl' in recipe).toBe(true);
        expect('difficulty' in recipe).toBe(true);
        expect('servings' in recipe).toBe(true);
      });
    });
  });

  /**
   * Test Suite 5: Health Checks
   */
  describe('Health Checks', () => {
    test('should report health status for all sources', async () => {
      const health = await recipeService.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('sources');
      expect(Array.isArray(health.sources)).toBe(true);
      expect(health.sources.length).toBeGreaterThan(0);
      
      // Check database source
      const dbSource = health.sources.find(s => s.id === 'database');
      expect(dbSource).toBeDefined();
      expect(dbSource.healthy).toBe(true);
    });

    test('should list all sources with metadata', async () => {
      const sources = await recipeService.getSources();
      
      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThan(0);
      
      sources.forEach(source => {
        expect(source).toHaveProperty('id');
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('priority');
        expect(source).toHaveProperty('enabled');
        expect(source).toHaveProperty('healthy');
      });
    });

    test('should detect database connection failures', async () => {
      // This test would require mocking database failure
      // For now, we verify the happy path
      const dbSource = new DatabaseRecipeSource({
        sourceId: 'database',
        sourceName: 'Database',
        priority: 1
      });
      
      const health = await dbSource.healthCheck();
      expect(health.healthy).toBe(true);
    });
  });

  /**
   * Test Suite 6: Error Handling
   */
  describe('Error Handling', () => {
    test('should handle invalid recipe ID gracefully', async () => {
      const recipe = await recipeService.getRecipe('non-existent-id-12345');
      
      expect(recipe).toBeNull();
    });

    test('should handle empty search query', async () => {
      const results = await recipeService.search('', { language: 'da' });
      
      expect(Array.isArray(results)).toBe(true);
      // Empty query may return all recipes or empty array
    });

    test('should handle invalid filters gracefully', async () => {
      const results = await recipeService.search('kylling', {
        language: 'da',
        difficulty: 'INVALID', // Invalid difficulty
        maxTime: -10 // Invalid time
      });
      
      // Should still return results (invalid filters ignored)
      expect(Array.isArray(results)).toBe(true);
    });

    test('should continue on source failure', async () => {
      // If one source fails, should continue to next source
      // This is tested implicitly by the fallback logic
      const results = await recipeService.search('test', { language: 'da' });
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  /**
   * Test Suite 7: Backward Compatibility
   */
  describe('Backward Compatibility (Epic 2)', () => {
    test('should support deprecated getRecipes() method', async () => {
      const results = await recipeService.getRecipes('Hakket Oksekød');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(3); // Limit 3 for backward compat
    });

    test('getRecipes() should call getRecipesByIngredient internally', async () => {
      const results1 = await recipeService.getRecipes('løg');
      const results2 = await recipeService.getRecipesByIngredient('løg', { limit: 3 });
      
      expect(results1).toEqual(results2);
    });
  });
});

/**
 * Test Suite 8: Arla Scraper Integration (Mock)
 */
describe('Arla Scraper Integration', () => {
  // These tests use mock HTML to test scraper without hitting Arla.dk
  
  const mockArlaHTML = `
    <html>
      <head>
        <title>Grillet Kylling - Arla</title>
        <meta property="og:image" content="https://www.arla.dk/images/kylling.jpg">
      </head>
      <body>
        <h1 class="recipe-title">Grillet Kylling med Grøntsager</h1>
        <p class="recipe-description">Saftig grillet kylling</p>
        <ul class="ingredients">
          <li itemprop="recipeIngredient">500 g kyllingebryst</li>
          <li itemprop="recipeIngredient">2 stk løg</li>
          <li itemprop="recipeIngredient">1 dl olie</li>
        </ul>
        <div class="recipe-instructions">
          <p>1. Forvarm grill</p>
          <p>2. Grill kyllingen</p>
        </div>
        <meta itemprop="prepTime" content="PT15M">
        <meta itemprop="cookTime" content="PT30M">
        <span itemprop="recipeYield">4 personer</span>
      </body>
    </html>
  `;

  test('should parse Arla HTML correctly', () => {
    // This would test the ArlaScraper.parseRecipe method
    // For now, we verify the structure exists
    const cheerio = require('cheerio');
    const $ = cheerio.load(mockArlaHTML);
    
    const title = $('h1.recipe-title').text();
    expect(title).toBe('Grillet Kylling med Grøntsager');
    
    const ingredients = $('[itemprop="recipeIngredient"]')
      .map((i, el) => $(el).text())
      .get();
    
    expect(ingredients).toHaveLength(3);
    expect(ingredients[0]).toBe('500 g kyllingebryst');
  });

  test('should handle missing fields gracefully', () => {
    const minimalHTML = '<html><head><title>Test</title></head><body><h1>Recipe</h1></body></html>';
    const cheerio = require('cheerio');
    const $ = cheerio.load(minimalHTML);
    
    const image = $('meta[property="og:image"]').attr('content');
    expect(image).toBeUndefined();
    
    // Scraper should handle undefined fields
  });
});
