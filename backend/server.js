const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { TilbudDataService } = require('./services/tilbudDataService');

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

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

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

// Start server
app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════════╗`);
  console.log(`║  MadMatch Backend Server               ║`);
  console.log(`║  Port: ${PORT}                            ║`);
  console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}            ║`);
  console.log(`╚════════════════════════════════════════╝`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET  /api/tilbud`);
  console.log(`  GET  /api/tilbud/:id`);
  console.log(`  GET  /api/butikker`);
  console.log(`  GET  /api/kategorier`);
  console.log(`  GET  /health\n`);
});

module.exports = app;
