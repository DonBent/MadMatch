// Epic 3.5 Slice 2: Recipe Source Abstraction Layer
// Correlation ID: ZHC-MadMatch-20260301-004
// Interface definition for recipe sources

/**
 * @typedef {Object} RecipeIngredient
 * @property {string} name - Ingredient name
 * @property {string} [quantity] - Quantity (e.g., "500 g", "2 stk")
 * @property {number} order - Display order
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id - Unique recipe identifier
 * @property {string} title - Recipe title
 * @property {string} [description] - Recipe description
 * @property {string} [imageUrl] - Recipe image URL
 * @property {number} [cookTimeMinutes] - Cooking time in minutes
 * @property {number} [servings] - Number of servings
 * @property {'EASY'|'MEDIUM'|'HARD'} [difficulty] - Difficulty level
 * @property {'da'|'en'} language - Recipe language
 * @property {string} sourceId - Source identifier
 * @property {string} sourceName - Human-readable source name
 * @property {RecipeIngredient[]} ingredients - List of ingredients
 * @property {string[]} [instructions] - Step-by-step instructions
 * @property {string[]} [tags] - Recipe tags/categories
 * @property {Object} [nutritionData] - Optional nutrition information
 * @property {string} [url] - Original recipe URL
 */

/**
 * @typedef {Object} RecipeFilters
 * @property {'da'|'en'} [language] - Filter by language
 * @property {'EASY'|'MEDIUM'|'HARD'} [difficulty] - Filter by difficulty
 * @property {number} [maxTime] - Maximum total time in minutes
 * @property {string} [sourceId] - Filter by source ID
 * @property {number} [limit] - Maximum results (default: 10)
 * @property {number} [offset] - Pagination offset (default: 0)
 */

/**
 * @typedef {Object} RecipeSourceMetadata
 * @property {string} id - Source unique identifier
 * @property {string} name - Source name
 * @property {number} priority - Source priority (lower = higher priority)
 * @property {boolean} enabled - Whether source is enabled
 */

/**
 * IRecipeSource - Interface for recipe sources
 * 
 * All recipe sources (Database, Spoonacular, future sources) must implement this interface.
 * This ensures consistent behavior across different recipe providers.
 * 
 * @interface
 */
class IRecipeSource {
  /**
   * Get a single recipe by ID
   * 
   * @param {string} id - Recipe identifier
   * @returns {Promise<Recipe|null>} Recipe object or null if not found
   * @throws {Error} If source is unavailable
   */
  async getRecipe(id) {
    throw new Error('getRecipe() must be implemented');
  }

  /**
   * Search recipes by query string
   * 
   * @param {string} query - Search query (e.g., "kylling", "pasta")
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>} Array of matching recipes
   * @throws {Error} If source is unavailable
   */
  async search(query, filters = {}) {
    throw new Error('search() must be implemented');
  }

  /**
   * Get recipes containing a specific ingredient
   * 
   * @param {string} ingredient - Ingredient name (e.g., "hakket oksekød")
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>} Array of recipes with that ingredient
   * @throws {Error} If source is unavailable
   */
  async getRecipesByIngredient(ingredient, filters = {}) {
    throw new Error('getRecipesByIngredient() must be implemented');
  }

  /**
   * Get metadata about this recipe source
   * 
   * @returns {RecipeSourceMetadata} Source metadata
   */
  getSourceInfo() {
    throw new Error('getSourceInfo() must be implemented');
  }

  /**
   * Health check - verify source is accessible
   * 
   * @returns {Promise<{healthy: boolean, message: string}>} Health status
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented');
  }
}

module.exports = { IRecipeSource };
