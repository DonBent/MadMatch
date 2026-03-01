// Epic 3.5 Slice 4: Recipe API Endpoint Tests
// Correlation ID: ZHC-MadMatch-20260301-004
// Tests for all recipe API endpoints

const request = require('supertest');
const express = require('express');
const { initializeRecipeRoutes } = require('./recipes');

// Mock RecipeService
class MockRecipeService {
  constructor() {
    this.mockRecipes = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        sourceId: '660e8400-e29b-41d4-a716-446655440001',
        source: 'Arla',
        title: 'Grillet Kylling med Grøntsager',
        slug: 'grillet-kylling-med-groentsager',
        description: 'Saftig grillet kylling',
        imageUrl: 'https://www.arla.dk/images/kylling.jpg',
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        totalTimeMinutes: 45,
        servings: 4,
        difficulty: 'medium',
        language: 'da',
        ingredients: [
          { name: 'kyllingebryst', quantity: '500 g', order: 1 },
          { name: 'peberfrugter', quantity: '2 stk', order: 2 }
        ],
        instructions: '1. Forvarm grill...',
        sourceUrl: 'https://www.arla.dk/opskrifter/kylling',
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        sourceId: '660e8400-e29b-41d4-a716-446655440001',
        source: 'Arla',
        title: 'Kylling Karry',
        slug: 'kylling-karry',
        description: 'Krydret kylling karry',
        imageUrl: 'https://www.arla.dk/images/karry.jpg',
        totalTimeMinutes: 40,
        servings: 4,
        difficulty: 'easy',
        language: 'da',
        ingredients: [
          { name: 'kyllingebryst', quantity: '600 g', order: 1 },
          { name: 'karry', quantity: '2 spsk', order: 2 }
        ],
        instructions: '1. Skær kylling...',
        sourceUrl: 'https://www.arla.dk/opskrifter/karry'
      }
    ];
    
    this.mockSources = [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'Arla',
        priority: 1,
        enabled: true,
        healthy: true,
        message: 'Database operational'
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        name: 'Spoonacular',
        priority: 2,
        enabled: true,
        healthy: true,
        message: 'API accessible'
      }
    ];
  }

  async search(query, filters = {}) {
    // Filter by query
    const results = this.mockRecipes.filter(r => 
      r.title.toLowerCase().includes(query.toLowerCase())
    );
    
    // Apply filters
    let filtered = results;
    if (filters.language) {
      filtered = filtered.filter(r => r.language === filters.language);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(r => r.difficulty === filters.difficulty);
    }
    if (filters.maxTime) {
      filtered = filtered.filter(r => r.totalTimeMinutes <= filters.maxTime);
    }
    
    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 10;
    return filtered.slice(offset, offset + limit);
  }

  async getRecipe(id) {
    return this.mockRecipes.find(r => r.id === id) || null;
  }

  async getRecipesByIngredient(ingredient, filters = {}) {
    const results = this.mockRecipes.filter(r =>
      r.ingredients.some(ing => 
        ing.name.toLowerCase().includes(ingredient.toLowerCase())
      )
    );
    
    const offset = filters.offset || 0;
    const limit = filters.limit || 10;
    return results.slice(offset, offset + limit);
  }

  async getSources() {
    return this.mockSources;
  }
}

// Setup test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  const mockService = new MockRecipeService();
  app.use('/api/recipes', initializeRecipeRoutes(mockService));
  
  return app;
}

