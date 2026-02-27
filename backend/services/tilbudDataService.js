const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Category inference mapping
const CATEGORY_KEYWORDS = {
  'Kød': ['oksekød', 'svinekød', 'kylling', 'kød', 'bacon', 'pølse', 'hakket'],
  'Mejeri': ['mælk', 'yoghurt', 'ost', 'smør', 'fløde', 'skyr', 'æg'],
  'Frugt': ['banan', 'æble', 'pære', 'appelsin', 'citron', 'drue', 'frugt'],
  'Grøntsager': ['tomat', 'agurk', 'salat', 'peber', 'løg', 'gulerod', 'kartoffel'],
  'Fisk': ['laks', 'torsk', 'tun', 'reje', 'fisk', 'sild'],
  'Brød': ['brød', 'bolle', 'rundstykke', 'toast', 'bagel'],
  'Drikkevarer': ['cola', 'vand', 'juice', 'sodavand', 'øl', 'vin', 'kaffe', 'te'],
  'Tørvarer': ['pasta', 'ris', 'mel', 'sukker', 'havregryn', 'müsli'],
  'Snacks': ['chips', 'chokolade', 'slik', 'kiks', 'nødder'],
  'Diverse': []
};

/**
 * Infer category from product name
 * @param {string} productName
 * @returns {string} Category name
 */
function inferCategory(productName) {
  if (!productName) return 'Diverse';
  
  const nameLower = productName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Diverse') continue;
    
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Diverse';
}

/**
 * Normalize store brand name
 * @param {string} brand
 * @returns {string} Normalized brand name
 */
function normalizeBrand(brand) {
  if (!brand) return 'Ukendt';
  
  const brandMap = {
    'netto': 'Netto',
    'foetex': 'Føtex',
    'bilka': 'Bilka',
    'salling': 'Salling'
  };
  
  return brandMap[brand.toLowerCase()] || brand;
}

/**
 * Salling Group API Adapter
 */
