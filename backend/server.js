const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Load tilbud data
const getTilbudData = () => {
  try {
    const dataPath = path.join(__dirname, 'data', 'tilbud.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error loading tilbud data:', error);
    return [];
  }
};

// GET /api/tilbud - Hent alle tilbud med filtrering
app.get('/api/tilbud', (req, res) => {
  try {
    let tilbud = getTilbudData();
    
    // Filtrer på butik
    const { butik, kategori } = req.query;
    
    if (butik) {
      tilbud = tilbud.filter(t => t.butik.toLowerCase() === butik.toLowerCase());
    }
    
    if (kategori) {
      tilbud = tilbud.filter(t => t.kategori.toLowerCase() === kategori.toLowerCase());
    }
    
    console.log(`[INFO] Returning ${tilbud.length} tilbud (butik: ${butik || 'all'}, kategori: ${kategori || 'all'})`);
    
    res.json({
      success: true,
      count: tilbud.length,
      data: tilbud
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
app.get('/api/tilbud/:id', (req, res) => {
  try {
    const tilbud = getTilbudData();
    const id = parseInt(req.params.id);
    const item = tilbud.find(t => t.id === id);
    
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
app.get('/api/butikker', (req, res) => {
  try {
    const tilbud = getTilbudData();
    const butikker = [...new Set(tilbud.map(t => t.butik))].sort();
    
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
app.get('/api/kategorier', (req, res) => {
  try {
    const tilbud = getTilbudData();
    const kategorier = [...new Set(tilbud.map(t => t.kategori))].sort();
    
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
