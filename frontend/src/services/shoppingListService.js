/**
 * shoppingListService.js - Epic 5 Slice 5: Shopping List Service
 * 
 * Aggregates ingredients from weekly meal plan into a unified shopping list.
 * Combines duplicate ingredients, groups by category, and matches with tilbud.
 */

import { getRecipe } from './recipeService';
import { calculateRecipeSavings } from './savingsService';

/**
 * Category keywords for ingredient classification
 * Simple keyword matching for MVP
 */
const CATEGORY_KEYWORDS = {
  'Grøntsager': ['løg', 'tomat', 'salat', 'agurk', 'peber', 'gulerod', 'kartoffel', 'selleri', 'squash', 'aubergine', 'broccoli', 'blomkål', 'spinat', 'ærter', 'bønner', 'majs', 'champignon', 'svampe'],
  'Kød & Fisk': ['kylling', 'oksekød', 'svinekød', 'laks', 'bacon', 'kalkun', 'lam', 'fisk', 'torsk', 'tun', 'rejer', 'hakkekød', 'koteletter', 'mørbrad', 'bryst', 'filet'],
  'Mejeri': ['smør', 'mælk', 'ost', 'fløde', 'yoghurt', 'creme fraiche', 'parmesan', 'mozzarella', 'feta', 'æg'],
  'Tørvarer': ['pasta', 'ris', 'mel', 'sukker', 'havregryn', 'bulgur', 'quinoa', 'couscous', 'brød', 'rugbrød', 'toast'],
  'Krydderier': ['salt', 'peber', 'karry', 'paprika', 'oregano', 'basilikum', 'timian', 'rosmarin', 'ingefær', 'hvidløg', 'chili', 'kanel', 'muskatnød']
};

/**
 * Categorize ingredient based on keywords
 * @param {string} ingredientName - Name of ingredient
 * @returns {string} Category name
 */
const categorizeIngredient = (ingredientName) => {
  const lowerName = ingredientName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Øvrigt'; // Fallback category
};

/**
 * Parse ingredient to extract quantity, unit, and name
 * Handles various formats:
 * - "300 g kyllingebryst"
 * - "2 stk. løg"
 * - "1 dl mælk"
 * - Object: { quantity: 300, unit: 'g', name: 'kyllingebryst' }
 * - String: "kyllingebryst"
 * 
 * @param {string|Object} ingredient - Raw ingredient
 * @returns {Object} { quantity, unit, name }
 */
const parseIngredient = (ingredient) => {
  // If ingredient is already an object with structured data
  if (typeof ingredient === 'object' && ingredient !== null) {
    return {
      quantity: ingredient.quantity || null,
      unit: ingredient.unit || '',
      name: ingredient.name || ingredient.ingredient || ''
    };
  }
  
  // If ingredient is a string, parse it
  if (typeof ingredient === 'string') {
    const trimmed = ingredient.trim();
    
    // Try to match pattern: "300 g kyllingebryst" or "2 stk. løg"
    const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*([a-zæøåA-ZÆØÅ.]+)?\s*(.+)$/);
    
    if (match) {
      const quantity = parseFloat(match[1].replace(',', '.'));
      const unit = match[2] ? match[2].trim() : '';
      const name = match[3].trim();
      
      return { quantity, unit, name };
    }
    
    // No quantity found, treat entire string as ingredient name
    return {
      quantity: null,
      unit: '',
      name: trimmed
    };
  }
  
  // Fallback: empty ingredient
  return {
    quantity: null,
    unit: '',
    name: ''
  };
};

/**
 * Normalize ingredient name for aggregation
 * Remove variations to ensure duplicates are combined
 * @param {string} name - Ingredient name
 * @returns {string} Normalized name
 */
const normalizeIngredientName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Aggregate duplicate ingredients by summing quantities
 * @param {Array} parsedIngredients - Array of parsed ingredients
 * @returns {Array} Aggregated ingredients
 */
const aggregateIngredients = (parsedIngredients) => {
  const aggregated = new Map();
  
  for (const ingredient of parsedIngredients) {
    if (!ingredient.name) continue;
    
    const normalizedName = normalizeIngredientName(ingredient.name);
    const key = `${normalizedName}|${ingredient.unit}`;
    
    if (aggregated.has(key)) {
      const existing = aggregated.get(key);
      
      // Sum quantities if both have numeric values
      if (existing.quantity !== null && ingredient.quantity !== null) {
        existing.quantity += ingredient.quantity;
      } else if (ingredient.quantity !== null) {
        existing.quantity = ingredient.quantity;
      }
    } else {
      aggregated.set(key, {
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        name: ingredient.name, // Keep original casing for display
        normalizedName
      });
    }
  }
  
  return Array.from(aggregated.values());
};

/**
 * Scale ingredient quantities by servings
 * @param {Array} ingredients - Recipe ingredients
 * @param {number} baseServings - Base servings (default 4)
 * @param {number} targetServings - Target servings for this recipe in plan
 * @returns {Array} Scaled ingredients
 */
