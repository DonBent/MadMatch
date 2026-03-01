# MadMatch Developer Guide - Epic 3.5

**Version:** 1.0.0  
**Last Updated:** 2026-03-01  
**Correlation ID:** ZHC-MadMatch-Epic3.5-DatabaseInfrastructure

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Recipe System Architecture](#recipe-system-architecture)
4. [How to Add a New Recipe Source](#how-to-add-a-new-recipe-source)
5. [How to Run the Arla Scraper](#how-to-run-the-arla-scraper)
6. [How to Seed the Database](#how-to-seed-the-database)
7. [How to Test Recipe Functionality](#how-to-test-recipe-functionality)
8. [Database Operations](#database-operations)
9. [API Development](#api-development)
10. [Frontend Integration](#frontend-integration)
11. [Testing Strategy](#testing-strategy)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js:** 18+ (check: `node --version`)
- **PostgreSQL:** 17.8+ (check: `psql --version`)
- **npm:** 8+ (check: `npm --version`)
- **Git:** Any recent version

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd madmatch-dev

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env:
# - DATABASE_URL=postgresql://user:password@localhost:5432/madmatch_dev
# - SPOONACULAR_API_KEY=your_key_here

# 4. Set up database
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed

# 5. Optional: Scrape Arla recipes
npm run scrape:arla -- --limit 100 --verbose

# 6. Start backend
npm start
# Backend: http://localhost:4001

# 7. Install frontend dependencies (new terminal)
cd ../frontend
npm install

# 8. Start frontend
npm start
# Frontend: http://localhost:3000
```

### Verify Setup

```bash
# Test backend health
curl http://localhost:4001/health
# Expected: {"status":"healthy","timestamp":"..."}

# Test recipe search
curl "http://localhost:4001/api/recipes/search?q=kylling&language=da"
# Expected: {"recipes":[...], "total":..., "limit":10}

# Test frontend
open http://localhost:3000
# Navigate to ProductDetailPage and verify recipes display
```

---

## Project Structure

```
madmatch-dev/
├── backend/
│   ├── data/                     # Mock JSON data (Epic 1-2)
│   ├── interfaces/
│   │   └── IRecipeSource.js      # Recipe source interface
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── migrations/           # Database migrations
│   │   └── seed.js               # Database seeding
│   ├── recipe-sources/
│   │   ├── DatabaseRecipeSource.js
│   │   ├── SpoonacularRecipeSource.js
│   │   └── *.test.js
│   ├── routes/
│   │   ├── recipes.js            # Recipe API endpoints
│   │   └── recipes.test.js
│   ├── scripts/
│   │   └── scrape-arla.js        # Arla scraper CLI
│   ├── services/
│   │   ├── recipeServiceNew.js   # Multi-source orchestrator
│   │   ├── databaseService.js
│   │   └── scraping/
│   │       └── ArlaScraper.js
│   ├── tests/
│   │   └── integration/
│   │       └── recipeService.integration.test.js
│   ├── server.js                 # Express server
│   ├── .env                      # Environment variables
│   ├── package.json
│   ├── API.md                    # API documentation
│   ├── DATABASE.md               # Database guide
│   ├── RECIPE_SOURCES.md         # Recipe sources guide
│   └── SCRAPING.md               # Scraping guide
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RecipeSuggestions.js
│   │   │   ├── RecipeSuggestions.css
│   │   │   ├── ProductDetailPage.js
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── recipeService.js  # API client
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── EPIC3.5_COMPLETE.md           # Epic summary
├── DEVELOPER_GUIDE.md            # This file
├── QA_TEST_PLAN_EPIC3.5.md       # QA testing checklist
└── README.md                     # Project overview
```

---

## Recipe System Architecture

### Overview

The recipe system is built on a **multi-source abstraction layer** that allows querying recipes from multiple providers (Database, Spoonacular, future sources) through a unified interface.

### Key Components

1. **IRecipeSource Interface** (`backend/interfaces/IRecipeSource.js`)
   - Defines the contract all recipe sources must implement
   - Methods: `getRecipe()`, `search()`, `getRecipesByIngredient()`, `getSourceInfo()`, `healthCheck()`

2. **Recipe Sources** (`backend/recipe-sources/`)
   - **DatabaseRecipeSource:** Queries PostgreSQL via Prisma
   - **SpoonacularRecipeSource:** Adapter for Spoonacular API
   - Future: Danish Crown, Coop, user-submitted recipes

3. **RecipeService Orchestrator** (`backend/services/recipeServiceNew.js`)
   - Coordinates multiple sources with priority-based fallback
   - In-memory caching (10-minute TTL)
   - Result deduplication
   - Health monitoring

4. **API Routes** (`backend/routes/recipes.js`)
   - 4 REST endpoints: search, by-id, by-ingredient, sources
   - Request validation and error handling

5. **Frontend Client** (`frontend/src/services/recipeService.js`)
   - API client for React components
   - Error handling and retry logic

### Data Flow

```
User → RecipeSuggestions → RecipeService (client) → API Endpoint → RecipeService (orchestrator)
                                                                            ↓
                                                     ┌──────────────────────┴────────────┐
                                                     ↓                                   ↓
                                          DatabaseRecipeSource              SpoonacularRecipeSource
                                                     ↓                                   ↓
                                               PostgreSQL                        Spoonacular API
```

---

## How to Add a New Recipe Source

### Step 1: Create Source Class

Create `backend/recipe-sources/NewRecipeSource.js`:

```javascript
const { IRecipeSource } = require('../interfaces/IRecipeSource');

/**
 * NewRecipeSource - Description of your source
 * 
 * Features:
 * - List key features
 * - Explain data source
 * - Note any limitations
 */
class NewRecipeSource extends IRecipeSource {
  constructor(options = {}) {
    super();
    this.sourceId = options.sourceId || 'new-source';
    this.sourceName = options.sourceName || 'New Source';
    this.priority = options.priority || 3;
    this.apiKey = options.apiKey || process.env.NEW_SOURCE_API_KEY;
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get a single recipe by ID
   * @param {string} id - Recipe identifier
   * @returns {Promise<Recipe|null>}
   */
  async getRecipe(id) {
    try {
      // Check cache
      const cached = this._getFromCache(`recipe:${id}`);
      if (cached) return cached;

      // Fetch from source (API, scraping, etc.)
      const rawRecipe = await this._fetchRecipe(id);
      if (!rawRecipe) return null;

      // Convert to standardized format
      const recipe = this._convertToStandardFormat(rawRecipe);

      // Cache result
      this._storeInCache(`recipe:${id}`, recipe);

      return recipe;
    } catch (error) {
      console.error(`[NewRecipeSource] Error fetching recipe ${id}:`, error.message);
      return null;
    }
  }

  /**
   * Search recipes by query string
   * @param {string} query - Search query
   * @param {RecipeFilters} filters - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async search(query, filters = {}) {
    try {
      const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) return cached;

      // Fetch results from source
      const rawResults = await this._searchRecipes(query, filters);

      // Convert to standardized format
      const recipes = rawResults.map(r => this._convertToStandardFormat(r));

      // Apply filters
      let filtered = recipes;
      if (filters.language) {
        filtered = filtered.filter(r => r.language === filters.language);
      }
      if (filters.difficulty) {
        filtered = filtered.filter(r => r.difficulty === filters.difficulty);
      }
      if (filters.maxTime) {
        filtered = filtered.filter(r => r.totalTimeMinutes <= filters.maxTime);
      }

      // Apply limit/offset
      const limit = filters.limit || 10;
      const offset = filters.offset || 0;
      const paginated = filtered.slice(offset, offset + limit);

      this._storeInCache(cacheKey, paginated);
      return paginated;
    } catch (error) {
      console.error(`[NewRecipeSource] Error searching:`, error.message);
      return [];
    }
  }

  /**
   * Get recipes containing a specific ingredient
   * @param {string} ingredient - Ingredient name
   * @param {RecipeFilters} filters - Optional filters
   * @returns {Promise<Recipe[]>}
   */
  async getRecipesByIngredient(ingredient, filters = {}) {
    try {
      const cacheKey = `ingredient:${ingredient}:${JSON.stringify(filters)}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) return cached;

      // Fetch results
      const rawResults = await this._searchByIngredient(ingredient, filters);

      // Convert and filter
      const recipes = rawResults.map(r => this._convertToStandardFormat(r));

      const limit = filters.limit || 10;
      const offset = filters.offset || 0;
      const paginated = recipes.slice(offset, offset + limit);

      this._storeInCache(cacheKey, paginated);
      return paginated;
    } catch (error) {
      console.error(`[NewRecipeSource] Error searching by ingredient:`, error.message);
      return [];
    }
  }

  /**
   * Get source metadata
   * @returns {RecipeSourceMetadata}
   */
  getSourceInfo() {
    return {
      id: this.sourceId,
      name: this.sourceName,
      priority: this.priority,
      enabled: true,
      cacheTTL: this.cacheTTL,
    };
  }

  /**
   * Health check
   * @returns {Promise<{healthy: boolean, message: string}>}
   */
  async healthCheck() {
    try {
      // Test connection to source
      // Example: ping API, check database connection, etc.
      const testResult = await this._testConnection();
      
      return {
        healthy: true,
        message: `New Source operational. ${testResult.count} recipes available.`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `New Source unavailable: ${error.message}`,
      };
    }
  }

  /**
   * Convert raw recipe to standardized format
   * @private
   */
  _convertToStandardFormat(rawRecipe) {
    return {
      id: rawRecipe.id || rawRecipe.externalId,
      title: rawRecipe.title || rawRecipe.name,
      description: rawRecipe.description || rawRecipe.summary,
      imageUrl: rawRecipe.image || rawRecipe.imageUrl,
      cookTimeMinutes: rawRecipe.cookTime || rawRecipe.cookingTime,
      prepTimeMinutes: rawRecipe.prepTime || rawRecipe.preparationTime,
      totalTimeMinutes: rawRecipe.totalTime || rawRecipe.readyInMinutes,
      servings: rawRecipe.servings || rawRecipe.yield,
      difficulty: this._inferDifficulty(rawRecipe),
      language: rawRecipe.language || 'en',
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      ingredients: this._extractIngredients(rawRecipe),
      instructions: this._extractInstructions(rawRecipe),
      url: rawRecipe.url || rawRecipe.sourceUrl,
    };
  }

  /**
   * Infer difficulty from recipe data
   * @private
   */
  _inferDifficulty(recipe) {
    const totalTime = recipe.totalTime || recipe.readyInMinutes || 0;
    const ingredientCount = recipe.ingredients?.length || 0;

    if (totalTime < 30 && ingredientCount < 10) return 'EASY';
    if (totalTime > 90 || ingredientCount > 20) return 'HARD';
    return 'MEDIUM';
  }

  /**
   * Extract ingredients from raw recipe
   * @private
   */
  _extractIngredients(rawRecipe) {
    const rawIngredients = rawRecipe.ingredients || rawRecipe.extendedIngredients || [];
    
    return rawIngredients.map((ing, index) => ({
      name: ing.name || ing.original || ing,
      quantity: ing.amount || ing.quantity || '',
      order: index + 1,
    }));
  }

  /**
   * Extract instructions from raw recipe
   * @private
   */
  _extractInstructions(rawRecipe) {
    if (rawRecipe.instructions) {
      return rawRecipe.instructions;
    }
    
    if (rawRecipe.analyzedInstructions) {
      return rawRecipe.analyzedInstructions
        .flatMap(section => section.steps || [])
        .map(step => step.step)
        .join('\n');
    }
    
    return '';
  }

  // Implement these methods based on your data source
  async _fetchRecipe(id) {
    // Fetch single recipe (API call, database query, scraping, etc.)
    throw new Error('_fetchRecipe not implemented');
  }

  async _searchRecipes(query, filters) {
    // Search recipes
    throw new Error('_searchRecipes not implemented');
  }

  async _searchByIngredient(ingredient, filters) {
    // Search by ingredient
    throw new Error('_searchByIngredient not implemented');
  }

  async _testConnection() {
    // Test source availability
    throw new Error('_testConnection not implemented');
  }

  // Cache helpers
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  _storeInCache(key, data) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = { NewRecipeSource };
```

### Step 2: Register Source

Edit `backend/services/recipeServiceNew.js`:

```javascript
const { NewRecipeSource } = require('../recipe-sources/NewRecipeSource');

_initializeDefaultSources() {
  // Database source (priority 1)
  this.sources.push(new DatabaseRecipeSource({ priority: 1 }));

  // Spoonacular source (priority 2)
  if (process.env.SPOONACULAR_API_KEY) {
    this.sources.push(new SpoonacularRecipeSource({ priority: 2 }));
  }

  // New source (priority 3)
  if (process.env.NEW_SOURCE_API_KEY) {
    this.sources.push(new NewRecipeSource({
      sourceId: 'new-source',
      sourceName: 'New Source',
      priority: 3,
    }));
  }
}
```

### Step 3: Write Tests

Create `backend/recipe-sources/NewRecipeSource.test.js`:

```javascript
const { NewRecipeSource } = require('./NewRecipeSource');

describe('NewRecipeSource', () => {
  let source;

  beforeEach(() => {
    source = new NewRecipeSource({
      sourceId: 'test-source',
      sourceName: 'Test Source',
      priority: 1,
    });
  });

  describe('getSourceInfo', () => {
    test('returns correct metadata', () => {
      const info = source.getSourceInfo();
      
      expect(info.id).toBe('test-source');
      expect(info.name).toBe('Test Source');
      expect(info.priority).toBe(1);
      expect(info.enabled).toBe(true);
    });
  });

  describe('getRecipe', () => {
    test('returns recipe in standardized format', async () => {
      // Mock _fetchRecipe
      source._fetchRecipe = jest.fn().mockResolvedValue({
        id: '123',
        title: 'Test Recipe',
        ingredients: ['ingredient 1', 'ingredient 2'],
      });

      const recipe = await source.getRecipe('123');
      
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('sourceId');
      expect(recipe).toHaveProperty('ingredients');
      expect(Array.isArray(recipe.ingredients)).toBe(true);
    });

    test('returns null for non-existent recipe', async () => {
      source._fetchRecipe = jest.fn().mockResolvedValue(null);

      const recipe = await source.getRecipe('non-existent');
      
      expect(recipe).toBeNull();
    });

    test('caches results', async () => {
      source._fetchRecipe = jest.fn().mockResolvedValue({
        id: '123',
        title: 'Test Recipe',
      });

      await source.getRecipe('123');
      await source.getRecipe('123'); // Second call

      // _fetchRecipe should only be called once (cache hit)
      expect(source._fetchRecipe).toHaveBeenCalledTimes(1);
    });
  });

  describe('search', () => {
    test('returns array of recipes', async () => {
      source._searchRecipes = jest.fn().mockResolvedValue([
        { id: '1', title: 'Recipe 1' },
        { id: '2', title: 'Recipe 2' },
      ]);

      const results = await source.search('test query');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    test('applies filters correctly', async () => {
      source._searchRecipes = jest.fn().mockResolvedValue([
        { id: '1', title: 'Recipe 1', totalTime: 20, difficulty: 'EASY' },
        { id: '2', title: 'Recipe 2', totalTime: 60, difficulty: 'HARD' },
      ]);

      const results = await source.search('test', {
        difficulty: 'EASY',
        maxTime: 30,
      });
      
      expect(results.length).toBe(1);
      expect(results[0].difficulty).toBe('EASY');
    });
  });

  describe('healthCheck', () => {
    test('returns healthy status when operational', async () => {
      source._testConnection = jest.fn().mockResolvedValue({ count: 100 });

      const health = await source.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.message).toContain('operational');
    });

    test('returns unhealthy status on failure', async () => {
      source._testConnection = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const health = await source.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.message).toContain('unavailable');
    });
  });
});
```

### Step 4: Update Documentation

Add your source to `backend/RECIPE_SOURCES.md`:

```markdown
### 4. NewRecipeSource

**Location:** `backend/recipe-sources/NewRecipeSource.js`

**Description:** [Describe your source]

**Features:**
- [Feature 1]
- [Feature 2]

**Example Usage:**

\`\`\`javascript
const { NewRecipeSource } = require('./recipe-sources/NewRecipeSource');

const source = new NewRecipeSource({
  apiKey: process.env.NEW_SOURCE_API_KEY,
  priority: 3,
});

const recipes = await source.search('chicken', { limit: 10 });
\`\`\`
```

---

## How to Run the Arla Scraper

### Basic Usage

```bash
cd backend

# Scrape 100 recipes (good for testing)
npm run scrape:arla -- --limit 100 --verbose

# Scrape 1000 recipes (production)
npm run scrape:arla -- --limit 1000

# Dry run (test without database writes)
npm run scrape:arla -- --limit 10 --dry-run --verbose

# Very polite scraping (5 second delay)
npm run scrape:arla -- --limit 500 --rate-limit 5000
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Max recipes to scrape | 1000 |
| `--dry-run` | Parse without database writes | false |
| `--verbose` | Detailed logging | false |
| `--rate-limit <ms>` | Delay between requests | 2000 |

### Monitor Progress

```bash
# Watch scraper logs (errors only)
tail -f logs/scraper-errors-$(date +%Y-%m-%d).log

# Check scraping jobs in database
psql $DATABASE_URL -c "SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 5;"

# Count scraped recipes
psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes WHERE source_id = (SELECT id FROM recipe_sources WHERE name = 'Arla');"
```

### Troubleshooting

**Issue: ECONNREFUSED**

```bash
# Test connectivity
curl https://www.arla.dk

# Increase rate limit
npm run scrape:arla -- --rate-limit 5000 --limit 100
```

**Issue: Missing required fields**

```bash
# Run dry run to see parsing details
npm run scrape:arla -- --limit 5 --dry-run --verbose

# Inspect failed URL in browser
# Update selectors in services/scraping/ArlaScraper.js
```

**Issue: Duplicate slug errors**

```bash
# Clear Arla recipes and re-scrape
psql $DATABASE_URL -c "DELETE FROM recipes WHERE source_id = (SELECT id FROM recipe_sources WHERE name = 'Arla');"
npm run scrape:arla -- --limit 1000
```

---

## How to Seed the Database

### Run Seed Script

```bash
cd backend

# Seed database (creates recipe sources)
npm run seed

# Verify
psql $DATABASE_URL -c "SELECT * FROM recipe_sources;"
```

### Reset Database (WARNING: Deletes all data)

```bash
# Reset and re-seed
npm run prisma:migrate:reset

# Confirm when prompted, then:
npm run seed

# Re-scrape recipes
npm run scrape:arla -- --limit 1000
```

### Custom Seeding

Edit `backend/prisma/seed.js` to add custom data:

```javascript
async function main() {
  // Create recipe sources
  const arla = await prisma.recipeSource.create({
    data: {
      name: 'Arla',
      url: 'https://www.arla.dk',
      scrapingEnabled: true,
      language: 'da',
    },
  });

  // Add custom test recipes
  await prisma.recipe.create({
    data: {
      sourceId: arla.id,
      title: 'Test Recipe',
      slug: 'test-recipe',
      language: 'da',
      difficulty: 'EASY',
      ingredients: {
        create: [
          { name: 'ingredient 1', quantity: '100 g', order: 1 },
        ],
      },
    },
  });

  console.log('Seed complete!');
}
```

---

## How to Test Recipe Functionality

### Unit Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- recipeServiceNew.test.js

# Run tests with coverage
npm test -- --coverage

# Run in watch mode (re-run on file changes)
npm test -- --watch
```

### Integration Tests

```bash
# Run integration tests (requires database)
npm run test:integration

# Or run specific integration test
npm test -- tests/integration/recipeService.integration.test.js
```

### Manual API Testing

```bash
# Start backend
npm start

# Test endpoints
curl "http://localhost:4001/api/recipes/search?q=kylling&language=da&limit=5"
curl "http://localhost:4001/api/recipes/by-ingredient?ingredient=hakket%20oksekød"
curl "http://localhost:4001/api/recipes/sources"

# Test specific recipe (replace ID)
curl "http://localhost:4001/api/recipes/550e8400-e29b-41d4-a716-446655440000"
```

### Frontend Testing

```bash
cd frontend

# Run all frontend tests
npm test

# Run with coverage
npm test -- --coverage

# Test RecipeService client
npm test -- recipeService.test.js
```

---

## Database Operations

### Prisma Studio (GUI)

```bash
cd backend
npm run prisma:studio
# Opens browser at http://localhost:5555
```

### Common SQL Queries

```bash
# Count recipes by source
psql $DATABASE_URL -c "
  SELECT rs.name, COUNT(r.id) as count 
  FROM recipes r 
  JOIN recipe_sources rs ON r.source_id = rs.id 
  GROUP BY rs.name;
"

# Find recipes with specific ingredient
psql $DATABASE_URL -c "
  SELECT r.title, ri.name as ingredient
  FROM recipes r
  JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  WHERE ri.name ILIKE '%kylling%'
  LIMIT 10;
"

# Check database size
psql $DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size(current_database()));
"

# List indexes
psql $DATABASE_URL -c "
  SELECT indexname, tablename 
  FROM pg_indexes 
  WHERE schemaname = 'public';
"
```

### Backup & Restore

```bash
# Backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20260301.sql

# Backup specific tables only
pg_dump $DATABASE_URL -t recipes -t recipe_ingredients > recipes-backup.sql
```

---

## API Development

### Adding a New Endpoint

1. **Add route handler** in `backend/routes/recipes.js`:

```javascript
router.get('/my-endpoint', async (req, res) => {
  const correlationId = getCorrelationId(req);
  
  try {
    // Validate request
    if (!req.query.param) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required parameter: param',
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    // Call service
    const results = await recipeService.myMethod(req.query.param);

    // Format response
    res.json({
      results,
      correlationId,
    });
  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
});
```

2. **Add tests** in `backend/routes/recipes.test.js`:

```javascript
describe('GET /api/recipes/my-endpoint', () => {
  test('returns results for valid request', async () => {
    const response = await request(app)
      .get('/api/recipes/my-endpoint')
      .query({ param: 'test' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('results');
  });

  test('returns 400 for missing parameter', async () => {
    const response = await request(app)
      .get('/api/recipes/my-endpoint');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
  });
});
```

3. **Update API documentation** in `backend/API.md`.

### Testing with Postman

Import this collection:

```json
{
  "info": { "name": "MadMatch Recipe API" },
  "item": [
    {
      "name": "Search Recipes",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/recipes/search?q=kylling&language=da&limit=5"
      }
    }
  ],
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:4001" }
  ]
}
```

---

## Frontend Integration

### Using RecipeService Client

```jsx
import { RecipeService } from '../services/recipeService';

function MyComponent() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRecipes() {
      setLoading(true);
      setError(null);

      try {
        const data = await RecipeService.searchRecipes('kylling', {
          language: 'da',
          limit: 10,
        });

        setRecipes(data.recipes);
      } catch (err) {
        setError('Failed to load recipes');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadRecipes();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {recipes.map(recipe => (
        <div key={recipe.id}>
          <h3>{recipe.title}</h3>
          <span className={`badge badge-${recipe.source.name.toLowerCase()}`}>
            {recipe.source.name}
          </span>
          {recipe.language === 'da' && <span>🇩🇰</span>}
        </div>
      ))}
    </div>
  );
}
```

### Displaying Source Badges

```css
/* RecipeSuggestions.css */
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-arla {
  background-color: #e6f4ea;
  color: #1e7e34;
}

.badge-spoonacular {
  background-color: #e3f2fd;
  color: #0d47a1;
}
```

---

## Testing Strategy

### Test Pyramid

```
        E2E Tests (10%)
       ┌─────────────┐
       │ API + DB    │
       └─────────────┘
    Integration Tests (30%)
   ┌───────────────────────┐
   │ Multi-component tests │
   └───────────────────────┘
       Unit Tests (60%)
  ┌──────────────────────────┐
  │ Individual functions/    │
  │ classes                  │
  └──────────────────────────┘
```

### What to Test

**Unit Tests:**
- Individual methods (search, getRecipe, etc.)
- Data transformations (convertToStandardFormat)
- Utility functions (slug generation, time parsing)
- Input validation

**Integration Tests:**
- Database queries with real PostgreSQL
- Multi-source fallback logic
- Caching behavior
- API endpoints with request/response

**E2E Tests:**
- Complete user workflows
- Frontend + Backend integration
- Error scenarios

### Running Tests

```bash
# All tests
npm test

# Only changed files
npm test -- --onlyChanged

# Update snapshots
npm test -- --updateSnapshot

# Coverage report
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## Troubleshooting

### "Cannot find module '@prisma/client'"

```bash
cd backend
npm run prisma:generate
```

### "Database connection failed"

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### "Tests timing out"

```bash
# Increase Jest timeout
npm test -- --testTimeout=10000

# Or in test file:
jest.setTimeout(10000);
```

### "Port 4001 already in use"

```bash
# Find process
lsof -ti:4001

# Kill process
kill -9 $(lsof -ti:4001)
```

### "Prisma migration failed"

```bash
# Reset database (WARNING: deletes data)
npm run prisma:migrate:reset

# Or manually fix:
psql $DATABASE_URL
DROP TABLE problematic_table CASCADE;
\q
npm run prisma:migrate:deploy
```

---

## Additional Resources

- **Prisma Documentation:** https://www.prisma.io/docs
- **Express Guide:** https://expressjs.com/en/guide/routing.html
- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **PostgreSQL Manual:** https://www.postgresql.org/docs/

---

**Questions?** Check `EPIC3.5_COMPLETE.md` or ask ZHC Developer.
