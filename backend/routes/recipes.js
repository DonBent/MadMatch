// Epic 3.5 Slice 4: Recipe API Endpoints
// Correlation ID: ZHC-MadMatch-20260301-004
// RESTful API for recipe access using RecipeServiceNew

const express = require('express');

/**
 * Request validation helper
 */
function validateSearchParams(req) {
  const errors = [];
  
  // Allow wildcard '*' or empty query for "browse all" functionality
  // Don't validate query emptiness - let sanitizeQuery handle it
  
  if (req.query.limit && (isNaN(req.query.limit) || parseInt(req.query.limit) < 1 || parseInt(req.query.limit) > 50)) {
    errors.push("Query parameter 'limit' must be a number between 1 and 50");
  }
  
  if (req.query.offset && (isNaN(req.query.offset) || parseInt(req.query.offset) < 0)) {
    errors.push("Query parameter 'offset' must be a non-negative number");
  }
  
  if (req.query.difficulty && !['easy', 'medium', 'hard'].includes(req.query.difficulty)) {
    errors.push("Query parameter 'difficulty' must be one of: easy, medium, hard");
  }
  
  if (req.query.max_time && (isNaN(req.query.max_time) || parseInt(req.query.max_time) < 1)) {
    errors.push("Query parameter 'max_time' must be a positive number");
  }
  
  return errors;
}

function validateIngredientParams(req) {
  const errors = [];
  
  if (!req.query.ingredient || req.query.ingredient.trim() === '') {
    errors.push("Query parameter 'ingredient' is required and cannot be empty");
  }
  
  if (req.query.limit && (isNaN(req.query.limit) || parseInt(req.query.limit) < 1 || parseInt(req.query.limit) > 50)) {
    errors.push("Query parameter 'limit' must be a number between 1 and 50");
  }
  
  if (req.query.offset && (isNaN(req.query.offset) || parseInt(req.query.offset) < 0)) {
    errors.push("Query parameter 'offset' must be a non-negative number");
  }
  
  return errors;
}

/**
 * Sanitize search query
 * Treats wildcard '*' or empty/whitespace as "browse all" (empty string)
 */
function sanitizeQuery(query) {
  if (!query || query.trim() === '' || query.trim() === '*') {
    return ''; // Empty string = browse all recipes
  }
  
  // Remove potentially harmful characters but keep Danish characters
  return query
    .trim()
    .replace(/[<>{}]/g, '') // Remove angle brackets and curly braces
    .substring(0, 200); // Limit length
}

/**
 * Format consistent JSON response
 */
function formatRecipeResponse(recipes, total, limit, offset) {
  return {
    recipes: recipes.map(recipe => ({
      id: recipe.id,
      source: {
        id: recipe.sourceId || recipe.source?.id,
        name: recipe.source || recipe.sourceName || 'Unknown'
      },
      title: recipe.title,
      slug: recipe.slug,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      totalTimeMinutes: recipe.totalTimeMinutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      language: recipe.language,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions,
      sourceUrl: recipe.sourceUrl || recipe.url,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt
    })),
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  };
}

/**
 * Generate correlation ID for logging
 */
