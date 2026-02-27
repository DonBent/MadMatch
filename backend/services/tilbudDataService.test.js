const {
  TilbudDataService,
  SallingGroupAdapter,
  MockDataAdapter,
  inferCategory,
  normalizeBrand
} = require('./tilbudDataService');
const nock = require('nock');

describe('TilbudDataService', () => {
  
  describe('Helper Functions', () => {
    describe('inferCategory', () => {
      it('should infer Kød from product name', () => {
        expect(inferCategory('Hakket Oksekød 8-12%')).toBe('Kød');
        expect(inferCategory('Kyllingebryst')).toBe('Kød');
      });

      it('should infer Mejeri from product name', () => {
        expect(inferCategory('Letmælk 1,5%')).toBe('Mejeri');
        expect(inferCategory('Yoghurt Naturel')).toBe('Mejeri');
        expect(inferCategory('Æg 10 stk')).toBe('Mejeri');
      });

      it('should infer Frugt from product name', () => {
        expect(inferCategory('Bananer')).toBe('Frugt');
        expect(inferCategory('Friske Æbler')).toBe('Frugt');
      });

      it('should return Diverse for unknown products', () => {
        expect(inferCategory('Unknown Product')).toBe('Diverse');
        expect(inferCategory('')).toBe('Diverse');
      });
    });

    describe('normalizeBrand', () => {
      it('should normalize store brand names', () => {
        expect(normalizeBrand('netto')).toBe('Netto');
        expect(normalizeBrand('foetex')).toBe('Føtex');
        expect(normalizeBrand('bilka')).toBe('Bilka');
      });

      it('should handle unknown brands', () => {
        expect(normalizeBrand('UnknownStore')).toBe('UnknownStore');
      });

      it('should handle empty brand', () => {
        expect(normalizeBrand('')).toBe('Ukendt');
      });
    });
  });

  describe('SallingGroupAdapter', () => {
    const mockApiKey = 'test-bearer-token';
    const baseUrl = 'https://api.sallinggroup.com';

    afterEach(() => {
      nock.cleanAll();
    });

    it('should fetch food waste data from API', async () => {
      const mockResponse = [
        {
          offer: {
            currency: 'DKK',
            discount: 12.00,
            ean: '5712345678901',
            endTime: '2026-02-27T22:59:59.000Z',
            newPrice: 7.95,
            originalPrice: 19.95,
            percentDiscount: 60,
            stock: 3,
            stockUnit: 'each'
          },
          product: {
            description: 'Økologisk Hakket Oksekød',
            image: 'https://example.com/image.jpg'
          },
          store: {
            name: 'Netto Aarhus C',
            brand: 'netto'
          }
        }
      ];

      nock(baseUrl)
        .get('/v1/food-waste')
        .query({ zip: '8000' })
        .reply(200, mockResponse);

      const adapter = new SallingGroupAdapter(mockApiKey, baseUrl, '8000');
      const result = await adapter.fetchFoodWaste();

      expect(result).toEqual(mockResponse);
    });

    it('should transform API data to schema', () => {
      const apiData = [
        {
          offer: {
            currency: 'DKK',
            discount: 12.00,
            ean: '5712345678901',
            endTime: '2026-02-27T22:59:59.000Z',
            newPrice: 7.95,
            originalPrice: 19.95,
            percentDiscount: 60,
            stock: 3,
            stockUnit: 'each'
          },
          product: {
            description: 'Økologisk Hakket Oksekød',
            image: 'https://example.com/image.jpg'
          },
          store: {
            name: 'Netto Aarhus C',
            brand: 'netto'
          }
        }
      ];

      const adapter = new SallingGroupAdapter(mockApiKey);
      const result = adapter.transformToSchema(apiData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        navn: 'Økologisk Hakket Oksekød',
        butik: 'Netto',
        kategori: 'Kød',
        normalpris: 19.95,
        tilbudspris: 7.95,
        rabat: 60,
        billedeUrl: 'https://example.com/image.jpg'
      });
    });

    it('should handle API errors gracefully', async () => {
      nock(baseUrl)
        .get('/v1/food-waste')
        .query({ zip: '8000' })
        .reply(500, { error: 'Internal Server Error' });

      const adapter = new SallingGroupAdapter(mockApiKey, baseUrl, '8000');
      
      await expect(adapter.fetchFoodWaste()).rejects.toThrow();
    });

    it('should return empty array when no API key provided', async () => {
      const adapter = new SallingGroupAdapter(null);
      const result = await adapter.fetchFoodWaste();
      
      expect(result).toEqual([]);
    });
  });

  describe('MockDataAdapter', () => {
    it('should return enhanced mock data', () => {
      const adapter = new MockDataAdapter();
      const mockData = adapter.getEnhancedMockData();

      expect(mockData).toBeInstanceOf(Array);
      expect(mockData.length).toBeGreaterThan(0);
      expect(mockData[0]).toHaveProperty('id');
      expect(mockData[0]).toHaveProperty('navn');
      expect(mockData[0]).toHaveProperty('butik');
      expect(mockData[0]).toHaveProperty('_source', 'mock-data');
    });

    it('should include Rema 1000 and Aldi stores', () => {
      const adapter = new MockDataAdapter();
      const mockData = adapter.getEnhancedMockData();

      const butikker = [...new Set(mockData.map(t => t.butik))];
      expect(butikker).toContain('Rema 1000');
      expect(butikker).toContain('Aldi');
    });
  });

  describe('TilbudDataService Integration', () => {
    afterEach(() => {
      nock.cleanAll();
    });

    it('should combine real and mock data', async () => {
      const mockApiResponse = [
        {
          offer: {
            newPrice: 10.00,
            originalPrice: 20.00,
            percentDiscount: 50,
            ean: '1234567890123'
          },
          product: {
            description: 'Test Product'
          },
          store: {
            brand: 'netto'
          }
        }
      ];

      nock('https://api.sallinggroup.com')
        .get('/v1/food-waste')
        .query({ zip: '8000' })
        .reply(200, mockApiResponse);

      const service = new TilbudDataService({
        sallingApiKey: 'test-key',
        enableRealData: true,
        enableMockFallback: true
      });

      const tilbud = await service.getTilbud();

      expect(tilbud.length).toBeGreaterThan(1); // Should have both real and mock
      
      const realData = tilbud.filter(t => t._source === 'salling-api');
      const mockData = tilbud.filter(t => t._source === 'mock-data');
      
      expect(realData.length).toBeGreaterThan(0);
      expect(mockData.length).toBeGreaterThan(0);
    });

    it('should use only mock data when real data disabled', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      const tilbud = await service.getTilbud();

      expect(tilbud.length).toBeGreaterThan(0);
      expect(tilbud.every(t => t._source === 'mock-data')).toBe(true);
    });

    it('should get tilbud by ID', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      const tilbud = await service.getTilbudById(1);

      expect(tilbud).toBeTruthy();
      expect(tilbud.id).toBe(1);
    });

    it('should return null for non-existent ID', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      const tilbud = await service.getTilbudById(99999);

      expect(tilbud).toBeNull();
    });

    it('should get list of unique stores', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      const butikker = await service.getButikker();

      expect(butikker).toBeInstanceOf(Array);
      expect(butikker.length).toBeGreaterThan(0);
      expect(butikker).toContain('Rema 1000');
      expect(butikker).toContain('Aldi');
    });

    it('should get list of unique categories', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      const kategorier = await service.getKategorier();

      expect(kategorier).toBeInstanceOf(Array);
      expect(kategorier.length).toBeGreaterThan(0);
    });

    it('should apply filters correctly', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      const allTilbud = await service.getTilbud();
      
      // Filter by butik
      const nettoTilbud = service.applyFilters(allTilbud, { butik: 'Rema 1000' });
      expect(nettoTilbud.every(t => t.butik === 'Rema 1000')).toBe(true);

      // Filter by kategori
      const mejeriTilbud = service.applyFilters(allTilbud, { kategori: 'Mejeri' });
      expect(mejeriTilbud.every(t => t.kategori === 'Mejeri')).toBe(true);

      // Filter by both
      const filtered = service.applyFilters(allTilbud, { 
        butik: 'Rema 1000', 
        kategori: 'Mejeri' 
      });
      expect(filtered.every(t => t.butik === 'Rema 1000' && t.kategori === 'Mejeri')).toBe(true);
    });

    it('should cache responses', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      // First call
      const tilbud1 = await service.getTilbud();
      
      // Second call (should be from cache)
      const tilbud2 = await service.getTilbud();

      expect(tilbud1).toEqual(tilbud2);
    });

    it('should clear cache', async () => {
      const service = new TilbudDataService({
        enableRealData: false,
        enableMockFallback: true
      });

      await service.getTilbud();
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.keys).toBe(0);
    });

    it('should fallback to last successful response on API failure', async () => {
      nock('https://api.sallinggroup.com')
        .get('/v1/food-waste')
        .query({ zip: '8000' })
        .reply(200, [
          {
            offer: { newPrice: 10, originalPrice: 20, percentDiscount: 50, ean: '123' },
            product: { description: 'Success Product' },
            store: { brand: 'netto' }
          }
        ]);

      const service = new TilbudDataService({
        sallingApiKey: 'test-key',
        enableRealData: true,
        enableMockFallback: true
      });

      // First successful call
      const tilbud1 = await service.getTilbud();
      const successData = tilbud1.filter(t => t._source === 'salling-api');
      expect(successData.length).toBeGreaterThan(0);

      // Clear regular cache but not fallback
      service.clearCache();

      // Second call with API failure
      nock.cleanAll();
      nock('https://api.sallinggroup.com')
        .get('/v1/food-waste')
        .query({ zip: '8000' })
        .reply(500, { error: 'Server Error' });

      const tilbud2 = await service.getTilbud();
      const fallbackData = tilbud2.filter(t => t._source === 'salling-api');
      
      // Should still have data from fallback
      expect(fallbackData.length).toBeGreaterThan(0);
    });
  });
});
