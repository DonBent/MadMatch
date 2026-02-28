const { SustainabilityService } = require('./sustainabilityService');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

describe('SustainabilityService', () => {
  let service;
  const testDataPath = path.join(__dirname, '../data/sustainability.json');
  
  const mockSustainabilityData = {
    '1': {
      ecoScore: 'B',
      carbonFootprint: 5.2,
      organic: false,
      fairTrade: false,
      local: false,
      packagingRecyclable: true
    },
    '2': {
      ecoScore: 'A',
      carbonFootprint: 0.8,
      organic: true,
      fairTrade: false,
      local: true,
      packagingRecyclable: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SustainabilityService({
      dataFilePath: testDataPath
    });
  });

  describe('initialize', () => {
    test('should load sustainability data on initialization', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify(mockSustainabilityData));

      await service.initialize();

      expect(fs.readFile).toHaveBeenCalledWith(testDataPath, 'utf8');
      expect(service.sustainabilityData).toEqual(mockSustainabilityData);
    });

    test('should handle missing data file gracefully', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);

      await service.initialize();

      expect(service.sustainabilityData).toEqual({});
    });

    test('should handle invalid JSON gracefully', async () => {
      fs.readFile.mockResolvedValue('invalid json {');

      await service.initialize();

      expect(service.sustainabilityData).toEqual({});
    });
  });

  describe('loadSustainabilityData', () => {
    test('should parse JSON data correctly', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify(mockSustainabilityData));

      await service.loadSustainabilityData();

      expect(service.sustainabilityData).toEqual(mockSustainabilityData);
    });

    test('should initialize empty object if file not found', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);

      await service.loadSustainabilityData();

      expect(service.sustainabilityData).toEqual({});
    });
  });

  describe('getManualData', () => {
    beforeEach(() => {
      service.sustainabilityData = mockSustainabilityData;
    });

    test('should return data for existing product ID', () => {
      const result = service.getManualData('1');
      expect(result).toEqual(mockSustainabilityData['1']);
    });

    test('should return null for non-existent product ID', () => {
      const result = service.getManualData('999');
      expect(result).toBeNull();
    });

    test('should return null if sustainability data not loaded', () => {
      service.sustainabilityData = null;
      const result = service.getManualData('1');
      expect(result).toBeNull();
    });
  });

  describe('getSustainabilityData', () => {
    beforeEach(() => {
      service.sustainabilityData = mockSustainabilityData;
    });

    test('should return manual data when available', async () => {
      const result = await service.getSustainabilityData('1', 'Test Product');

      expect(result).toEqual({
        ...mockSustainabilityData['1'],
        source: 'manual',
        lastUpdated: expect.any(String)
      });
    });

    test('should fallback to Open Food Facts when manual data unavailable', async () => {
      const mockOpenFoodFactsResponse = {
        data: {
          products: [{
            product_name: 'Test Product',
            ecoscore_grade: 'a',
            labels_tags: ['en:organic', 'en:eu-organic']
          }]
        }
      };

      axios.get.mockResolvedValue(mockOpenFoodFactsResponse);

      const result = await service.getSustainabilityData('999', 'Test Product');

      expect(result).toEqual({
        ecoScore: 'A',
        carbonFootprint: null,
        organic: true,
        fairTrade: false,
        local: false,
        packagingRecyclable: null,
        source: 'openfoodfacts',
        lastUpdated: expect.any(String)
      });
    });

    test('should return null when no data available from any source', async () => {
      axios.get.mockResolvedValue({ data: { products: [] } });

      const result = await service.getSustainabilityData('999', 'Unknown Product');

      expect(result).toBeNull();
    });

    test('should handle Open Food Facts API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.getSustainabilityData('999', 'Test Product');

      expect(result).toBeNull();
    });
  });

  describe('getOpenFoodFactsEcoScore', () => {
    test('should query Open Food Facts API correctly', async () => {
      const mockResponse = {
        data: {
          products: [{
            product_name: 'Organic Milk',
            ecoscore_grade: 'b',
            labels_tags: ['en:organic']
          }]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await service.getOpenFoodFactsEcoScore('Organic Milk');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/cgi/search.pl'),
        expect.objectContaining({
          params: expect.objectContaining({
            search_terms: 'Organic Milk',
            json: 1
          }),
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('MadMatch')
          })
        })
      );

      expect(result).toEqual({
        ecoScore: 'B',
        carbonFootprint: null,
        organic: true,
        fairTrade: false,
        local: false,
        packagingRecyclable: null
      });
    });

    test('should return null for empty product name', async () => {
      const result = await service.getOpenFoodFactsEcoScore('');
      expect(result).toBeNull();
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should return null when no products found', async () => {
      axios.get.mockResolvedValue({ data: { products: [] } });

      const result = await service.getOpenFoodFactsEcoScore('Unknown Product');

      expect(result).toBeNull();
    });

    test('should return null when product has no eco-score', async () => {
      const mockResponse = {
        data: {
          products: [{
            product_name: 'Test Product',
            ecoscore_grade: null
          }]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await service.getOpenFoodFactsEcoScore('Test Product');

      expect(result).toBeNull();
    });

    test('should handle timeout errors', async () => {
      const error = new Error('Timeout');
      error.code = 'ECONNABORTED';
      axios.get.mockRejectedValue(error);

      const result = await service.getOpenFoodFactsEcoScore('Test Product');

      expect(result).toBeNull();
    });

    test('should handle rate limit errors (429)', async () => {
      const error = new Error('Rate limit');
      error.response = { status: 429 };
      axios.get.mockRejectedValue(error);

      const result = await service.getOpenFoodFactsEcoScore('Test Product');

      expect(result).toBeNull();
    });

    test('should detect organic labels correctly', async () => {
      const testCases = [
        {
          labels: ['en:organic'],
          expected: true
        },
        {
          labels: ['en:bio'],
          expected: true
        },
        {
          labels: ['en:eu-organic'],
          expected: true
        },
        {
          labels: ['en:fair-trade'],
          expected: false
        },
        {
          labels: [],
          expected: false
        }
      ];

      for (const testCase of testCases) {
        axios.get.mockResolvedValue({
          data: {
            products: [{
              ecoscore_grade: 'a',
              labels_tags: testCase.labels
            }]
          }
        });

        const result = await service.getOpenFoodFactsEcoScore('Test');
        expect(result.organic).toBe(testCase.expected);
      }
    });
  });

  describe('reload', () => {
    test('should reload sustainability data successfully', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify(mockSustainabilityData));

      const result = await service.reload();

      expect(result).toBe(true);
      expect(service.sustainabilityData).toEqual(mockSustainabilityData);
    });

    test('should return false on reload failure', async () => {
      fs.readFile.mockRejectedValue(new Error('Read error'));

      const result = await service.reload();

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle product ID as string', async () => {
      service.sustainabilityData = mockSustainabilityData;

      const result = await service.getSustainabilityData('1', 'Product');

      expect(result).toBeTruthy();
      expect(result.source).toBe('manual');
    });

    test('should handle missing product name in fallback', async () => {
      const result = await service.getSustainabilityData('999', '');

      expect(result).toBeNull();
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should uppercase eco-score grades', async () => {
      axios.get.mockResolvedValue({
        data: {
          products: [{
            ecoscore_grade: 'c'
          }]
        }
      });

      const result = await service.getOpenFoodFactsEcoScore('Test');

      expect(result.ecoScore).toBe('C');
    });
  });
});
