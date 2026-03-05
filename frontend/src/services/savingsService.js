/**
 * savingsService.js - Epic 5 Slice 4: Tilbud Savings Calculator
 * 
 * Calculates potential savings when recipes contain ingredients that match tilbud products.
 * Uses simple ingredient matching against the tilbud database.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Extract ingredient names from recipe ingredients array
 * Handles various formats: strings or objects with name/quantity
 * @param {Array} ingredients - Recipe ingredients array
 * @returns {Array<string>} Array of ingredient names
 */
const extractIngredientNames = (ingredients) => {
  if (!Array.isArray(ingredients)) return [];
  
  return ingredients.map(ingredient => {
    // If ingredient is a string, return as-is
    if (typeof ingredient === 'string') {
      return ingredient.trim();
    }
    
    // If ingredient is an object with 'name' or 'ingredient' field
    if (typeof ingredient === 'object' && ingredient !== null) {
      return (ingredient.name || ingredient.ingredient || '').trim();
    }
    
    return '';
  }).filter(name => name.length > 0);
};

/**
 * Match a single ingredient to tilbud products
 * @param {string} ingredientName - Ingredient name to match
 * @returns {Promise<Object|null>} Best matching product or null
 */
const matchIngredientToTilbud = async (ingredientName) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/tilbud/match?ingredient=${encodeURIComponent(ingredientName)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`Failed to match ingredient: ${ingredientName}`, response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.products || data.products.length === 0) {
      return null;
    }
    
    // Return the best match (highest discount, already sorted by backend)
    return data.products[0];
  } catch (error) {
    console.error(`Error matching ingredient ${ingredientName}:`, error);
    return null;
  }
};

/**
 * Calculate savings for a single recipe based on tilbud matches
 * @param {Object} recipe - Recipe object with ingredients array
 * @returns {Promise<Object>} { totalSavings, matchedProducts }
 */
export const calculateRecipeSavings = async (recipe) => {
  if (!recipe || !recipe.ingredients) {
    return {
      totalSavings: 0,
      matchedProducts: []
    };
  }
  
  const startTime = Date.now();
  
  try {
    const ingredientNames = extractIngredientNames(recipe.ingredients);
    
    if (ingredientNames.length === 0) {
      return {
        totalSavings: 0,
        matchedProducts: []
      };
    }
    
    // Match all ingredients in parallel for performance
    const matchPromises = ingredientNames.map(name => 
      matchIngredientToTilbud(name)
    );
    
    const matches = await Promise.all(matchPromises);
    
    // Filter out null matches and calculate total savings
    const matchedProducts = matches
      .filter(match => match !== null)
      .map(match => ({
        ingredient: match.name,
        normalPrice: match.normalPrice,
        tilbudPrice: match.tilbudPrice,
        savings: match.normalPrice - match.tilbudPrice,
        discount: match.discount,
        store: match.store
      }));
    
    const totalSavings = matchedProducts.reduce(
      (sum, product) => sum + product.savings,
      0
    );
    
    const duration = Date.now() - startTime;
    
    // Log performance warning if calculation took too long
    if (duration > 200) {
      console.warn(`[Performance] Recipe savings calculation took ${duration}ms (target: <200ms)`);
    }
    
    return {
      totalSavings: Math.round(totalSavings * 100) / 100, // Round to 2 decimals
      matchedProducts
    };
  } catch (error) {
    console.error('Error calculating recipe savings:', error);
    return {
      totalSavings: 0,
      matchedProducts: []
    };
  }
};

/**
 * Calculate total weekly savings across all days
 * @param {Object} weeklyPlan - Weekly plan object with days array
 * @returns {Promise<Object>} { totalSavings, savingsByDay }
 */
export const calculateWeeklySavings = async (weeklyPlan) => {
  if (!weeklyPlan || !weeklyPlan.days || !Array.isArray(weeklyPlan.days)) {
    return {
      totalSavings: 0,
      savingsByDay: {}
    };
  }
  
  try {
    // Get all days with recipes
    const daysWithRecipes = weeklyPlan.days.filter(day => day.recipe !== null);
    
    if (daysWithRecipes.length === 0) {
      return {
        totalSavings: 0,
        savingsByDay: {}
      };
    }
    
    // Calculate savings for each day's recipe in parallel
    const savingsPromises = daysWithRecipes.map(async (day) => {
      const recipeSavings = await calculateRecipeSavings(day.recipe);
      
      // Scale savings by servings if available
      const servings = day.recipe.servings || 4;
      const scaledSavings = recipeSavings.totalSavings * (servings / 4);
      
      return {
        date: day.date,
        savings: scaledSavings,
        matchedProducts: recipeSavings.matchedProducts
      };
    });
    
    const allDaySavings = await Promise.all(savingsPromises);
    
    // Build savingsByDay map
    const savingsByDay = {};
    let totalSavings = 0;
    
    allDaySavings.forEach(daySavings => {
      savingsByDay[daySavings.date] = daySavings.savings;
      totalSavings += daySavings.savings;
    });
    
    return {
      totalSavings: Math.round(totalSavings * 100) / 100,
      savingsByDay
    };
  } catch (error) {
    console.error('Error calculating weekly savings:', error);
    return {
      totalSavings: 0,
      savingsByDay: {}
    };
  }
};

/**
 * Calculate savings with servings adjustment
 * @param {number} baseSavings - Base savings amount
 * @param {number} baseServings - Original servings (default 4)
 * @param {number} newServings - New servings count
 * @returns {number} Scaled savings
 */
export const scaleSavingsByServings = (baseSavings, baseServings = 4, newServings = 4) => {
  if (baseServings === 0 || newServings === 0) return 0;
  
  const scaledSavings = baseSavings * (newServings / baseServings);
  return Math.round(scaledSavings * 100) / 100;
};

export default {
  calculateRecipeSavings,
  calculateWeeklySavings,
  scaleSavingsByServings
};
