const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const recipeService = {
  /**
   * Search recipes with optional filters
   * @param {Object} options - Search options
   * @param {string} options.query - Search query (defaults to empty for all recipes)
   * @param {string} options.language - Language code (default: 'da')
   * @param {number} options.limit - Number of recipes per page (default: 20)
   * @param {number} options.offset - Pagination offset (default: 0)
   * @returns {Promise<Object>} Recipe search results
   */
  async searchRecipes(options = {}) {
    try {
      const {
        query = '',
        language = 'da',
        limit = 20,
        offset = 0
      } = options;

      const params = new URLSearchParams({
        q: query,
        language,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const url = `${API_BASE_URL}/recipes/search?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching recipes:', error);
      throw error;
    }
  },

  /**
   * Get recipe by ID
   * @param {string} id - Recipe ID
   * @returns {Promise<Object>} Recipe details
   */
  async getRecipeById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching recipe by id:', error);
      throw error;
    }
  }
};