const scaleIngredients = (ingredients, baseServings = 4, targetServings = 4) => {
  if (!Array.isArray(ingredients)) return [];
  
  const scale = targetServings / baseServings;
  
  return ingredients.map(ingredient => {
    const parsed = parseIngredient(ingredient);
    
    if (parsed.quantity !== null) {
      parsed.quantity = parsed.quantity * scale;
    }
    
    return parsed;
  });
};

/**
 * Group ingredients by category
 * @param {Array} ingredients - Aggregated ingredients
 * @returns {Object} Ingredients grouped by category
 */
const groupByCategory = (ingredients) => {
  const grouped = {
    'Grøntsager': [],
    'Kød & Fisk': [],
    'Mejeri': [],
    'Tørvarer': [],
    'Krydderier': [],
    'Øvrigt': []
  };
  
  for (const ingredient of ingredients) {
    const category = categorizeIngredient(ingredient.name);
    grouped[category].push(ingredient);
  }
  
  return grouped;
};

/**
 * Match ingredients with tilbud to calculate savings
 * @param {Array} ingredients - Aggregated ingredients
 * @returns {Promise<Object>} { itemsWithPrices, totalCost, totalSavings }
 */
const matchWithTilbud = async (ingredients) => {
  try {
    // Create mock recipes for each ingredient to reuse calculateRecipeSavings
    const matchPromises = ingredients.map(async (ingredient) => {
      const mockRecipe = {
        ingredients: [ingredient.name]
      };
      
      const savingsData = await calculateRecipeSavings(mockRecipe);
      
      // Check if this ingredient matched a tilbud product
      const matchedProduct = savingsData.matchedProducts.length > 0 
        ? savingsData.matchedProducts[0] 
        : null;
      
      return {
        ...ingredient,
        onTilbud: matchedProduct !== null,
        normalPrice: matchedProduct ? matchedProduct.normalPrice : null,
        tilbudPrice: matchedProduct ? matchedProduct.tilbudPrice : null,
        savings: matchedProduct ? matchedProduct.savings : 0,
        store: matchedProduct ? matchedProduct.store : null
      };
    });
    
    const itemsWithPrices = await Promise.all(matchPromises);
    
    // Calculate totals
    let totalCost = 0;
    let totalSavings = 0;
    
    for (const item of itemsWithPrices) {
      if (item.tilbudPrice !== null) {
        totalCost += item.tilbudPrice;
        totalSavings += item.savings;
      } else if (item.normalPrice !== null) {
        totalCost += item.normalPrice;
      }
    }
    
    return {
      itemsWithPrices,
      totalCost: Math.round(totalCost * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100
    };
  } catch (error) {
    console.error('Failed to match ingredients with tilbud:', error);
    
    // Return items without pricing on error
    return {
      itemsWithPrices: ingredients.map(ing => ({
        ...ing,
        onTilbud: false,
        normalPrice: null,
        tilbudPrice: null,
        savings: 0,
        store: null
      })),
      totalCost: 0,
      totalSavings: 0
    };
  }
};

/**
 * Generate shopping list from weekly meal plan
 * @param {Object} weeklyPlan - Weekly plan object from mealPlanService
 * @returns {Promise<Object>} { items: {...}, totalCost, totalSavings }
 */
export const generateShoppingList = async (weeklyPlan) => {
  try {
    if (!weeklyPlan || !weeklyPlan.days || !Array.isArray(weeklyPlan.days)) {
      throw new Error('Invalid weekly plan structure');
    }
    
    // 1. Extract all recipes from 7 days
    const daysWithRecipes = weeklyPlan.days.filter(day => day.recipe !== null);
    
    if (daysWithRecipes.length === 0) {
      return {
        items: {
          'Grøntsager': [],
          'Kød & Fisk': [],
          'Mejeri': [],
          'Tørvarer': [],
          'Krydderier': [],
          'Øvrigt': []
        },
        totalCost: 0,
        totalSavings: 0
      };
    }
    
    // 2. For each recipe, fetch full recipe data (ingredients)
    const recipePromises = daysWithRecipes.map(async (day) => {
      try {
        const fullRecipe = await getRecipe(day.recipe.id);
        const servings = day.recipe.servings || 4;
        
        return {
          recipe: fullRecipe,
          servings
        };
      } catch (error) {
        console.error(`Failed to fetch recipe ${day.recipe.id}:`, error);
        return null;
      }
    });
    
    const recipes = (await Promise.all(recipePromises)).filter(r => r !== null);
    
    // 3. Scale ingredients by servings and collect all ingredients
    const allIngredients = [];
    
    for (const { recipe, servings } of recipes) {
      const scaledIngredients = scaleIngredients(recipe.ingredients, 4, servings);
      allIngredients.push(...scaledIngredients);
    }
    
    // 4. Aggregate duplicates (sum quantities)
    const aggregatedIngredients = aggregateIngredients(allIngredients);
    
    // 5. Match with tilbud
    const { itemsWithPrices, totalCost, totalSavings } = await matchWithTilbud(aggregatedIngredients);
    
    // 6. Group by category
    const groupedItems = groupByCategory(itemsWithPrices);
    
    return {
      items: groupedItems,
      totalCost,
      totalSavings
    };
  } catch (error) {
    console.error('Failed to generate shopping list:', error);
    throw error;
  }
};

export default {
  generateShoppingList
};
