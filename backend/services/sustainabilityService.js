const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

/**
 * SustainabilityService
 * 
 * Provides sustainability and environmental data for products.
 * Data sources:
 * 1. Manual sustainability data from JSON file (primary)
 * 2. Open Food Facts Eco-Score (supplemental fallback)
 * 
 * Data fields:
 * - ecoScore: A-E grade or null
 * - carbonFootprint: kg CO2e or null
 * - organic: boolean
 * - fairTrade: boolean
 * - local: boolean
 * - packagingRecyclable: boolean
 */
class SustainabilityService {
  constructor(options = {}) {
    this.dataFilePath = options.dataFilePath || path.join(__dirname, '../data/sustainability.json');
    this.openFoodFactsBaseUrl = options.openFoodFactsBaseUrl || 'https://world.openfoodfacts.org';
    this.userAgent = options.userAgent || 'MadMatch/1.4.0 (contact@madmatch.dk)';
    this.sustainabilityData = null;
    this.cacheTimeout = options.cacheTimeout || 3600000; // 1 hour in ms
  }

  /**
   * Initialize the service by loading manual sustainability data
   */
  async initialize() {
    try {
      await this.loadSustainabilityData();
      console.log('[INFO] SustainabilityService initialized successfully');
    } catch (error) {
      console.error('[ERROR] SustainabilityService initialization failed:', error);
      // Initialize with empty data to allow service to function
      this.sustainabilityData = {};
    }
  }

  /**
   * Load manual sustainability data from JSON file
   */
  async loadSustainabilityData() {
    try {
      const fileContent = await fs.readFile(this.dataFilePath, 'utf8');
      this.sustainabilityData = JSON.parse(fileContent);
      console.log(`[INFO] Loaded sustainability data for ${Object.keys(this.sustainabilityData).length} products`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('[WARN] Sustainability data file not found, initializing with empty data');
        this.sustainabilityData = {};
      } else {
        throw error;
      }
    }
  }

  /**
   * Get sustainability data for a product by ID
   * 
   * @param {string} productId - Product ID
   * @param {string} productName - Product name (for Open Food Facts fallback)
   * @returns {Object|null} Sustainability data or null if unavailable
   */
  async getSustainabilityData(productId, productName = '') {
    try {
      // First, check manual data
      const manualData = this.getManualData(productId);
      
      if (manualData) {
        console.log(`[INFO] Found manual sustainability data for product ${productId}`);
        return {
          ...manualData,
          source: 'manual',
          lastUpdated: new Date().toISOString()
        };
      }

      // If no manual data, try Open Food Facts as fallback
      console.log(`[INFO] No manual data for product ${productId}, trying Open Food Facts fallback`);
      const openFoodFactsData = await this.getOpenFoodFactsEcoScore(productName);
      
      if (openFoodFactsData) {
        console.log(`[INFO] Found Open Food Facts eco-score for product ${productId}`);
        return {
          ...openFoodFactsData,
          source: 'openfoodfacts',
          lastUpdated: new Date().toISOString()
        };
      }

      console.log(`[INFO] No sustainability data available for product ${productId}`);
      return null;
    } catch (error) {
      console.error(`[ERROR] Failed to get sustainability data for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Get manual sustainability data from loaded JSON
   * 
   * @param {string} productId - Product ID
   * @returns {Object|null} Manual data or null
   */
  getManualData(productId) {
    if (!this.sustainabilityData) {
      return null;
    }
    return this.sustainabilityData[productId] || null;
  }

  /**
   * Query Open Food Facts API for eco-score
   * This is a supplemental data source when manual data is unavailable
   * 
   * @param {string} productName - Product name to search
   * @returns {Object|null} Eco-score data or null
   */
  async getOpenFoodFactsEcoScore(productName) {
    if (!productName || productName.trim() === '') {
      return null;
    }

    try {
      // Search Open Food Facts by product name
      const searchUrl = `${this.openFoodFactsBaseUrl}/cgi/search.pl`;
      const response = await axios.get(searchUrl, {
        params: {
          search_terms: productName,
          search_simple: 1,
          json: 1,
          page_size: 1,
          fields: 'product_name,ecoscore_grade,ecoscore_score,nutrient_levels,labels_tags'
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 5000
      });

      if (!response.data || !response.data.products || response.data.products.length === 0) {
        return null;
      }

      const product = response.data.products[0];
      
      // Extract eco-score if available
      const ecoScore = product.ecoscore_grade ? product.ecoscore_grade.toUpperCase() : null;
      
      if (!ecoScore) {
        return null;
      }

      // Check for organic/bio labels
      const isOrganic = product.labels_tags ? 
        product.labels_tags.some(tag => 
          tag.includes('organic') || 
          tag.includes('bio') || 
          tag.includes('eu-organic')
        ) : false;

      return {
        ecoScore: ecoScore,
        carbonFootprint: null, // Not available in Open Food Facts free API
        organic: isOrganic,
        fairTrade: false,
        local: false,
        packagingRecyclable: null
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.warn('[WARN] Open Food Facts API timeout');
      } else if (error.response && error.response.status === 429) {
        console.warn('[WARN] Open Food Facts API rate limit exceeded');
      } else {
        console.error('[ERROR] Open Food Facts API error:', error.message);
      }
      return null;
    }
  }

  /**
   * Reload sustainability data from file
   * Useful for updating data without restarting the server
   */
  async reload() {
    try {
      await this.loadSustainabilityData();
      console.log('[INFO] Sustainability data reloaded successfully');
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to reload sustainability data:', error);
      return false;
    }
  }
}

module.exports = { SustainabilityService };