function getCorrelationId(req) {
  return req.headers['x-correlation-id'] || 
         `ZHC-MadMatch-Epic3.5-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Initialize recipe routes
 * 
 * @param {RecipeService} recipeService - RecipeServiceNew instance
 * @returns {express.Router}
 */
function initializeRecipeRoutes(recipeService) {
  // Create a new router for each invocation to avoid route conflicts
  const router = express.Router();
  
  /**
   * GET /api/recipes/search
   * Search recipes by query string with optional filters
   * 
   * AC-4.1: Recipe search endpoint functional and documented
   */
  router.get('/search', async (req, res) => {
    const correlationId = getCorrelationId(req);
    
    try {
      // Validate request
      const validationErrors = validateSearchParams(req);
      if (validationErrors.length > 0) {
        console.error(`[${correlationId}] Validation failed:`, validationErrors);
        return res.status(400).json({
          error: 'Invalid query parameters',
          message: validationErrors.join('; '),
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      // Extract and sanitize parameters
      const query = sanitizeQuery(req.query.q);
      const filters = {
        language: req.query.language || 'da',
        difficulty: req.query.difficulty,
        maxTime: req.query.max_time ? parseInt(req.query.max_time) : undefined,
        sourceId: req.query.source,
        limit: req.query.limit ? parseInt(req.query.limit) : 10,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
      
      console.log(`[${correlationId}] Searching recipes: q="${query}", filters=`, filters);
      
      // Search recipes
      const recipes = await recipeService.search(query, filters);
      
      // Note: Since RecipeService applies pagination internally and doesn't return total count,
      // we estimate hasMore by checking if we got the full limit (indicating more may exist)
      const hasMore = recipes.length === filters.limit;
      
      console.log(`[${correlationId}] Found ${recipes.length} recipes`);
      
      // Format response
      const response = formatRecipeResponse(
        recipes,
        recipes.length,
        filters.limit,
        filters.offset
      );
      
      // Override hasMore with our estimate
      response.hasMore = hasMore;
      
      res.json(response);
      
    } catch (error) {
      console.error(`[${correlationId}] Error searching recipes:`, error);
      
      // Check if it's a database connection error
      if (error.message && error.message.includes('database')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Unable to connect to database. Please try again later.',
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while searching recipes',
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/recipes/by-ingredient
   * Find recipes containing a specific ingredient
   * 
   * AC-4.3: By-ingredient endpoint functional
   * NOTE: Must be defined before /:id route to avoid path conflicts
   */
  router.get('/by-ingredient', async (req, res) => {
    const correlationId = getCorrelationId(req);
    
    try {
      // Validate request
      const validationErrors = validateIngredientParams(req);
      if (validationErrors.length > 0) {
        console.error(`[${correlationId}] Validation failed:`, validationErrors);
        return res.status(400).json({
          error: 'Invalid query parameters',
          message: validationErrors.join('; '),
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      // Extract and sanitize parameters
      const ingredient = sanitizeQuery(req.query.ingredient);
      const filters = {
        language: req.query.language || 'da',
        limit: req.query.limit ? parseInt(req.query.limit) : 10,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };
      
      console.log(`[${correlationId}] Searching by ingredient: "${ingredient}", filters=`, filters);
      
      // Search recipes by ingredient
      const recipes = await recipeService.getRecipesByIngredient(ingredient, filters);
      
      // Note: Since RecipeService applies pagination internally and doesn't return total count,
      // we estimate hasMore by checking if we got the full limit (indicating more may exist)
      const hasMore = recipes.length === filters.limit;
      
      console.log(`[${correlationId}] Found ${recipes.length} recipes with ingredient "${ingredient}"`);
      
      // Format response with matched ingredients highlighted
      const response = {
        ingredient,
        recipes: recipes.map(recipe => ({
          id: recipe.id,
          source: {
            id: recipe.sourceId || recipe.source?.id,
            name: recipe.source || recipe.sourceName || 'Unknown'
          },
          title: recipe.title,
          slug: recipe.slug,
          imageUrl: recipe.imageUrl,
          totalTimeMinutes: recipe.totalTimeMinutes,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          language: recipe.language,
          matchedIngredients: recipe.ingredients?.filter(ing => 
            ing.name.toLowerCase().includes(ingredient.toLowerCase())
          ) || []
        })),
        total: recipes.length,
        limit: filters.limit,
        offset: filters.offset,
        hasMore
      };
      
      res.json(response);
      
    } catch (error) {
      console.error(`[${correlationId}] Error searching by ingredient:`, error);
      
      if (error.message && error.message.includes('database')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Unable to connect to database. Please try again later.',
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while searching recipes',
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/recipes/batch
   * Get multiple recipes by their IDs
   * 
   * Body: { "ids": ["id1", "id2", ...] }
   * Returns: { "recipes": [...] }
   * 
   * For RecipeFavorites copyright compliance - fetch only favorited recipes
   * NOTE: Must be defined before /:id route to avoid path conflicts
   */
  router.post('/batch', express.json(), async (req, res) => {
    const correlationId = getCorrelationId(req);
    
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Body must contain an "ids" array',
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      if (ids.length === 0) {
        return res.json({ recipes: [] });
      }
      
      if (ids.length > 100) {
        return res.status(400).json({
          error: 'Too many IDs',
          message: 'Maximum 100 recipe IDs allowed per batch request',
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`[${correlationId}] Fetching ${ids.length} recipes by IDs`);
      
      // Fetch recipes by IDs
      const recipes = await recipeService.getRecipesByIds(ids);
      
      console.log(`[${correlationId}] Found ${recipes.length}/${ids.length} recipes`);
      
      // Format response
      res.json({
        recipes: recipes.map(recipe => ({
          id: recipe.id,
          source: {
            id: recipe.sourceId || recipe.source?.id,
            name: recipe.source || recipe.sourceName || 'Unknown'
          },
          title: recipe.title,
          slug: recipe.slug,
          description: recipe.description,
          imageUrl: recipe.imageUrl,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          totalTimeMinutes: recipe.totalTimeMinutes,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          language: recipe.language,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions,
          sourceUrl: recipe.sourceUrl || recipe.url,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt
        }))
      });
      
    } catch (error) {
      console.error(`[${correlationId}] Error fetching batch recipes:`, error);
      
      if (error.message && error.message.includes('database')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Unable to connect to database. Please try again later.',
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching recipes',
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/recipes/sources
   * Get all recipe sources with health status
   * 
   * AC-4.4: Recipe sources endpoint functional
   * NOTE: Must be defined before /:id route to avoid path conflicts
   */
  router.get('/sources', async (req, res) => {
    const correlationId = getCorrelationId(req);
    
    try {
      console.log(`[${correlationId}] Fetching recipe sources`);
      
      // Get sources with health info
      const sources = await recipeService.getSources();
      
      console.log(`[${correlationId}] Found ${sources.length} recipe sources`);
      
      res.json({
        sources: sources.map(source => ({
          id: source.id,
          name: source.name,
          priority: source.priority,
          enabled: source.enabled,
          healthy: source.healthy,
          message: source.message
        })),
        total: sources.length
      });
      
    } catch (error) {
      console.error(`[${correlationId}] Error fetching sources:`, error);
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching recipe sources',
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/recipes/:id
   * Get a single recipe by ID
   * 
   * AC-4.2: Recipe by ID endpoint functional
   * NOTE: Must be defined AFTER specific routes (by-ingredient, sources) to avoid conflicts
   */
  router.get('/:id', async (req, res) => {
    const correlationId = getCorrelationId(req);
    
    try {
      const recipeId = req.params.id;
      
      console.log(`[${correlationId}] Fetching recipe: id=${recipeId}`);
      
      // Get recipe
      const recipe = await recipeService.getRecipe(recipeId);
      
      if (!recipe) {
        console.log(`[${correlationId}] Recipe not found: ${recipeId}`);
        return res.status(404).json({
          error: 'Recipe not found',
          message: `Recipe with ID '${recipeId}' does not exist. Try searching for recipes instead.`,
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`[${correlationId}] Recipe found: ${recipe.title}`);
      
      // Format single recipe response
      res.json({
        id: recipe.id,
        source: {
          id: recipe.sourceId || recipe.source?.id,
          name: recipe.source || recipe.sourceName || 'Unknown'
        },
        title: recipe.title,
        slug: recipe.slug,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        totalTimeMinutes: recipe.totalTimeMinutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        language: recipe.language,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions,
        sourceUrl: recipe.sourceUrl || recipe.url,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt
      });
      
    } catch (error) {
      console.error(`[${correlationId}] Error fetching recipe:`, error);
      
      if (error.message && error.message.includes('database')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Unable to connect to database. Please try again later.',
          correlationId,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching recipe',
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

module.exports = { initializeRecipeRoutes };
