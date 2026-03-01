// Epic 3.5 Slice 2: Database Recipe Source Implementation
// Correlation ID: ZHC-MadMatch-20260301-004
// Implements IRecipeSource for PostgreSQL database via Prisma

const { IRecipeSource } = require('../interfaces/IRecipeSource');
const { getPrismaClient } = require('../services/databaseService');

/**
 * DatabaseRecipeSource - Recipe source backed by PostgreSQL database
 * 
 * Features:
 * - Full-text search using PostgreSQL GIN indexes
 * - Ingredient-based search
 * - Filtering by language, difficulty, source
 * - Pagination support
 * 
 * AC-2.2: DatabaseRecipeSource uses Prisma + full-text search
 */
class DatabaseRecipeSource extends IRecipeSource {
  constructor(options = {}) {
    super();
    this.sourceId = options.sourceId || 'database';
    this.sourceName = options.sourceName || 'Database';
    this.priority = options.priority || 1;
    this.enabled = options.enabled !== false;
  }

  /**
   * Convert Prisma recipe to standardized format
   * @private
   */
  _toStandardFormat(prismaRecipe) {
    if (!prismaRecipe) return null;

    return {
      id: prismaRecipe.id,
      title: prismaRecipe.title,
      description: prismaRecipe.description || undefined,
      imageUrl: prismaRecipe.imageUrl || undefined,
      cookTimeMinutes: prismaRecipe.cookTimeMinutes || prismaRecipe.totalTimeMinutes || undefined,
      servings: prismaRecipe.servings || undefined,
      difficulty: prismaRecipe.difficulty || undefined,
      language: prismaRecipe.language,
      sourceId: prismaRecipe.source?.id || prismaRecipe.sourceId,
      sourceName: prismaRecipe.source?.name || this.sourceName,
      ingredients: (prismaRecipe.ingredients || [])
        .sort((a, b) => a.order - b.order)
        .map(ing => ({
          name: ing.ingredientName,
          quantity: ing.quantity || undefined,
          order: ing.order,
        })),
      instructions: prismaRecipe.instructions 
        ? prismaRecipe.instructions.split('\n').filter(s => s.trim())
        : undefined,
      tags: [], // Future enhancement
      url: this._buildRecipeUrl(prismaRecipe),
    };
  }

  /**
   * Build recipe URL (internal or external)
   * @private
   */
  _buildRecipeUrl(recipe) {
    if (recipe.source?.baseUrl && recipe.externalId) {
      return `${recipe.source.baseUrl}${recipe.slug || recipe.externalId}`;
    }
    return `/recipes/${recipe.slug || recipe.id}`;
  }

  /**
   * Build Prisma where clause from filters
   * @private
   */
  _buildWhereClause(filters = {}) {
    const where = {};

    if (filters.language) {
      where.language = filters.language;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.maxTime) {
      where.totalTimeMinutes = {
        lte: filters.maxTime,
      };
    }

    if (filters.sourceId) {
      where.sourceId = filters.sourceId;
    }

    return where;
  }

