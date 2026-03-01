/**
 * RecipeService - Client-side wrapper for Recipe API (Epic 3.5)
 * Provides caching, error handling, and fallback logic
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache with TTL
class RecipeCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

const cache = new RecipeCache();

/**
 * Generate cache key from parameters
 */
const getCacheKey = (endpoint, params) => {
  const sortedParams = Object.keys(params || {})
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
};

/**
 * Log fallback events for monitoring
 */
const logFallback = (reason, details) => {
  console.warn('[RecipeService] Fallback triggered:', reason, details);
};

/**
 * Search recipes by query with optional filters
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters (language, source, difficulty, max_time, limit, offset)
 * @returns {Promise<Object>} - { recipes, total, limit, offset, hasMore }
 */
export const searchRecipes = async (query, filters = {}) => {
  const params = { q: query, ...filters };
  const cacheKey = getCacheKey('/recipes/search', params);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/recipes/search?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful response
    cache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    logFallback('searchRecipes failed', { query, error: error.message });
    throw error;
  }
};

/**
 * Get a single recipe by ID
 * @param {string} id - Recipe UUID
 * @returns {Promise<Object>} - Recipe object
 */
export const getRecipe = async (id) => {
  const cacheKey = getCacheKey(`/recipes/${id}`);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/recipes/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Recipe with ID '${id}' not found`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful response
    cache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    logFallback('getRecipe failed', { id, error: error.message });
    throw error;
  }
};

/**
 * Get recipes by ingredient
 * @param {string} ingredient - Ingredient name
 * @param {Object} options - Optional filters (language, limit, offset)
 * @returns {Promise<Object>} - { ingredient, recipes, total, limit, offset, hasMore }
 */
export const getRecipesByIngredient = async (ingredient, options = {}) => {
  const params = { ingredient, ...options };
  const cacheKey = getCacheKey('/recipes/by-ingredient', params);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/recipes/by-ingredient?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful response
    cache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    logFallback('getRecipesByIngredient failed', { ingredient, error: error.message });
    throw error;
  }
};

/**
 * Get recipe sources with health status
 * @returns {Promise<Object>} - { sources, total }
 */
export const getRecipeSources = async () => {
  const cacheKey = getCacheKey('/recipes/sources');
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/recipes/sources`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful response
    cache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    logFallback('getRecipeSources failed', { error: error.message });
    throw error;
  }
};

/**
 * Legacy endpoint compatibility - maps product to recipe search
 * Maintains backward compatibility with Epic 2
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} - Array of recipes
 */
export const getRecipesForProduct = async (productId) => {
  const cacheKey = getCacheKey(`/produkt/${productId}/recipes`);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/produkt/${productId}/recipes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const recipes = result.data || [];
    
    // Cache successful response
    cache.set(cacheKey, recipes);
    
    return recipes;
  } catch (error) {
    logFallback('getRecipesForProduct failed', { productId, error: error.message });
    throw error;
  }
};

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export const clearCache = () => {
  cache.clear();
};

/**
 * Get cache statistics (useful for debugging)
 */
export const getCacheStats = () => {
  return {
    size: cache.size(),
    ttlMs: CACHE_TTL_MS
  };
};

export default {
  searchRecipes,
  getRecipe,
  getRecipesByIngredient,
  getRecipeSources,
  getRecipesForProduct,
  clearCache,
  getCacheStats
};
