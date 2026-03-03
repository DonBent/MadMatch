/**
 * TranslationService - Simple Danish→English food translation
 * 
 * Purpose: Translate Danish product names to English for Spoonacular API
 * Spoonacular only understands English ingredient names
 * 
 * Strategy:
 * 1. Exact match lookup
 * 2. Partial match for compound names (e.g. "Økologisk Hakket Oksekød")
 * 3. Fallback to original (may be English already or brand name)
 */
class TranslationService {
  constructor() {
    // Common Danish → English food translations
    this.foodTranslations = {
      // Meat
      'hakket oksekød': 'ground beef',
      'oksekød': 'beef',
      'svinekød': 'pork',
      'kylling': 'chicken',
      'kalkun': 'turkey',
      'lam': 'lamb',
      'bacon': 'bacon',
      'pølser': 'sausages',
      'pølse': 'sausage',
      
      // Dairy
      'mælk': 'milk',
      'ost': 'cheese',
      'smør': 'butter',
      'yoghurt': 'yogurt',
      'fløde': 'cream',
      'skyr': 'skyr',
      'æg': 'eggs',
      
      // Vegetables
      'kartofler': 'potatoes',
      'kartoffel': 'potato',
      'tomat': 'tomato',
      'tomater': 'tomatoes',
      'løg': 'onion',
      'løger': 'onions',
      'gulerødder': 'carrots',
      'gulerod': 'carrot',
      'salat': 'lettuce',
      'agurk': 'cucumber',
      'peberfrugt': 'bell pepper',
      'peberfrugter': 'bell peppers',
      'spinat': 'spinach',
      'broccoli': 'broccoli',
      'blomkål': 'cauliflower',
      
      // Fruits
      'æbler': 'apples',
      'æble': 'apple',
      'banan': 'banana',
      'bananer': 'bananas',
      'appelsin': 'orange',
      'appelsiner': 'oranges',
      'citron': 'lemon',
      'citroner': 'lemons',
      'jordbær': 'strawberries',
      
      // Grains & Bread
      'brød': 'bread',
      'rugbrød': 'rye bread',
      'pasta': 'pasta',
      'ris': 'rice',
      'havregryn': 'oats',
      'mel': 'flour',
      
      // Common modifiers (stripped, not translated)
      'økologisk': 'organic',
      'frisk': 'fresh',
      'frossen': 'frozen',
      'dansk': 'danish',
    };
  }
  
  /**
   * Translate Danish product name to English
   * 
   * @param {string} danishName - Product name in Danish
   * @returns {string} English translation or original if no match
   */
  translateProductName(danishName) {
    if (!danishName) return danishName;
    
    const lowerName = danishName.toLowerCase();
    
    // 1. Check for exact match
    if (this.foodTranslations[lowerName]) {
      return this.foodTranslations[lowerName];
    }
    
    // 2. Check for partial matches (e.g. "Økologisk Hakket Oksekød" → "ground beef")
    // Prioritize longer matches first (more specific)
    // Skip common modifiers (økologisk, frisk, etc) in favor of actual food items
    const modifiers = new Set(['økologisk', 'frisk', 'frossen', 'dansk']);
    
    const sortedEntries = Object.entries(this.foodTranslations)
      .filter(([danish]) => !modifiers.has(danish))  // Prioritize food items over modifiers
      .sort((a, b) => b[0].length - a[0].length);
    
    for (const [danish, english] of sortedEntries) {
      if (lowerName.includes(danish)) {
        return english;
      }
    }
    
    // 3. Fallback: return original (maybe it's already English or brand name)
    return danishName;
  }
}

module.exports = { TranslationService };
