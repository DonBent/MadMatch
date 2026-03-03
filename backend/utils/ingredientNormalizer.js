/**
 * Normalize ingredient name for flexible matching
 * Removes: percentages, weights, quantities, brand names
 * Examples:
 *   "Hakket Oksekød 8-12%" → "hakket oksekød"
 *   "Mælk 1 liter" → "mælk"
 *   "Æg 10 stk" → "æg"
 *   "Smør 250g" → "smør"
 */
function normalizeIngredient(ingredient) {
  return ingredient
    .toLowerCase()
    .replace(/\d+-?\d*\.?\d*%/g, '') // Remove percentages (8-12%, 3.5%, 1.5%)
    .replace(/\d+\.?\d*\s*(g|kg|ml|liter|dl|cl|stk|pk|stykker)/gi, '') // Remove weights/quantities
    .replace(/[0-9]/g, '') // Remove remaining numbers
    .replace(/[()]/g, '') // Remove parentheses
    .trim()
    .replace(/\s+/g, ' '); // Normalize whitespace
}

module.exports = { normalizeIngredient };
