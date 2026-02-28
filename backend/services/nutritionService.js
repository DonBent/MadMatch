const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

/**
 * NutritionService - Integrates with Open Food Facts API
 * Provides nutrition data with 1-hour caching
 * 
 * API: https://world.openfoodfacts.org/api/v2/search
 * Rate Limit: 100 req/min (acceptable)
 * User-Agent: Required per API terms
 */
class NutritionService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://world.openfoodfacts.org/api/v2';
    this.userAgent = options.userAgent || 'MadMatch/1.2.0 (contact@madmatch.dk)';
    this.cacheFilePath = options.cacheFilePath || path.join(__dirname, '../data/nutrition-cache.json');
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour in milliseconds
    this.cache = null;
  }

  /**
   * Initialize service - load cache from disk
   */
  async initialize() {
    try {
      await this._loadCache();
      await this._cleanExpiredEntries();
      console.log('[NutritionService] Initialized successfully');
    } catch (error) {
      console.error('[NutritionService] Initialization error:', error.message);
      this.cache = {};
    }
  }

  /**
   * Get nutrition data for a product
   * @param {string} productName - Product name to search
   * @param {string} productId - Product ID for cache key
   * @returns {Object|null} Nutrition data or null if not found
   */
  async getNutritionData(productName, productId) {
    if (!productName) {
      console.warn('[NutritionService] Empty product name provided');
      return null;
    }

    // Check cache first
    const cached = await this._getCachedData(productId);
    if (cached) {
      console.log(`[NutritionService] Cache HIT for product ${productId}`);
      return cached;
    }

    console.log(`[NutritionService] Cache MISS for product ${productId}, fetching from API`);

    // Fetch from Open Food Facts API
    try {
      const nutritionData = await this._fetchFromAPI(productName);
      
      if (nutritionData) {
        // Cache the result
        await this._cacheData(productId, nutritionData);
        return nutritionData;
      }

      return null;
    } catch (error) {
      console.error('[NutritionService] API fetch error:', error.message);
      return null;
    }
  }

  /**
   * Fetch nutrition data from Open Food Facts API
   * @private
   */
  async _fetchFromAPI(productName) {
    const searchQuery = encodeURIComponent(productName);
    const url = `${this.baseUrl}/search?search_terms=${searchQuery}&page_size=1&fields=product_name,nutriments,serving_size`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        console.error(`[NutritionService] API returned status ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data.products || data.products.length === 0) {
        console.log(`[NutritionService] No products found for "${productName}"`);
        return null;
      }

      // Extract nutrition data from first result
      const product = data.products[0];
      return this._parseNutritionData(product);
    } catch (error) {
      console.error('[NutritionService] API request failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse Open Food Facts API response to our format
   * @private
   */
  _parseNutritionData(product) {
    const nutriments = product.nutriments || {};

    // Helper to get value or null (handles 0 as valid value)
    const getValue = (...keys) => {
      for (const key of keys) {
        const value = nutriments[key];
        if (value !== undefined && value !== null) {
          return value;
        }
      }
      return null;
    };

    return {
      energyKcal: getValue('energy-kcal_100g', 'energy-kcal'),
      energyKj: getValue('energy-kj_100g', 'energy-kj'),
      protein: getValue('proteins_100g', 'proteins'),
      fat: getValue('fat_100g', 'fat'),
      saturatedFat: getValue('saturated-fat_100g', 'saturated-fat'),
      carbohydrates: getValue('carbohydrates_100g', 'carbohydrates'),
      sugars: getValue('sugars_100g', 'sugars'),
      fiber: getValue('fiber_100g', 'fiber'),
      salt: getValue('salt_100g', 'salt'),
      servingSize: product.serving_size || '100g',
      source: 'openfoodfacts',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Load cache from disk
   * @private
   */
  async _loadCache() {
    try {
      const data = await fs.readFile(this.cacheFilePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Cache file doesn't exist yet - create it
        this.cache = {};
        await this._saveCache();
      } else {
        console.error('[NutritionService] Error loading cache:', error.message);
        this.cache = {};
      }
    }
  }

  /**
   * Save cache to disk
   * @private
   */
  async _saveCache() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.cacheFilePath);
      await fs.mkdir(dataDir, { recursive: true });

      await fs.writeFile(
        this.cacheFilePath,
        JSON.stringify(this.cache, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('[NutritionService] Error saving cache:', error.message);
    }
  }

  /**
   * Get cached data if not expired
   * @private
   */
  async _getCachedData(productId) {
    if (!this.cache) {
      await this._loadCache();
    }

    const entry = this.cache[productId];
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const expiresAt = new Date(entry.expiresAt).getTime();

    if (now >= expiresAt) {
      // Cache expired
      delete this.cache[productId];
      await this._saveCache();
      return null;
    }

    return entry.data;
  }

  /**
   * Cache nutrition data
   * @private
   */
  async _cacheData(productId, data) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cacheTTL);

    this.cache[productId] = {
      data,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await this._saveCache();
  }

  /**
   * Clean expired entries from cache
   * @private
   */
  async _cleanExpiredEntries() {
    if (!this.cache) {
      return;
    }

    const now = Date.now();
    let cleaned = 0;

    for (const [productId, entry] of Object.entries(this.cache)) {
      const expiresAt = new Date(entry.expiresAt).getTime();
      if (now >= expiresAt) {
        delete this.cache[productId];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[NutritionService] Cleaned ${cleaned} expired cache entries`);
      await this._saveCache();
    }
  }

  /**
   * Clear entire cache (for testing/admin)
   */
  async clearCache() {
    this.cache = {};
    await this._saveCache();
    console.log('[NutritionService] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.cache) {
      return { entries: 0 };
    }

    const now = Date.now();
    const entries = Object.keys(this.cache).length;
    const expired = Object.values(this.cache).filter(
      entry => now >= new Date(entry.expiresAt).getTime()
    ).length;

    return {
      entries,
      active: entries - expired,
      expired
    };
  }
}

module.exports = { NutritionService };
