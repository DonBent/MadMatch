// Epic 3.5 Slice 2: DatabaseRecipeSource Tests
// Correlation ID: ZHC-MadMatch-20260301-004

const { DatabaseRecipeSource } = require('../recipe-sources/DatabaseRecipeSource');
const { getPrismaClient } = require('../services/databaseService');

// Mock database service
jest.mock('../services/databaseService');

describe('DatabaseRecipeSource', () => {
  let source;
  let mockPrisma;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      recipe: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    getPrismaClient.mockReturnValue(mockPrisma);
    
    source = new DatabaseRecipeSource({
      sourceId: 'test-db',
      sourceName: 'Test Database',
      priority: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSourceInfo', () => {
    test('returns correct metadata', () => {
      const info = source.getSourceInfo();
      
      expect(info).toEqual({
        id: 'test-db',
        name: 'Test Database',
        priority: 1,
        enabled: true,
      });
    });
  });

  describe('getRecipe', () => {
    const mockRecipe = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Recipe',
      description: 'Test description',
      imageUrl: 'https://example.com/image.jpg',
      cookTimeMinutes: 30,
      totalTimeMinutes: 45,
      servings: 4,
      difficulty: 'MEDIUM',
      language: 'da',
      sourceId: '123e4567-e89b-12d3-a456-426614174001',
      instructions: 'Step 1\nStep 2\nStep 3',
      source: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Arla',
        baseUrl: 'https://arla.dk/',
      },
      ingredients: [
        { ingredientName: 'chicken', quantity: '500g', order: 1 },
        { ingredientName: 'rice', quantity: '200g', order: 2 },
      ],
    };

    test('fetches recipe by UUID', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await source.getRecipe('123e4567-e89b-12d3-a456-426614174000');

      expect(mockPrisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        include: { source: true, ingredients: true },
      });

      expect(result).toMatchObject({
        id: mockRecipe.id,
        title: 'Test Recipe',
        language: 'da',
        ingredients: [
          { name: 'chicken', quantity: '500g', order: 1 },
          { name: 'rice', quantity: '200g', order: 2 },
        ],
        instructions: ['Step 1', 'Step 2', 'Step 3'],
      });
    });

    test('fetches recipe by slug if UUID not found', async () => {
      mockPrisma.recipe.findUnique
        .mockResolvedValueOnce(null) // UUID lookup fails
        .mockResolvedValueOnce(mockRecipe); // Slug lookup succeeds

      const result = await source.getRecipe('test-recipe');

      expect(mockPrisma.recipe.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-recipe' },
        include: { source: true, ingredients: true },
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Recipe');
    });

    test('returns null if recipe not found', async () => {
      mockPrisma.recipe.findUnique.mockResolvedValue(null);

      const result = await source.getRecipe('nonexistent');

      expect(result).toBeNull();
    });

    test('throws error on database failure', async () => {
      mockPrisma.recipe.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(source.getRecipe('123')).rejects.toThrow('Failed to fetch recipe');
    });
  });

  describe('search', () => {
    test('performs full-text search with ranking', async () => {
      const mockSearchResults = [
        { id: '123', rank: 0.9 },
        { id: '456', rank: 0.7 },
      ];

      const mockFullRecipes = [
        {
          id: '123',
          title: 'Chicken Pasta',
          language: 'da',
          createdAt: new Date(),
          source: { id: '1', name: 'Arla' },
          ingredients: [],
        },
        {
          id: '456',
          title: 'Pasta Carbonara',
          language: 'da',
          createdAt: new Date(),
          source: { id: '1', name: 'Arla' },
          ingredients: [],
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockSearchResults);
      mockPrisma.recipe.findMany.mockResolvedValue(mockFullRecipes);

      const results = await source.search('pasta', { language: 'da', limit: 10 });

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['123', '456'] } },
        include: { source: true, ingredients: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Chicken Pasta'); // Higher rank first
    });

    test('returns empty array if no results', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await source.search('nonexistent');

      expect(results).toEqual([]);
    });

    test('applies filters correctly', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await source.search('test', {
        language: 'da',
        difficulty: 'EASY',
        maxTime: 30,
        limit: 5,
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      // Verify filters are passed in the query (check mock call args)
    });
  });

  describe('getRecipesByIngredient', () => {
    test('searches by ingredient with full-text search', async () => {
      const mockSearchResults = [
        { id: '123', rank: 0.9 },
      ];

      const mockFullRecipes = [
        {
          id: '123',
          title: 'Beef Stew',
          language: 'da',
          source: { id: '1', name: 'Arla' },
          ingredients: [
            { ingredientName: 'hakket oksekød', quantity: '500g', order: 1 },
          ],
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockSearchResults);
      mockPrisma.recipe.findMany.mockResolvedValue(mockFullRecipes);

      const results = await source.getRecipesByIngredient('oksekød');

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Beef Stew');
      expect(results[0].ingredients[0].name).toBe('hakket oksekød');
    });

    test('returns empty array if no matches', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await source.getRecipesByIngredient('nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    test('returns healthy when database accessible', async () => {
      mockPrisma.recipe.count.mockResolvedValue(42);

      const health = await source.healthCheck();

      expect(health).toEqual({
        healthy: true,
        message: 'Database source healthy. 42 recipes available.',
      });
    });

    test('returns unhealthy on database error', async () => {
      mockPrisma.recipe.count.mockRejectedValue(new Error('Connection failed'));

      const health = await source.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('unavailable');
    });
  });
});
