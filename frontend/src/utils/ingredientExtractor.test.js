import { extractKeyIngredients, formatIngredientsForQuery } from './ingredientExtractor';

describe('ingredientExtractor', () => {
  describe('extractKeyIngredients', () => {
    test('extracts main ingredients from typical recipe', () => {
      const ingredients = [
        { name: 'Hakket oksekød', quantity: '500', unit: 'g' },
        { name: 'Løg', quantity: '1', unit: 'stk' },
        { name: 'Tomater', quantity: '400', unit: 'g' },
        { name: 'Ris', quantity: '2', unit: 'dl' },
        { name: 'Salt', quantity: '1', unit: 'tsk' }
      ];

      const result = extractKeyIngredients(ingredients);

      expect(result).toContain('oksekød');
      expect(result).toContain('løg');
      expect(result).toContain('tomat');
      expect(result).toContain('ris');
      expect(result).not.toContain('salt');
    });

    test('filters out common cooking items (salt, pepper, water, oil)', () => {
      const ingredients = [
        { name: 'Kylling', quantity: '400', unit: 'g' },
        { name: 'Salt', quantity: '1', unit: 'tsk' },
        { name: 'Peber', quantity: '0.5', unit: 'tsk' },
        { name: 'Vand', quantity: '2', unit: 'dl' },
        { name: 'Olie', quantity: '2', unit: 'spsk' },
        { name: 'Tomater', quantity: '300', unit: 'g' }
      ];

      const result = extractKeyIngredients(ingredients);

      expect(result).toContain('kylling');
      expect(result).toContain('tomat');
      expect(result).not.toContain('salt');
      expect(result).not.toContain('peber');
      expect(result).not.toContain('vand');
      expect(result).not.toContain('olie');
    });

    test('prioritizes proteins and vegetables', () => {
      const ingredients = [
        { name: 'Mel', quantity: '200', unit: 'g' },
        { name: 'Kylling', quantity: '400', unit: 'g' },
        { name: 'Brød', quantity: '100', unit: 'g' },
        { name: 'Broccoli', quantity: '300', unit: 'g' },
        { name: 'Majsstivelse', quantity: '1', unit: 'spsk' }
      ];

      const result = extractKeyIngredients(ingredients, { maxIngredients: 3 });

      // Should prioritize kylling and broccoli over mel and brød
      expect(result).toContain('kylling');
      expect(result).toContain('broccoli');
      expect(result.length).toBeLessThanOrEqual(3);
    });

    test('limits to max 5 ingredients by default', () => {
      const ingredients = [
        { name: 'Kylling', quantity: '400', unit: 'g' },
        { name: 'Ris', quantity: '2', unit: 'dl' },
        { name: 'Løg', quantity: '1', unit: 'stk' },
        { name: 'Tomat', quantity: '300', unit: 'g' },
        { name: 'Porre', quantity: '1', unit: 'stk' },
        { name: 'Gulerod', quantity: '2', unit: 'stk' },
        { name: 'Kartoffel', quantity: '3', unit: 'stk' },
        { name: 'Broccoli', quantity: '200', unit: 'g' }
      ];

      const result = extractKeyIngredients(ingredients);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    test('respects custom maxIngredients option', () => {
      const ingredients = [
        { name: 'Kylling', quantity: '400', unit: 'g' },
        { name: 'Ris', quantity: '2', unit: 'dl' },
        { name: 'Løg', quantity: '1', unit: 'stk' },
        { name: 'Tomat', quantity: '300', unit: 'g' }
      ];

      const result = extractKeyIngredients(ingredients, { maxIngredients: 2 });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    test('extracts main word from ingredient names', () => {
      const ingredients = [
        { name: 'Friske tomater', quantity: '400', unit: 'g' },
        { name: 'Hakket oksekød', quantity: '500', unit: 'g' },
        { name: 'Kogt ris', quantity: '2', unit: 'dl' }
      ];

      const result = extractKeyIngredients(ingredients);

      expect(result).toContain('tomat');
      expect(result).toContain('oksekød');
      expect(result).toContain('ris');
    });

    test('handles empty ingredient list', () => {
      const result = extractKeyIngredients([]);
      expect(result).toEqual([]);
    });

    test('handles null/undefined ingredients', () => {
      expect(extractKeyIngredients(null)).toEqual([]);
      expect(extractKeyIngredients(undefined)).toEqual([]);
    });

    test('handles ingredients as strings (legacy format)', () => {
      const ingredients = ['Kylling', 'Ris', 'Salt', 'Tomat'];

      const result = extractKeyIngredients(ingredients);

      expect(result).toContain('kylling');
      expect(result).toContain('ris');
      expect(result).toContain('tomat');
      expect(result).not.toContain('salt');
    });

    test('handles mixed object and string ingredients', () => {
      const ingredients = [
        { name: 'Kylling', quantity: '400', unit: 'g' },
        'Ris',
        { name: 'Salt', quantity: '1', unit: 'tsk' },
        'Tomat'
      ];

      const result = extractKeyIngredients(ingredients);

      expect(result).toContain('kylling');
      expect(result).toContain('ris');
      expect(result).toContain('tomat');
      expect(result).not.toContain('salt');
    });

    test('removes common suffixes (tomater -> tomat)', () => {
      const ingredients = [
        { name: 'Tomater', quantity: '400', unit: 'g' },
        { name: 'Gulerødder', quantity: '2', unit: 'stk' }
      ];

      const result = extractKeyIngredients(ingredients);

      expect(result).toContain('tomat');
      // Suffix removal is best-effort, so we just check the ingredient is processed
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatIngredientsForQuery', () => {
    test('formats array of ingredients as comma-separated string', () => {
      const ingredients = ['kylling', 'ris', 'tomat'];
      const result = formatIngredientsForQuery(ingredients);

      expect(result).toBe('kylling,ris,tomat');
    });

    test('handles empty array', () => {
      const result = formatIngredientsForQuery([]);
      expect(result).toBe('');
    });

    test('handles null/undefined', () => {
      expect(formatIngredientsForQuery(null)).toBe('');
      expect(formatIngredientsForQuery(undefined)).toBe('');
    });

    test('handles single ingredient', () => {
      const result = formatIngredientsForQuery(['kylling']);
      expect(result).toBe('kylling');
    });
  });

  describe('Integration: extractKeyIngredients + formatIngredientsForQuery', () => {
    test('full workflow: extract and format for URL', () => {
      const ingredients = [
        { name: 'Kyllingebryst', quantity: '500', unit: 'g' },
        { name: 'Ris', quantity: '2', unit: 'dl' },
        { name: 'Tomater', quantity: '400', unit: 'g' },
        { name: 'Salt', quantity: '1', unit: 'tsk' },
        { name: 'Peber', quantity: '0.5', unit: 'tsk' }
      ];

      const extracted = extractKeyIngredients(ingredients);
      const formatted = formatIngredientsForQuery(extracted);

      // Should extract kylling, ris, tomat (skip salt, peber)
      expect(formatted).toContain('kylling');
      expect(formatted).toContain('ris');
      expect(formatted).toContain('tomat');
      expect(formatted).not.toContain('salt');
      expect(formatted).not.toContain('peber');

      // Should be comma-separated
      expect(formatted.split(',')).toHaveLength(3);
    });
  });
});
