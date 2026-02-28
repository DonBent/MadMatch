const fs = require('fs').promises;
const path = require('path');

/**
 * RecipeService - Integrates with Spoonacular API for recipe suggestions
 * 
 * Features:
 * - Search recipes by ingredient (product name)
 * - 24-hour caching to conserve API quota
 * - Limit to 3 recipes per product
 * - Graceful error handling
 * 
 * API: Spoonacular findByIngredients
 * Free tier: 150 points/day
 * Cache TTL: 24 hours (conserve quota)
 */
class RecipeService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.SPOONACULAR_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.spoonacular.com';
    this.cacheFilePath = options.cacheFilePath || path.join(__dirname, '../data/recipe-cache.json');
    this.cacheTTL = options.cacheTTL || 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.maxRecipes = options.maxRecipes || 3;
    this.cache = {};
  }

  /**
   * Initialize service - load cache from disk
   */
  async initialize() {
    try {
      const cacheData = await fs.readFile(this.cacheFilePath, 'utf8');
      this.cache = JSON.parse(cacheData);
      console.log('[RecipeService] Cache loaded successfully');
      
      // Clean expired entries
      await this.cleanExpiredCache();
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('[RecipeService] No cache file found, starting fresh');
        this.cache = {};
        await this.saveCache();
      } else {
        console.error('[RecipeService] Error loading cache:', error.message);
        this.cache = {};
      }
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of Object.entries(this.cache)) {
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() < now) {
        delete this.cache[key];
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[RecipeService] Cleaned ${cleaned} expired cache entries`);
      await this.saveCache();
    }
  }

  /**
   * Save cache to disk
   */
  async saveCache() {
    try {
      await fs.writeFile(
        this.cacheFilePath,
        JSON.stringify(this.cache, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('[RecipeService] Error saving cache:', error.message);
    }
  }

  /**
   * Get cache key for a product
   */
  getCacheKey(productName) {
    return productName.toLowerCase().trim().replace(/\s+/g, '_');
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cacheEntry) {
    if (!cacheEntry || !cacheEntry.expiresAt) {
      return false;
    }
    
    return new Date(cacheEntry.expiresAt).getTime() > Date.now();
  }

  /**
   * Get recipes from cache if available and valid
   */
  getFromCache(productName) {
    const key = this.getCacheKey(productName);
    const entry = this.cache[key];
    
    if (entry && this.isCacheValid(entry)) {
      console.log(`[RecipeService] Cache hit for: ${productName}`);
      return entry.data;
    }
    
    console.log(`[RecipeService] Cache miss for: ${productName}`);
    return null;
  }

  /**
   * Store recipes in cache
   */
  async storeInCache(productName, recipes) {
    const key = this.getCacheKey(productName);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cacheTTL);
    
    this.cache[key] = {
      data: recipes,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    await this.saveCache();
    console.log(`[RecipeService] Cached recipes for: ${productName} (expires: ${expiresAt.toISOString()})`);
  }

  /**
   * Extract ingredient from product name
   * Removes common suffixes and cleans the string for API search
   */
  extractIngredient(productName) {
    // Remove common Danish product suffixes and percentages
    let ingredient = productName
      .toLowerCase()
      .replace(/\d+-\d+%/g, '') // Remove percentage ranges like "8-12%"
      .replace(/\d+,\d+%/g, '') // Remove decimal percentages like "0,5%"
      .replace(/\d+%/g, '') // Remove single percentages
      .replace(/økologisk/gi, '') // Remove "økologisk"
      .replace(/dansk/gi, '') // Remove "dansk"
      .trim();
    
    // Take first part before common separators
    ingredient = ingredient.split(/[,;-]/)[0].trim();
    
    return ingredient;
  }

  /**
   * Parse difficulty from Spoonacular's readyInMinutes
   * Simple heuristic: <30min = easy, 30-60 = medium, >60 = hard
   */
  calculateDifficulty(readyInMinutes) {
    if (readyInMinutes < 30) return 'easy';
    if (readyInMinutes < 60) return 'medium';
    return 'hard';
  }

  /**
   * Fetch recipes from Spoonacular API
   */
  async fetchFromAPI(productName) {
    if (!this.apiKey) {
      console.warn('[RecipeService] No API key configured');
      return [];
    }
    
    const ingredient = this.extractIngredient(productName);
    
    if (!ingredient) {
      console.warn('[RecipeService] Could not extract ingredient from:', productName);
      return [];
    }
    
    const url = `${this.baseUrl}/recipes/findByIngredients?apiKey=${this.apiKey}&ingredients=${encodeURIComponent(ingredient)}&number=${this.maxRecipes}&ranking=2&ignorePantry=true`;
    
    try {
      console.log(`[RecipeService] Fetching recipes for ingredient: ${ingredient}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MadMatch/1.3.0 (contact@madmatch.dk)'
        }
      });
      
      if (!response.ok) {
        if (response.status === 402) {
          console.error('[RecipeService] API quota exceeded (402)');
          return [];
        }
        
        if (response.status === 401) {
          console.error('[RecipeService] Invalid API key (401)');
          return [];
        }
        
        console.error(`[RecipeService] API error: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      // Parse response and extract needed fields
      const recipes = data.slice(0, this.maxRecipes).map(recipe => ({
        id: recipe.id.toString(),
        title: recipe.title,
        imageUrl: recipe.image || null,
        prepTime: recipe.readyInMinutes || null,
        servings: recipe.servings || null,
        difficulty: this.calculateDifficulty(recipe.readyInMinutes || 45),
        sourceUrl: `https://spoonacular.com/recipes/${recipe.title.toLowerCase().replace(/\s+/g, '-')}-${recipe.id}`,
        apiSource: 'spoonacular'
      }));
      
      console.log(`[RecipeService] Fetched ${recipes.length} recipes from API`);
      return recipes;
      
    } catch (error) {
      console.error('[RecipeService] Error fetching from API:', error.message);
      return [];
    }
  }

  /**
   * Get recipe suggestions for a product
   * Uses cache if available, otherwise fetches from API
   */
  async getRecipes(productName) {
    if (!productName) {
      console.warn('[RecipeService] No product name provided');
      return [];
    }
    
    // Check cache first
    const cached = this.getFromCache(productName);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch from API
    const recipes = await this.fetchFromAPI(productName);
    
    // Cache the result (even if empty - prevents repeated failed API calls)
    await this.storeInCache(productName, recipes);
    
    return recipes;
  }

  /**
   * Clear all cache (useful for testing/admin)
   */
  async clearCache() {
    this.cache = {};
    await this.saveCache();
    console.log('[RecipeService] Cache cleared');
  }
}

module.exports = { RecipeService };
