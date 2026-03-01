const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { TilbudDataService } = require('./services/tilbudDataService');
const { NutritionService } = require('./services/nutritionService');
const { RecipeService: RecipeServiceOld } = require('./services/recipeService');
const { RecipeService } = require('./services/recipeServiceNew'); // Epic 3.5: New multi-source service
const { SustainabilityService } = require('./services/sustainabilityService');
const { initializeRecipeRoutes } = require('./routes/recipes'); // Epic 3.5: Recipe API routes

const app = express();
const PORT = process.env.PORT || 4001;

// Initialize Tilbud Data Service
const tilbudService = new TilbudDataService({
  sallingApiKey: process.env.SALLING_API_KEY,
  sallingBaseUrl: process.env.SALLING_API_BASE_URL,
  sallingZipCode: process.env.SALLING_ZIP_CODE || '8000',
  enableRealData: process.env.ENABLE_REAL_DATA !== 'false',
  enableMockFallback: process.env.ENABLE_MOCK_FALLBACK !== 'false'
});

// Initialize Nutrition Service
const nutritionService = new NutritionService();
nutritionService.initialize().catch(err => {
  console.error('[ERROR] Failed to initialize NutritionService:', err);
});

// Initialize Recipe Service (New multi-source version - Epic 3.5)
const recipeService = new RecipeService({
  cacheTTL: 10 * 60 * 1000, // 10 minutes
  fallbackStrategy: 'priority',
  minResultsBeforeFallback: 3
});

// Initialize old RecipeService for backward compatibility (Epic 2)
const recipeServiceOld = new RecipeServiceOld();
recipeServiceOld.initialize().catch(err => {
  console.error('[ERROR] Failed to initialize legacy RecipeService:', err);
});

// Initialize Sustainability Service
const sustainabilityService = new SustainabilityService();
sustainabilityService.initialize().catch(err => {
  console.error('[ERROR] Failed to initialize SustainabilityService:', err);
});

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Epic 3.5: Mount recipe API routes
app.use('/api/recipes', initializeRecipeRoutes(recipeService));

// GET /api/tilbud - Hent alle tilbud med filtrering
app.get('/api/tilbud', async (req, res) => {
  try {
    const allTilbud = await tilbudService.getTilbud();
    
    // Filtrer på butik og kategori
    const { butik, kategori } = req.query;
    const filtered = tilbudService.applyFilters(allTilbud, { butik, kategori });
    
    console.log(`[INFO] Returning ${filtered.length} tilbud (butik: ${butik || 'all'}, kategori: ${kategori || 'all'})`);
    
    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch tilbud:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/tilbud/:id - Hent enkelt tilbud
app.get('/api/tilbud/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const item = await tilbudService.getTilbudById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Tilbud ikke fundet'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch tilbud by id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/butikker - Hent liste af butikker
app.get('/api/butikker', async (req, res) => {
  try {
    const butikker = await tilbudService.getButikker();
    
    res.json({
      success: true,
      data: butikker
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch butikker:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/kategorier - Hent liste af kategorier
app.get('/api/kategorier', async (req, res) => {
  try {
    const kategorier = await tilbudService.getKategorier();
    
    res.json({
      success: true,
      data: kategorier
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch kategorier:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/produkt/:id/nutrition - Hent næringsindhold fra Open Food Facts
app.get('/api/produkt/:id/nutrition', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // First, get the product to extract its name
    const product = await tilbudService.getTilbudById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produkt ikke fundet'
      });
    }
    
    // Fetch nutrition data using product name
    const nutritionData = await nutritionService.getNutritionData(
      product.navn,
      id.toString()
    );
    
    if (!nutritionData) {
      return res.json({
        success: true,
        data: null,
        message: 'Næringsdata ikke tilgængelig for dette produkt'
      });
    }
    
    res.json({
      success: true,
      data: nutritionData
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch nutrition data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/produkt/:id/recipes - Hent opskriftsforslag (Epic 2 backward compatibility)
// Epic 3.5: Now uses RecipeServiceNew with database + Spoonacular fallback
app.get('/api/produkt/:id/recipes', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // First, get the product to extract its name
    const product = await tilbudService.getTilbudById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produkt ikke fundet'
      });
    }
    
    // Epic 3.5: Use new RecipeService (searches database first, Spoonacular fallback)
    // Backward compatible - getRecipes() maps to getRecipesByIngredient()
    const recipes = await recipeService.getRecipesByIngredient(product.navn, { limit: 3 });
    
    res.json({
      success: true,
      count: recipes.length,
      data: recipes
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/produkt/:id/sustainability - Hent bæredygtighedsdata
app.get('/api/produkt/:id/sustainability', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // First, get the product to extract its name
    const product = await tilbudService.getTilbudById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produkt ikke fundet'
      });
    }
    
    // Fetch sustainability data using product ID and name
    const sustainabilityData = await sustainabilityService.getSustainabilityData(
      id.toString(),
      product.navn
    );
    
    // Transform to frontend-expected format
    const transformedData = sustainabilityData ? {
      ecoScore: sustainabilityData.ecoScore,
      carbonFootprint: sustainabilityData.carbonFootprint,
      certifications: {
        organic: sustainabilityData.organic,
        fairTrade: sustainabilityData.fairTrade,
        local: sustainabilityData.local,
        recyclablePackaging: sustainabilityData.packagingRecyclable
      },
      dataSource: sustainabilityData.source,
      lastUpdated: sustainabilityData.lastUpdated
    } : null;
    
    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch sustainability data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server (only when not in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`╔════════════════════════════════════════╗`);
    console.log(`║  MadMatch Backend Server               ║`);
    console.log(`║  Port: ${PORT}                            ║`);
    console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}            ║`);
    console.log(`╚════════════════════════════════════════╝`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET  /api/tilbud`);
    console.log(`  GET  /api/tilbud/:id`);
    console.log(`  GET  /api/produkt/:id/nutrition`);
    console.log(`  GET  /api/produkt/:id/recipes (Epic 2 + Epic 3.5)`);
    console.log(`  GET  /api/produkt/:id/sustainability`);
    console.log(`  GET  /api/butikker`);
    console.log(`  GET  /api/kategorier`);
    console.log(`  GET  /health`);
    console.log(`\n  Epic 3.5 Recipe API:`);
    console.log(`  GET  /api/recipes/search?q=<query>`);
    console.log(`  GET  /api/recipes/:id`);
    console.log(`  GET  /api/recipes/by-ingredient?ingredient=<name>`);
    console.log(`  GET  /api/recipes/sources\n`);
  });
}

module.exports = app;