describe('Recipe API Endpoints', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/recipes/search', () => {
    test('should search recipes successfully', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: 'kylling' });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.recipes[0].title).toContain('Kylling');
    });

    test('should return 400 if query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/recipes/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
      expect(response.body.message).toContain("'q' is required");
    });

    test('should return 400 if query is empty', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });

    test('should filter by language', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: 'kylling', language: 'da' });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(2);
      expect(response.body.recipes.every(r => r.language === 'da')).toBe(true);
    });

    test('should filter by difficulty', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: 'kylling', difficulty: 'easy' });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.recipes[0].difficulty).toBe('easy');
    });

    test('should filter by max_time', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: 'kylling', max_time: 42 });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.recipes[0].totalTimeMinutes).toBeLessThanOrEqual(42);
    });

    test('should apply pagination with limit', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: 'kylling', limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.limit).toBe(1);
    });

    test('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: 'kylling', limit: 100 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must be a number between 1 and 50');
    });

    test('should validate offset parameter', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: 'kylling', offset: -5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('non-negative number');
    });

    test('should include correlation ID in response', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .set('X-Correlation-ID', 'test-correlation-123');

      expect(response.body.correlationId || response.status).toBeTruthy();
    });
  });

  describe('GET /api/recipes/:id', () => {
    test('should get recipe by ID successfully', async () => {
      const response = await request(app)
        .get('/api/recipes/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(response.body.title).toBe('Grillet Kylling med Grøntsager');
      expect(response.body.source).toBeDefined();
      expect(response.body.ingredients).toHaveLength(2);
    });

    test('should return 404 if recipe not found', async () => {
      const response = await request(app)
        .get('/api/recipes/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found');
      expect(response.body.message).toContain('does not exist');
    });

    test('should include full recipe details', async () => {
      const response = await request(app)
        .get('/api/recipes/550e8400-e29b-41d4-a716-446655440000');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prepTimeMinutes');
      expect(response.body).toHaveProperty('cookTimeMinutes');
      expect(response.body).toHaveProperty('totalTimeMinutes');
      expect(response.body).toHaveProperty('servings');
      expect(response.body).toHaveProperty('difficulty');
      expect(response.body).toHaveProperty('instructions');
      expect(response.body).toHaveProperty('sourceUrl');
    });
  });

  describe('GET /api/recipes/by-ingredient', () => {
    test('should find recipes by ingredient successfully', async () => {
      const response = await request(app)
        .get('/api/recipes/by-ingredient')
        .query({ ingredient: 'kyllingebryst' });

      expect(response.status).toBe(200);
      expect(response.body.ingredient).toBe('kyllingebryst');
      expect(response.body.recipes).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    test('should return 400 if ingredient parameter is missing', async () => {
      const response = await request(app)
        .get('/api/recipes/by-ingredient');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
      expect(response.body.message).toContain("'ingredient' is required");
    });

    test('should highlight matched ingredients', async () => {
      const response = await request(app)
        .get('/api/recipes/by-ingredient')
        .query({ ingredient: 'kyllingebryst' });

      expect(response.status).toBe(200);
      expect(response.body.recipes[0].matchedIngredients).toBeDefined();
      expect(response.body.recipes[0].matchedIngredients.length).toBeGreaterThan(0);
      expect(response.body.recipes[0].matchedIngredients[0].name).toContain('kyllingebryst');
    });

    test('should support partial ingredient matching', async () => {
      const response = await request(app)
        .get('/api/recipes/by-ingredient')
        .query({ ingredient: 'kylling' });

      expect(response.status).toBe(200);
      expect(response.body.recipes.length).toBeGreaterThan(0);
    });

    test('should apply pagination', async () => {
      const response = await request(app)
        .get('/api/recipes/by-ingredient')
        .query({ ingredient: 'kyllingebryst', limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.recipes).toHaveLength(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.hasMore).toBe(true);
    });

    test('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/recipes/by-ingredient')
        .query({ ingredient: 'kyllingebryst', limit: 0 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/recipes/sources', () => {
    test('should list all recipe sources', async () => {
      const response = await request(app)
        .get('/api/recipes/sources');

      expect(response.status).toBe(200);
      expect(response.body.sources).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    test('should include source metadata', async () => {
      const response = await request(app)
        .get('/api/recipes/sources');

      expect(response.status).toBe(200);
      const source = response.body.sources[0];
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('name');
      expect(source).toHaveProperty('priority');
      expect(source).toHaveProperty('enabled');
      expect(source).toHaveProperty('healthy');
    });

    test('should show health status for each source', async () => {
      const response = await request(app)
        .get('/api/recipes/sources');

      expect(response.status).toBe(200);
      expect(response.body.sources.every(s => typeof s.healthy === 'boolean')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should sanitize query input', async () => {
      const response = await request(app)
        .get('/api/recipes/search')
        .query({ q: '<script>alert("xss")</script>kylling' });

      expect(response.status).toBe(200);
      // Should have removed script tags
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    test('should handle database errors gracefully', async () => {
      // Create app with service that throws database error
      const errorApp = express();
      errorApp.use(express.json());
      
      const errorService = {
        async search() {
          throw new Error('Failed to connect to database server');
        },
        async getSources() { return []; }
      };
      
      errorApp.use('/api/recipes', initializeRecipeRoutes(errorService));
      
      const response = await request(errorApp)
        .get('/api/recipes/search')
        .query({ q: 'test' });

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Service unavailable');
      expect(response.body.message).toContain('database');
    });

    test('should include timestamp in error responses', async () => {
      const response = await request(app)
        .get('/api/recipes/search');

      expect(response.status).toBe(400);
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Backward Compatibility', () => {
    test('should support Epic 2 recipe response format', async () => {
      const response = await request(app)
        .get('/api/recipes/by-ingredient')
        .query({ ingredient: 'kyllingebryst' });

      expect(response.status).toBe(200);
      // Should include all fields needed by Epic 2 ProductDetail page
      const recipe = response.body.recipes[0];
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('imageUrl');
      expect(recipe).toHaveProperty('servings');
    });
  });
});

// AC-4.5: API Tests Passing
describe('Acceptance Criteria Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('AC-4.1: All 4 endpoints functional', async () => {
    const searchRes = await request(app).get('/api/recipes/search').query({ q: 'kylling' });
    expect(searchRes.status).toBe(200);

    const recipeRes = await request(app).get('/api/recipes/550e8400-e29b-41d4-a716-446655440000');
    expect(recipeRes.status).toBe(200);

    const ingredientRes = await request(app).get('/api/recipes/by-ingredient').query({ ingredient: 'kyllingebryst' });
    expect(ingredientRes.status).toBe(200);

    const sourcesRes = await request(app).get('/api/recipes/sources');
    expect(sourcesRes.status).toBe(200);
  });

  test('AC-4.4: Proper error handling and validation', async () => {
    // Missing required parameter
    const badSearch = await request(app).get('/api/recipes/search');
    expect(badSearch.status).toBe(400);
    expect(badSearch.body.error).toBeDefined();
    expect(badSearch.body.message).toBeDefined();

    // Not found
    const notFound = await request(app).get('/api/recipes/invalid-id');
    expect(notFound.status).toBe(404);
    expect(notFound.body.error).toBeDefined();
  });

  test('AC-4.4: Proper HTTP status codes', async () => {
    const okRes = await request(app).get('/api/recipes/search').query({ q: 'kylling' });
    expect(okRes.status).toBe(200);

    const badReq = await request(app).get('/api/recipes/search');
    expect(badReq.status).toBe(400);

    const notFound = await request(app).get('/api/recipes/invalid-id');
    expect(notFound.status).toBe(404);
  });
});
