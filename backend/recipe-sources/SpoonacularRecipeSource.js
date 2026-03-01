// Epic 3.5 Slice 2: Spoonacular Recipe Source Adapter
// Correlation ID: ZHC-MadMatch-20260301-004
// Wraps existing Spoonacular API and converts to standardized format

const { IRecipeSource } = require('../interfaces/IRecipeSource');

/**
 * SpoonacularRecipeSource - Adapter for Spoonacular API
 * 
 * Wraps existing Spoonacular integration from Epic 2 and converts
 * responses to the standardized recipe format.
 * 
 * Maintains backward compatibility while fitting into the new
 * multi-source architecture.
 * 
 * AC-2.3: SpoonacularRecipeSource wraps Epic 2 API
 */
class SpoonacularRecipeSource extends IRecipeSource {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.SPOONACULAR_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.spoonacular.com';
    this.sourceId = options.sourceId || 'spoonacular';
    this.sourceName = options.sourceName || 'Spoonacular';
    this.priority = options.priority || 2; // Lower priority than database
    this.enabled = options.enabled !== false;
    this.cacheTTL = options.cacheTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.cache = new Map();
  }

  /**
   * Extract ingredient from product name
   * Removes common suffixes and cleans the string for API search
   * @private
   */
  _extractIngredient(productName) {
    let ingredient = productName
      .toLowerCase()
      .replace(/\d+-\d+%/g, '') // Remove percentage ranges
      .replace(/\d+,\d+%/g, '') // Remove decimal percentages
      .replace(/\d+%/g, '') // Remove single percentages
      .replace(/økologisk/gi, '')
      .replace(/dansk/gi, '')
      .trim();
    
    ingredient = ingredient.split(/[,;-]/)[0].trim();
    return ingredient;
  }

  /**
   * Calculate difficulty from cooking time
   * @private
   */
  _calculateDifficulty(readyInMinutes) {
    if (!readyInMinutes) return 'MEDIUM';
    if (readyInMinutes < 30) return 'EASY';
    if (readyInMinutes < 60) return 'MEDIUM';
    return 'HARD';
  }

  /**
   * Convert Spoonacular recipe to standardized format
   * @private
   */
  _toStandardFormat(spoonacularRecipe, detailed = false) {
    const recipe = {
      id: `spoonacular-${spoonacularRecipe.id}`,
      title: spoonacularRecipe.title,
      description: spoonacularRecipe.summary || undefined,
      imageUrl: spoonacularRecipe.image || undefined,
      cookTimeMinutes: spoonacularRecipe.readyInMinutes || undefined,
      servings: spoonacularRecipe.servings || undefined,
      difficulty: this._calculateDifficulty(spoonacularRecipe.readyInMinutes),
      language: 'en', // Spoonacular is English-only
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      ingredients: [],
      instructions: [],
      tags: spoonacularRecipe.dishTypes || [],
      url: `https://spoonacular.com/recipes/${spoonacularRecipe.title?.toLowerCase().replace(/\s+/g, '-')}-${spoonacularRecipe.id}`,
    };

    // Parse ingredients if available (detailed response)
    if (detailed && spoonacularRecipe.extendedIngredients) {
      recipe.ingredients = spoonacularRecipe.extendedIngredients.map((ing, idx) => ({
        name: ing.name || ing.original,
        quantity: ing.amount ? `${ing.amount} ${ing.unit}` : undefined,
        order: idx + 1,
      }));
    } else if (spoonacularRecipe.usedIngredients || spoonacularRecipe.missedIngredients) {
      // Parse ingredients from search response (findByIngredients)
      const allIngredients = [
        ...(spoonacularRecipe.usedIngredients || []),
        ...(spoonacularRecipe.missedIngredients || []),
      ];
      recipe.ingredients = allIngredients.map((ing, idx) => ({
        name: ing.name || ing.original,
        quantity: ing.amount ? `${ing.amount} ${ing.unit}` : undefined,
        order: idx + 1,
      }));
    }

    // Parse instructions if available (detailed response)
    if (detailed && spoonacularRecipe.analyzedInstructions?.[0]?.steps) {
      recipe.instructions = spoonacularRecipe.analyzedInstructions[0].steps.map(
        step => step.step
      );
    } else if (spoonacularRecipe.instructions) {
      // Fallback to raw instructions string
      recipe.instructions = [spoonacularRecipe.instructions];
    }

    // Nutrition data (optional)
    if (spoonacularRecipe.nutrition) {
      recipe.nutritionData = spoonacularRecipe.nutrition;
    }

    return recipe;
  }

  /**
   * Check cache for recipe
   * @private
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store in cache
   * @private
   */
  _storeInCache(key, data) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Make API request to Spoonacular
   * @private
   */
  async _makeRequest(endpoint, params = {}) {
    if (!this.apiKey) {
      throw new Error('Spoonacular API key not configured');
    }

    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.append('apiKey', this.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'MadMatch/1.4.0 (contact@madmatch.dk)',
        },
      });

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('API quota exceeded');
        }
        if (response.status === 401) {
          throw new Error('Invalid API key');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[SpoonacularRecipeSource] API request failed:', error.message);
      throw error;
    }
  }

  /**
   * Get a single recipe by ID
   * 
   * @param {string} id - Recipe ID (with or without 'spoonacular-' prefix)
   * @returns {Promise<Recipe|null>}
   */
  async getRecipe(id) {
    // Remove 'spoonacular-' prefix if present
    const recipeId = id.replace(/^spoonacular-/, '');

    // Check cache
    const cacheKey = `recipe-${recipeId}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await this._makeRequest(`/recipes/${recipeId}/information`, {
        includeNutrition: 'false',
      });

      const recipe = this._toStandardFormat(data, true);
      this._storeInCache(cacheKey, recipe);
      return recipe;
    } catch (error) {
      console.error('[SpoonacularRecipeSource] Failed to fetch recipe:', error.message);
      return null;
    }
  }

  /**
   * Search recipes by query string
   * 
   * @param {string} query - Search query
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async search(query, filters = {}) {
    const limit = Math.min(filters.limit || 10, 50);
    const offset = filters.offset || 0;

    // Check cache
    const cacheKey = `search-${query}-${JSON.stringify(filters)}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = {
        query,
        number: limit,
        offset,
      };

      if (filters.maxTime) {
        params.maxReadyTime = filters.maxTime;
      }

      const data = await this._makeRequest('/recipes/complexSearch', params);
      const recipes = (data.results || []).map(r => this._toStandardFormat(r, false));
      
      this._storeInCache(cacheKey, recipes);
      return recipes;
    } catch (error) {
      console.error('[SpoonacularRecipeSource] Search failed:', error.message);
      return []; // Return empty array on error (graceful degradation)
    }
  }

  /**
   * Get recipes containing a specific ingredient
   * 
   * @param {string} ingredient - Ingredient name
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async getRecipesByIngredient(ingredient, filters = {}) {
    const limit = Math.min(filters.limit || 10, 50);
    
    // Extract clean ingredient name
    const cleanIngredient = this._extractIngredient(ingredient);

    // Check cache
    const cacheKey = `ingredient-${cleanIngredient}-${JSON.stringify(filters)}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = {
        ingredients: cleanIngredient,
        number: limit,
        ranking: 2, // Maximize used ingredients
        ignorePantry: true,
      };

      const data = await this._makeRequest('/recipes/findByIngredients', params);
      const recipes = data.map(r => this._toStandardFormat(r, false));
      
      this._storeInCache(cacheKey, recipes);
      return recipes;
    } catch (error) {
      console.error('[SpoonacularRecipeSource] Ingredient search failed:', error.message);
      return []; // Return empty array on error
    }
  }

  /**
   * Get metadata about this source
   * 
   * @returns {RecipeSourceMetadata}
   */
  getSourceInfo() {
    return {
      id: this.sourceId,
      name: this.sourceName,
      priority: this.priority,
      enabled: this.enabled && !!this.apiKey,
    };
  }

  /**
   * Health check - verify API is accessible
   * 
   * @returns {Promise<{healthy: boolean, message: string}>}
   */
  async healthCheck() {
    if (!this.apiKey) {
      return {
        healthy: false,
        message: 'Spoonacular API key not configured',
      };
    }

    try {
      // Make a lightweight API call to check connectivity
      await this._makeRequest('/recipes/random', { number: 1 });
      return {
        healthy: true,
        message: 'Spoonacular API is accessible',
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Spoonacular API unavailable: ${error.message}`,
      };
    }
  }

  /**
   * Clear cache (for testing/maintenance)
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { SpoonacularRecipeSource };
