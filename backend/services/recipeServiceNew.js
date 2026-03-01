// Epic 3.5 Slice 2: Recipe Service Orchestrator
// Correlation ID: ZHC-MadMatch-20260301-004
// Manages multiple recipe sources with priority-based fallback

const { DatabaseRecipeSource } = require('../recipe-sources/DatabaseRecipeSource');
const { SpoonacularRecipeSource } = require('../recipe-sources/SpoonacularRecipeSource');

/**
 * RecipeService - Multi-source recipe orchestrator
 * 
 * Features:
 * - Manages multiple IRecipeSource implementations
 * - Priority-based fallback (Database first, Spoonacular fallback)
 * - In-memory caching with TTL
 * - Result aggregation and deduplication
 * - Health checks for all sources
 * 
 * AC-2.4: RecipeService orchestrates sources with priority fallback
 */
class RecipeService {
  constructor(options = {}) {
    this.sources = [];
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 10 * 60 * 1000; // 10 minutes default
    this.fallbackStrategy = options.fallbackStrategy || 'priority'; // 'priority' | 'all'
    this.minResultsBeforeFallback = options.minResultsBeforeFallback || 3;
    
    // Initialize default sources if not provided
    if (options.sources) {
      this.sources = options.sources;
    } else {
      this._initializeDefaultSources();
    }

    // Sort sources by priority
    this._sortSourcesByPriority();
  }

  /**
   * Initialize default sources (Database + Spoonacular)
   * @private
   */
  _initializeDefaultSources() {
    // Database source (priority 1)
    this.sources.push(new DatabaseRecipeSource({
      sourceId: 'database',
      sourceName: 'Database',
      priority: 1,
    }));

    // Spoonacular source (priority 2)
    if (process.env.SPOONACULAR_API_KEY) {
      this.sources.push(new SpoonacularRecipeSource({
        sourceId: 'spoonacular',
        sourceName: 'Spoonacular',
        priority: 2,
      }));
    }
  }

  /**
   * Sort sources by priority (ascending - lower = higher priority)
   * @private
   */
  _sortSourcesByPriority() {
    this.sources.sort((a, b) => {
      const aInfo = a.getSourceInfo();
      const bInfo = b.getSourceInfo();
      return aInfo.priority - bInfo.priority;
    });
  }

  /**
   * Generate cache key
   * @private
   */
  _getCacheKey(method, ...args) {
    return `${method}:${JSON.stringify(args)}`;
  }

  /**
   * Get from cache
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

    // Simple cache cleanup: remove expired entries periodically
    if (this.cache.size > 100) {
      this._cleanExpiredCache();
    }
  }

  /**
   * Clean expired cache entries
   * @private
   */
  _cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Deduplicate recipes by title similarity
   * @private
   */
  _deduplicateRecipes(recipes) {
    const seen = new Map();
    const deduplicated = [];

    for (const recipe of recipes) {
      const normalizedTitle = recipe.title.toLowerCase().trim();
      
      if (!seen.has(normalizedTitle)) {
        seen.set(normalizedTitle, true);
        deduplicated.push(recipe);
      }
    }

    return deduplicated;
  }

  /**
   * Get a single recipe by ID
   * Searches all sources until found
   * 
   * @param {string} id - Recipe identifier
   * @returns {Promise<Recipe|null>}
   */
  async getRecipe(id) {
    // Check cache
    const cacheKey = this._getCacheKey('getRecipe', id);
    const cached = this._getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Try each source in priority order
    for (const source of this.sources) {
      const info = source.getSourceInfo();
      
      if (!info.enabled) {
        continue;
      }

      try {
        const recipe = await source.getRecipe(id);
        if (recipe) {
          this._storeInCache(cacheKey, recipe);
          return recipe;
        }
      } catch (error) {
        console.error(`[RecipeService] Error fetching recipe from ${info.name}:`, error.message);
        // Continue to next source
      }
    }

    // Not found in any source
    this._storeInCache(cacheKey, null);
    return null;
  }

  /**
   * Search recipes by query string
   * 
   * Strategy:
   * - Query highest priority source first
   * - If results < minResultsBeforeFallback, query next source
   * - Aggregate and deduplicate results
   * 
   * @param {string} query - Search query
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async search(query, filters = {}) {
    // Check cache
    const cacheKey = this._getCacheKey('search', query, filters);
    const cached = this._getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    let allResults = [];

    for (const source of this.sources) {
      const info = source.getSourceInfo();
      
      if (!info.enabled) {
        continue;
      }

      try {
        console.log(`[RecipeService] Searching ${info.name} for: ${query}`);
        const results = await source.search(query, filters);
        
        if (results && results.length > 0) {
          allResults = allResults.concat(results);
          console.log(`[RecipeService] ${info.name} returned ${results.length} results`);

          // Check if we have enough results
          if (this.fallbackStrategy === 'priority' && allResults.length >= this.minResultsBeforeFallback) {
            console.log(`[RecipeService] Sufficient results (${allResults.length}), stopping fallback`);
            break;
          }
        }
      } catch (error) {
        console.error(`[RecipeService] Error searching ${info.name}:`, error.message);
        // Continue to next source
      }
    }

    // Deduplicate results
    const deduplicated = this._deduplicateRecipes(allResults);
    
    // Apply limit if specified
    const limit = filters.limit || 10;
    const results = deduplicated.slice(0, limit);

    this._storeInCache(cacheKey, results);
    return results;
  }

  /**
   * Get recipes containing a specific ingredient
   * 
   * @param {string} ingredient - Ingredient name
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async getRecipesByIngredient(ingredient, filters = {}) {
    // Check cache
    const cacheKey = this._getCacheKey('getRecipesByIngredient', ingredient, filters);
    const cached = this._getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    let allResults = [];

    for (const source of this.sources) {
      const info = source.getSourceInfo();
      
      if (!info.enabled) {
        continue;
      }

      try {
        console.log(`[RecipeService] Searching ${info.name} for ingredient: ${ingredient}`);
        const results = await source.getRecipesByIngredient(ingredient, filters);
        
        if (results && results.length > 0) {
          allResults = allResults.concat(results);
          console.log(`[RecipeService] ${info.name} returned ${results.length} results`);

          // Check if we have enough results
          if (this.fallbackStrategy === 'priority' && allResults.length >= this.minResultsBeforeFallback) {
            console.log(`[RecipeService] Sufficient results (${allResults.length}), stopping fallback`);
            break;
          }
        }
      } catch (error) {
        console.error(`[RecipeService] Error searching ${info.name} by ingredient:`, error.message);
        // Continue to next source
      }
    }

    // Deduplicate results
    const deduplicated = this._deduplicateRecipes(allResults);
    
    // Apply limit if specified
    const limit = filters.limit || 10;
    const results = deduplicated.slice(0, limit);

    this._storeInCache(cacheKey, results);
    return results;
  }

  /**
   * Get all recipe sources with metadata
   * 
   * @returns {Promise<Array<{source: RecipeSourceMetadata, recipeCount: number, healthy: boolean}>>}
   */
  async getSources() {
    const sourcesInfo = [];

    for (const source of this.sources) {
      const info = source.getSourceInfo();
      const health = await source.healthCheck();
      
      sourcesInfo.push({
        ...info,
        healthy: health.healthy,
        message: health.message,
      });
    }

    return sourcesInfo;
  }

  /**
   * Health check for all sources
   * 
   * @returns {Promise<{healthy: boolean, sources: Array}>}
   */
  async healthCheck() {
    const sources = await this.getSources();
    const allHealthy = sources.every(s => s.healthy);

    return {
      healthy: allHealthy,
      sources,
    };
  }

  /**
   * Add a recipe source
   * 
   * @param {IRecipeSource} source - Source to add
   */
  addSource(source) {
    this.sources.push(source);
    this._sortSourcesByPriority();
  }

  /**
   * Remove a recipe source
   * 
   * @param {string} sourceId - Source ID to remove
   */
  removeSource(sourceId) {
    this.sources = this.sources.filter(s => s.getSourceInfo().id !== sourceId);
  }

  /**
   * Clear all caches (orchestrator + all sources)
   */
  clearCache() {
    this.cache.clear();
    
    for (const source of this.sources) {
      if (typeof source.clearCache === 'function') {
        source.clearCache();
      }
    }
    
    console.log('[RecipeService] All caches cleared');
  }

  /**
   * Backward compatibility method for Epic 2
   * Maps to getRecipesByIngredient
   * 
   * @deprecated Use getRecipesByIngredient instead
   * @param {string} productName - Product name
   * @returns {Promise<Recipe[]>}
   */
  async getRecipes(productName) {
    console.warn('[RecipeService] getRecipes() is deprecated, use getRecipesByIngredient()');
    return this.getRecipesByIngredient(productName, { limit: 3 });
  }
}

module.exports = { RecipeService };
