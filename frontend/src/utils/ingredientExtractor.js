/**
 * Extract key ingredients from a recipe for tilbud matching
 * Filters out common/generic items and prioritizes proteins and vegetables
 */

// Words to skip (generic cooking items)
const SKIP_WORDS = [
  'salt', 'peber', 'pepper', 'vand', 'water', 'olie', 'oil',
  'smør', 'butter', 'sukker', 'sugar', 'mel', 'flour',
  'hvedemel', 'bagepulver', 'natron', 'gær', 'vanilie'
];

// Priority ingredients (proteins, vegetables)
const PRIORITY_WORDS = [
  'kylling', 'chicken', 'oksekød', 'beef', 'svinekød', 'pork',
  'laks', 'salmon', 'torsk', 'cod', 'fisk', 'fish',
  'tomat', 'tomato', 'løg', 'onion', 'porre', 'leek',
  'gulerod', 'carrot', 'kartoffel', 'potato', 'ris', 'rice',
  'pasta', 'broccoli', 'blomkål', 'cauliflower', 'spinat', 'spinach'
];

/**
 * Extract key ingredients from a recipe
 * @param {Array} ingredients - Array of ingredient objects with {name, quantity, unit}
 * @param {Object} options - Options for extraction
 * @param {number} options.maxIngredients - Maximum number of ingredients to return (default: 5)
 * @returns {Array} - Array of ingredient names (strings)
 */
export function extractKeyIngredients(ingredients, options = {}) {
  const { maxIngredients = 5 } = options;

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return [];
  }

  // Extract ingredient names
  const ingredientNames = ingredients
    .map(ing => {
      if (typeof ing === 'string') return ing;
      if (ing.name) return ing.name;
      return null;
    })
    .filter(Boolean);

  // Filter and score ingredients
  const scored = ingredientNames.map(name => {
    const normalized = name.toLowerCase().trim();
    
    // Check if should be skipped
    const shouldSkip = SKIP_WORDS.some(skipWord => 
      normalized.includes(skipWord.toLowerCase())
    );
    
    if (shouldSkip) {
      return null;
    }

    // Calculate priority score
    const isPriority = PRIORITY_WORDS.some(priorityWord => 
      normalized.includes(priorityWord.toLowerCase())
    );

    return {
      name: extractMainWord(normalized),
      score: isPriority ? 2 : 1,
      original: name
    };
  }).filter(Boolean);

  // Sort by score (priority first) and take top N
  const topIngredients = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxIngredients)
    .map(item => item.name);

  return topIngredients;
}

/**
 * Extract the main word from an ingredient name
 * Example: "Hakket oksekød" -> "oksekød"
 * Example: "Friske tomater" -> "tomat"
 */
function extractMainWord(ingredientName) {
  // Remove common prefixes
  const withoutPrefixes = ingredientName
    .replace(/^(frisk|friske|hakket|revet|skåret|kogt|stegt|dampet)\s+/i, '');

  // Take the first significant word (usually the main ingredient)
  const words = withoutPrefixes.split(/\s+/);
  const mainWord = words[0] || ingredientName;

  // Remove common suffixes
  return mainWord
    .replace(/(e|er)$/, '') // tomater -> tomat, løge -> løg
    .trim();
}

/**
 * Format ingredients for URL query
 * @param {Array} ingredients - Array of ingredient strings
 * @returns {string} - Comma-separated ingredient list
 */
export function formatIngredientsForQuery(ingredients) {
  if (!ingredients || !Array.isArray(ingredients)) {
    return '';
  }
  return ingredients.join(',');
}