class SallingGroupAdapter {
  constructor(apiKey, baseUrl = 'https://api.sallinggroup.com', zipCode = '8000') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.zipCode = zipCode;
  }

  /**
   * Fetch food waste clearance offers from Salling Group API
   * @returns {Promise<Array>} Array of clearance offers
   */
  async fetchFoodWaste() {
    if (!this.apiKey) {
      console.warn('[WARN] Salling API key not configured, skipping API call');
      return [];
    }

    try {
      const url = `${this.baseUrl}/v1/food-waste`;
      const params = { zip: this.zipCode };
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      };

      console.log(`[INFO] Fetching food waste data from Salling API`, { 
        url, 
        zipCode: this.zipCode 
      });

      const response = await axios.get(url, { params, headers, timeout: 5000 });
      
      const clearances = response.data || [];
      console.log(`[SUCCESS] Retrieved ${clearances.length} clearance offers from Salling API`);
      
      return clearances;
    } catch (error) {
      console.error('[ERROR] Failed to fetch from Salling API:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  /**
   * Transform Salling API clearance data to our schema
   * @param {Array} clearances - Raw clearance data from API
   * @returns {Array} Transformed tilbud array
   */
  transformToSchema(clearances) {
    if (!Array.isArray(clearances)) {
      console.warn('[WARN] Invalid clearances data, expected array');
      return [];
    }

    const transformed = [];
    let idCounter = 1000; // Start IDs at 1000 to avoid conflict with mock data

    for (const clearance of clearances) {
      try {
        const { offer, product, store } = clearance;
        
        if (!offer || !product || !store) {
          console.warn('[WARN] Incomplete clearance data, skipping', { clearance });
          continue;
        }

        const productName = product.description || 'Ukendt Produkt';
        const category = inferCategory(productName);
        const storeBrand = normalizeBrand(store.brand);

        const tilbud = {
          id: idCounter++,
          navn: productName,
          butik: storeBrand,
          kategori: category,
          normalpris: parseFloat(offer.originalPrice) || 0,
          tilbudspris: parseFloat(offer.newPrice) || 0,
          rabat: Math.round(offer.percentDiscount || 0),
          billedeUrl: product.image || '/images/placeholder.jpg',
          // Extra metadata for debugging
          _source: 'salling-api',
          _ean: offer.ean,
          _stock: offer.stock,
          _expiryDate: offer.endTime
        };

        transformed.push(tilbud);
      } catch (error) {
        console.error('[ERROR] Failed to transform clearance item:', {
          error: error.message,
          clearance
        });
      }
    }

    console.log(`[INFO] Transformed ${transformed.length} items to schema`);
    return transformed;
  }

  /**
   * Fetch and transform data in one call
   * @returns {Promise<Array>} Array of tilbud
   */
  async getTilbud() {
    const clearances = await this.fetchFoodWaste();
    return this.transformToSchema(clearances);
  }
}

/**
 * Mock Data Adapter for stores not covered by Salling API
 */
class MockDataAdapter {
  /**
   * Get enhanced mock data for stores like Rema 1000, Aldi, etc.
   * @returns {Array} Mock tilbud array
   */
  getEnhancedMockData() {
    return [
      {
        id: 1,
        navn: 'Hakket Oksekød 8-12%',
        butik: 'Rema 1000',
        kategori: 'Kød',
        normalpris: 59.95,
        tilbudspris: 39.95,
        rabat: 33,
        billedeUrl: '/images/oksekoed.jpg',
        _source: 'mock-data'
      },
      {
        id: 4,
        navn: 'Coca Cola 1,5L',
        butik: 'Rema 1000',
        kategori: 'Drikkevarer',
        normalpris: 20.00,
        tilbudspris: 12.00,
        rabat: 40,
        billedeUrl: '/images/cola.jpg',
        _source: 'mock-data'
      },
      {
        id: 7,
        navn: 'Smør 250g',
        butik: 'Rema 1000',
        kategori: 'Mejeri',
        normalpris: 18.95,
        tilbudspris: 12.95,
        rabat: 32,
        billedeUrl: '/images/smoer.jpg',
        _source: 'mock-data'
      },
      {
        id: 10,
        navn: 'Æg 10 stk',
        butik: 'Rema 1000',
        kategori: 'Mejeri',
        normalpris: 25.95,
        tilbudspris: 19.95,
        rabat: 23,
        billedeUrl: '/images/aeg.jpg',
        _source: 'mock-data'
      },
      {
        id: 13,
        navn: 'Spaghetti 500g',
        butik: 'Rema 1000',
        kategori: 'Tørvarer',
        normalpris: 12.95,
        tilbudspris: 8.95,
        rabat: 31,
        billedeUrl: '/images/pasta.jpg',
        _source: 'mock-data'
      },
      {
        id: 16,
        navn: 'Frisk Laks 400g',
        butik: 'Rema 1000',
        kategori: 'Fisk',
        normalpris: 69.95,
        tilbudspris: 49.95,
        rabat: 29,
        billedeUrl: '/images/laks.jpg',
        _source: 'mock-data'
      },
      {
        id: 19,
        navn: 'Bananer 1kg',
        butik: 'Rema 1000',
        kategori: 'Frugt',
        normalpris: 15.00,
        tilbudspris: 10.00,
        rabat: 33,
        billedeUrl: '/images/bananer.jpg',
        _source: 'mock-data'
      },
      {
        id: 101,
        navn: 'Økologisk Mælk 1L',
        butik: 'Aldi',
        kategori: 'Mejeri',
        normalpris: 12.95,
        tilbudspris: 8.95,
        rabat: 31,
        billedeUrl: '/images/maelk.jpg',
        _source: 'mock-data'
      },
      {
        id: 102,
        navn: 'Friske Jordbær 250g',
        butik: 'Aldi',
        kategori: 'Frugt',
        normalpris: 25.00,
        tilbudspris: 15.00,
        rabat: 40,
        billedeUrl: '/images/jordbaer.jpg',
        _source: 'mock-data'
      },
      {
        id: 103,
        navn: 'Grahamsboller 6 stk',
        butik: 'Aldi',
        kategori: 'Brød',
        normalpris: 15.95,
        tilbudspris: 11.95,
        rabat: 25,
        billedeUrl: '/images/boller.jpg',
        _source: 'mock-data'
      },
      {
        id: 104,
        navn: 'Kyllingebryst 500g',
        butik: 'Aldi',
        kategori: 'Kød',
        normalpris: 45.00,
        tilbudspris: 29.95,
        rabat: 33,
        billedeUrl: '/images/kylling.jpg',
        _source: 'mock-data'
      },
      {
        id: 105,
        navn: 'Gulerødder 1kg',
        butik: 'Aldi',
        kategori: 'Grøntsager',
        normalpris: 12.95,
        tilbudspris: 7.95,
        rabat: 39,
        billedeUrl: '/images/guleroedder.jpg',
        _source: 'mock-data'
      },
      {
        id: 106,
        navn: 'Kartofler 2kg',
        butik: 'Aldi',
        kategori: 'Grøntsager',
        normalpris: 18.95,
        tilbudspris: 12.95,
        rabat: 32,
        billedeUrl: '/images/kartofler.jpg',
        _source: 'mock-data'
      },
      {
        id: 107,
        navn: 'Havregryn 750g',
        butik: 'Aldi',
        kategori: 'Tørvarer',
        normalpris: 14.95,
        tilbudspris: 9.95,
        rabat: 33,
        billedeUrl: '/images/havregryn.jpg',
        _source: 'mock-data'
      },
      {
        id: 108,
        navn: 'Appelsinjuice 1L',
        butik: 'Aldi',
        kategori: 'Drikkevarer',
        normalpris: 16.95,
        tilbudspris: 11.95,
        rabat: 29,
        billedeUrl: '/images/juice.jpg',
        _source: 'mock-data'
      }
    ];
  }
}

/**
 * Main Tilbud Data Service
 * Aggregates data from multiple sources with caching and error handling
 */
class TilbudDataService {
  constructor(config = {}) {
    this.sallingAdapter = new SallingGroupAdapter(
      config.sallingApiKey,
      config.sallingBaseUrl,
      config.sallingZipCode
    );
    this.mockAdapter = new MockDataAdapter();
    this.enableRealData = config.enableRealData !== false;
    this.enableMockFallback = config.enableMockFallback !== false;
  }

  /**
   * Fetch tilbud from all sources with caching
   * @returns {Promise<Array>} Combined tilbud array
   */
  async getTilbud() {
    // Check cache first
    const cacheKey = 'tilbud_all';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000 / 60);
      console.log(`[CACHE] Returning cached tilbud`, { 
        count: cached.data.length,
        ageMinutes: cacheAge
      });
      return cached.data;
    }

    console.log('[INFO] Cache miss, fetching fresh tilbud data');

    let allTilbud = [];

    // Fetch from Salling API if enabled
    if (this.enableRealData) {
      try {
        const sallingTilbud = await this.sallingAdapter.getTilbud();
        allTilbud = allTilbud.concat(sallingTilbud);
        
        // Store successful API response as fallback
        cache.set('tilbud_last_success', {
          data: sallingTilbud,
          timestamp: Date.now()
        }, 86400); // Keep for 24 hours
      } catch (error) {
        console.error('[ERROR] Salling API failed, attempting fallback', {
          error: error.message
        });

        // Try to use last successful response
        const lastSuccess = cache.get('tilbud_last_success');
        if (lastSuccess) {
          const ageHours = Math.round((Date.now() - lastSuccess.timestamp) / 1000 / 60 / 60);
          console.log(`[FALLBACK] Using last successful API response`, {
            count: lastSuccess.data.length,
            ageHours
          });
          allTilbud = allTilbud.concat(lastSuccess.data);
        }
      }
    }

    // Add mock data if enabled
    if (this.enableMockFallback) {
      const mockTilbud = this.mockAdapter.getEnhancedMockData();
      allTilbud = allTilbud.concat(mockTilbud);
      console.log(`[INFO] Added ${mockTilbud.length} mock tilbud items`);
    }

    // If we have no data at all, something is seriously wrong
    if (allTilbud.length === 0) {
      console.error('[CRITICAL] No tilbud data available from any source!');
      throw new Error('Unable to retrieve tilbud data');
    }

    // Cache the combined result
    cache.set(cacheKey, {
      data: allTilbud,
      timestamp: Date.now()
    });

    console.log(`[SUCCESS] Returning ${allTilbud.length} total tilbud`, {
      realData: allTilbud.filter(t => t._source === 'salling-api').length,
      mockData: allTilbud.filter(t => t._source === 'mock-data').length
    });

    return allTilbud;
  }

  /**
   * Get tilbud by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getTilbudById(id) {
    const allTilbud = await this.getTilbud();
    return allTilbud.find(t => t.id === id) || null;
  }

  /**
   * Get unique list of stores
   * @returns {Promise<Array<string>>}
   */
  async getButikker() {
    const allTilbud = await this.getTilbud();
    const butikker = [...new Set(allTilbud.map(t => t.butik))];
    return butikker.sort();
  }

  /**
   * Get unique list of categories
   * @returns {Promise<Array<string>>}
   */
  async getKategorier() {
    const allTilbud = await this.getTilbud();
    const kategorier = [...new Set(allTilbud.map(t => t.kategori))];
    return kategorier.sort();
  }

  /**
   * Apply filters to tilbud array
   * @param {Array} tilbud
   * @param {Object} filters - { butik, kategori }
   * @returns {Array}
   */
  applyFilters(tilbud, filters = {}) {
    let filtered = [...tilbud];

    if (filters.butik) {
      filtered = filtered.filter(t => 
        t.butik.toLowerCase() === filters.butik.toLowerCase()
      );
    }

    if (filters.kategori) {
      filtered = filtered.filter(t => 
        t.kategori.toLowerCase() === filters.kategori.toLowerCase()
      );
    }

    return filtered;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   * Preserves fallback cache to maintain resilience
   */
  clearCache() {
    // Get all cache keys
    const keys = cache.keys();
    
    // Filter out fallback keys
    const regularKeys = keys.filter(key => !key.startsWith('tilbud_last_success'));
    
    // Delete only regular cache keys
    regularKeys.forEach(key => cache.del(key));
    
    console.log('[INFO] Cache cleared (fallback preserved)');
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return cache.getStats();
  }
}

module.exports = {
  TilbudDataService,
  SallingGroupAdapter,
  MockDataAdapter,
  inferCategory,
  normalizeBrand,
  cache
};
