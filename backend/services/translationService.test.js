const { TranslationService } = require('./translationService');

describe('TranslationService', () => {
  let service;
  
  beforeEach(() => {
    service = new TranslationService();
  });
  
  describe('translateProductName', () => {
    test('translates exact match - meat', () => {
      expect(service.translateProductName('hakket oksekød')).toBe('ground beef');
      expect(service.translateProductName('kylling')).toBe('chicken');
      expect(service.translateProductName('svinekød')).toBe('pork');
    });
    
    test('translates exact match - dairy', () => {
      expect(service.translateProductName('mælk')).toBe('milk');
      expect(service.translateProductName('ost')).toBe('cheese');
      expect(service.translateProductName('smør')).toBe('butter');
    });
    
    test('translates exact match - vegetables', () => {
      expect(service.translateProductName('kartofler')).toBe('potatoes');
      expect(service.translateProductName('tomat')).toBe('tomato');
      expect(service.translateProductName('løg')).toBe('onion');
    });
    
    test('translates case-insensitive', () => {
      expect(service.translateProductName('HAKKET OKSEKØD')).toBe('ground beef');
      expect(service.translateProductName('Mælk')).toBe('milk');
      expect(service.translateProductName('Kylling')).toBe('chicken');
    });
    
    test('translates partial match - compound names', () => {
      expect(service.translateProductName('Økologisk Hakket Oksekød')).toBe('ground beef');
      expect(service.translateProductName('Dansk Hakket Oksekød 8-12%')).toBe('ground beef');
      expect(service.translateProductName('Frisk Mælk')).toBe('milk');
    });
    
    test('prioritizes longer matches', () => {
      // "hakket oksekød" should match before "oksekød"
      expect(service.translateProductName('hakket oksekød')).toBe('ground beef');
      expect(service.translateProductName('oksekød')).toBe('beef');
    });
    
    test('returns original if no match', () => {
      expect(service.translateProductName('Unknown Product')).toBe('Unknown Product');
      expect(service.translateProductName('Coca Cola')).toBe('Coca Cola');
      expect(service.translateProductName('Kims Chips')).toBe('Kims Chips');
    });
    
    test('handles empty or null input', () => {
      expect(service.translateProductName('')).toBe('');
      expect(service.translateProductName(null)).toBe(null);
      expect(service.translateProductName(undefined)).toBe(undefined);
    });
    
    test('has at least 20 common food translations', () => {
      const translationCount = Object.keys(service.foodTranslations).length;
      expect(translationCount).toBeGreaterThanOrEqual(20);
    });
  });
});