  /**
   * Get a single recipe by ID
   * 
   * @param {string} id - Recipe UUID or slug
   * @returns {Promise<Recipe|null>}
   */
  async getRecipe(id) {
    const prisma = getPrismaClient();

    try {
      // Try UUID first
      let recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          source: true,
          ingredients: true,
        },
      });

      // If not found, try slug
      if (!recipe) {
        recipe = await prisma.recipe.findUnique({
          where: { slug: id },
          include: {
            source: true,
            ingredients: true,
          },
        });
      }

      return this._toStandardFormat(recipe);
    } catch (error) {
      console.error('[DatabaseRecipeSource] Error fetching recipe:', error.message);
      throw new Error(`Failed to fetch recipe: ${error.message}`);
    }
  }

  /**
   * Search recipes by query string using full-text search
   * 
   * Uses PostgreSQL to_tsvector and plainto_tsquery for efficient full-text search
   * 
   * @param {string} query - Search query
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async search(query, filters = {}) {
    const prisma = getPrismaClient();
    const limit = Math.min(filters.limit || 10, 50);
    const offset = filters.offset || 0;

    try {
      // Build where clause for filters
      const where = this._buildWhereClause(filters);

      // Use raw SQL for full-text search with ranking
      // PostgreSQL's to_tsvector with 'simple' config works for both Danish and English
      const recipes = await prisma.$queryRaw`
        SELECT 
          r.*,
          ts_rank(to_tsvector('simple', r.title || ' ' || COALESCE(r.description, '')), plainto_tsquery('simple', ${query})) as rank
        FROM recipes r
        WHERE 
          to_tsvector('simple', r.title || ' ' || COALESCE(r.description, '')) @@ plainto_tsquery('simple', ${query})
          ${filters.language ? prisma.$queryRaw`AND r.language = ${filters.language}` : prisma.$queryRaw``}
          ${filters.difficulty ? prisma.$queryRaw`AND r.difficulty = ${filters.difficulty}::difficulty` : prisma.$queryRaw``}
          ${filters.maxTime ? prisma.$queryRaw`AND r.total_time_minutes <= ${filters.maxTime}` : prisma.$queryRaw``}
          ${filters.sourceId ? prisma.$queryRaw`AND r.source_id = ${filters.sourceId}::uuid` : prisma.$queryRaw``}
        ORDER BY rank DESC, r.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Fetch full recipe data with relations
      const recipeIds = recipes.map(r => r.id);
      
      if (recipeIds.length === 0) {
        return [];
      }

      const fullRecipes = await prisma.recipe.findMany({
        where: {
          id: { in: recipeIds },
        },
        include: {
          source: true,
          ingredients: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Maintain rank order from full-text search
      const rankMap = new Map(recipes.map(r => [r.id, r.rank]));
      fullRecipes.sort((a, b) => (rankMap.get(b.id) || 0) - (rankMap.get(a.id) || 0));

      return fullRecipes.map(r => this._toStandardFormat(r));
    } catch (error) {
      console.error('[DatabaseRecipeSource] Search error:', error.message);
      throw new Error(`Failed to search recipes: ${error.message}`);
    }
  }

  /**
   * Get recipes containing a specific ingredient
   * 
   * Uses full-text search on recipe_ingredients table with fuzzy matching
   * 
   * @param {string} ingredient - Ingredient name
   * @param {RecipeFilters} [filters] - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async getRecipesByIngredient(ingredient, filters = {}) {
    const prisma = getPrismaClient();
    const limit = Math.min(filters.limit || 10, 50);
    const offset = filters.offset || 0;

    try {
      // Build where clause for recipe filters
      const recipeWhere = this._buildWhereClause(filters);

      // Search for recipes with matching ingredients using full-text search
      const recipes = await prisma.$queryRaw`
        SELECT DISTINCT ON (r.id)
          r.*,
          ts_rank(to_tsvector('simple', ri.ingredient_name), plainto_tsquery('simple', ${ingredient})) as rank
        FROM recipes r
        INNER JOIN recipe_ingredients ri ON ri.recipe_id = r.id
        WHERE 
          to_tsvector('simple', ri.ingredient_name) @@ plainto_tsquery('simple', ${ingredient})
          ${filters.language ? prisma.$queryRaw`AND r.language = ${filters.language}` : prisma.$queryRaw``}
          ${filters.difficulty ? prisma.$queryRaw`AND r.difficulty = ${filters.difficulty}::difficulty` : prisma.$queryRaw``}
          ${filters.maxTime ? prisma.$queryRaw`AND r.total_time_minutes <= ${filters.maxTime}` : prisma.$queryRaw``}
          ${filters.sourceId ? prisma.$queryRaw`AND r.source_id = ${filters.sourceId}::uuid` : prisma.$queryRaw``}
        ORDER BY r.id, rank DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Fetch full recipe data with relations
      const recipeIds = recipes.map(r => r.id);
      
      if (recipeIds.length === 0) {
        return [];
      }

      const fullRecipes = await prisma.recipe.findMany({
        where: {
          id: { in: recipeIds },
        },
        include: {
          source: true,
          ingredients: true,
        },
      });

      // Maintain rank order
      const rankMap = new Map(recipes.map(r => [r.id, r.rank]));
      fullRecipes.sort((a, b) => (rankMap.get(b.id) || 0) - (rankMap.get(a.id) || 0));

      return fullRecipes.map(r => this._toStandardFormat(r));
    } catch (error) {
      console.error('[DatabaseRecipeSource] Ingredient search error:', error.message);
      throw new Error(`Failed to search by ingredient: ${error.message}`);
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
      enabled: this.enabled,
    };
  }

  /**
   * Health check - verify database connection
   * 
   * @returns {Promise<{healthy: boolean, message: string}>}
   */
  async healthCheck() {
    try {
      const prisma = getPrismaClient();
      const count = await prisma.recipe.count();
      return {
        healthy: true,
        message: `Database source healthy. ${count} recipes available.`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Database source unavailable: ${error.message}`,
      };
    }
  }
}

module.exports = { DatabaseRecipeSource };
