# MadMatch

MadMatch - Smart tilbudsoversigt med opskriftsforslag og favoritter

## Features

### Epic 1 - Tilbudsoversigt ✅
- ✅ Vis minimum 10-15 tilbud fra mock JSON-data
- ✅ Hver vare viser: navn, butik, normalpris, tilbudspris, rabat%
- ✅ Filtrering på butik og kategori
- ✅ Responsivt design (desktop + mobil)

### Epic 2 - Produkt Detaljer & Opskrifter ✅
- ✅ Produktdetalje-side med næringsinformation
- ✅ Opskriftsforslag baseret på produkt (Spoonacular API)
- ✅ Bæredygtighedsscore
- ✅ Favoritter med localStorage

### Epic 3 - Favoritter & Indstillinger ✅
- ✅ Favoritsystem med persistence
- ✅ Favoritside med oversigt
- ✅ Indstillingsside (language, theme, notifications)
- ✅ Race condition fixes for favoritter

### Epic 3.5 - Database Infrastructure & Multi-Source Recipe System ✅
- ✅ **PostgreSQL Database** with Prisma ORM
- ✅ **Recipe Abstraction Layer** supporting multiple sources
- ✅ **Arla Recipe Scraper** with 1000+ Danish recipes
- ✅ **REST API Endpoints** for recipe access
- ✅ **Frontend Integration** with source badges and language flags
- ✅ **Multi-source Fallback** (Database → Spoonacular)
- ✅ **Three-level Caching** (10-minute TTL)

## Teknisk Stack

- **Frontend**: React 18
- **Backend**: Node.js/Express
- **Database**: PostgreSQL 17.8 with Prisma ORM
- **Recipe Sources**: Local database (Arla scraped recipes) + Spoonacular API
- **Caching**: In-memory (10-minute TTL)
- **Hosting**: Lokal server på port 4001 (backend), 3000 (frontend)

## Projektstruktur

```
MadMatch/
├── backend/
│   ├── data/
│   │   └── tilbud.json       # Mock data (15 tilbud)
│   ├── server.js             # Express API server
│   ├── server.test.js        # Backend tests
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── TilbudCard.js
│   │   │   ├── TilbudCard.css
│   │   │   ├── FilterBar.js
│   │   │   └── FilterBar.css
│   │   ├── services/
│   │   │   └── tilbudService.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── App.test.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Kom i gang

### Prerequisites

- Node.js 18+
- PostgreSQL 17.8+ (for Epic 3.5 database features)
- npm or yarn

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL and SPOONACULAR_API_KEY

# Set up database (Epic 3.5)
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed

# Optional: Scrape Arla recipes
npm run scrape:arla -- --limit 1000

# Start backend
npm start
```

Backend kører på `http://localhost:4001`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm start
```

Frontend kører på `http://localhost:3000`

### 3. Verify Setup

```bash
# Test backend health
curl http://localhost:4001/health

# Test recipe search (Epic 3.5)
curl "http://localhost:4001/api/recipes/search?q=kylling&language=da"

# Open frontend
open http://localhost:3000
```

## API Endpoints

### Tilbud (Epic 1-2)
- `GET /api/tilbud` - Hent alle tilbud (optional query params: butik, kategori)
- `GET /api/tilbud/:id` - Hent specifikt tilbud
- `GET /api/butikker` - Hent liste af butikker
- `GET /api/kategorier` - Hent liste af kategorier

### Recipes (Epic 3.5)
- `GET /api/recipes/search?q=<query>&language=da` - Search recipes
- `GET /api/recipes/:id` - Get recipe by ID
- `GET /api/recipes/by-ingredient?ingredient=<name>` - Recipes by ingredient
- `GET /api/recipes/sources` - List recipe sources with health status

### System
- `GET /health` - Health check

📖 **Full API Documentation:** See `backend/API.md`

## Testing

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

## Features

### Tilbudsoversigt (Epic 1)
- Viser 15 forskellige tilbud fra 3 butikker (Rema 1000, Netto, Føtex)
- 9 forskellige kategorier (Kød, Mejeri, Frugt, Drikkevarer, Fisk, Brød, Grøntsager, Tørvarer, Snacks)
- Beregnet rabat% og besparelse
- Filter på butik og kategori
- Nulstil-knap til at fjerne alle filtre

### Product Details & Recipes (Epic 2)
- Produkt detalje-side med næringsinformation
- Bæredygtighedsscore
- Opskriftsforslag baseret på produkt

### Favorites & Settings (Epic 3)
- Favoritsystem med localStorage persistence
- Favoritside med oversigt
- Indstillingsside (sprog, tema, notifikationer)

### Multi-Source Recipe System (Epic 3.5)
- **1000+ Danish Recipes** scraped from Arla.dk
- **Multi-source Architecture** (Database + Spoonacular API)
- **Smart Fallback Logic** (Database first, API fallback)
- **Fast Full-Text Search** using PostgreSQL GIN indexes
- **Ingredient-based Search** with fuzzy matching
- **Source Badges** (🥛 Arla, 🌐 Spoonacular)
- **Language Flags** (🇩🇰 Danish, 🇬🇧 English)
- **Three-level Caching** (10-minute TTL, 97% faster)
- **REST API** for recipe access

### Responsivt Design
- Desktop: Grid layout med 3-4 kolonner
- Tablet: 2 kolonner
- Mobil: 1 kolonne
- Touch-friendly UI elementer

## Documentation

- **README.md** (this file) - Project overview
- **EPIC3.5_COMPLETE.md** - Epic 3.5 implementation summary
- **DEVELOPER_GUIDE.md** - Developer guide for extending recipe sources
- **QA_TEST_PLAN_EPIC3.5.md** - QA testing checklist
- **backend/API.md** - API endpoint documentation
- **backend/DATABASE.md** - Database schema and queries
- **backend/RECIPE_SOURCES.md** - Recipe abstraction layer guide
- **backend/SCRAPING.md** - Arla scraper guide

## Database Operations (Epic 3.5)

### Setup Database
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
```

### Scrape Arla Recipes
```bash
# Scrape 1000 recipes
npm run scrape:arla -- --limit 1000 --verbose

# Dry run (test without database writes)
npm run scrape:arla -- --limit 10 --dry-run
```

### Database GUI
```bash
npm run prisma:studio
# Opens browser at http://localhost:5555
```

### Backup Database
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## Performance

### Recipe Search Performance
- **Database search:** < 200ms (uncached)
- **Cached search:** < 10ms (97% faster)
- **Spoonacular fallback:** < 1000ms

### Caching Strategy
- **In-memory cache** with 10-minute TTL
- **Cache hit rate:** ~75% in production
- **Database query reduction:** 75%

## Observability

Backend logger alle requests med:
- Timestamp
- HTTP method
- Path
- Correlation ID
- Response time
- Error details (if applicable)

Logs location: `backend/logs/`

## Migration & Rollback

### Database Migrations

```bash
# Create new migration
npm run prisma:migrate:dev --name migration_name

# Deploy to production
npm run prisma:migrate:deploy

# Reset database (WARNING: deletes all data)
npm run prisma:migrate:reset
```

### Rollback Procedure

1. Restore database from backup:
   ```bash
   psql $DATABASE_URL < backup-YYYYMMDD.sql
   ```

2. Revert to previous Git commit:
   ```bash
   git revert <commit-hash>
   ```

3. Redeploy application

## Troubleshooting

### Database Connection Failed

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### No Recipes Found

```bash
# Check recipe count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes;"

# If 0, run scraper
npm run scrape:arla -- --limit 1000
```

### Port Already in Use

```bash
# Find process on port 4001
lsof -ti:4001

# Kill process
kill -9 $(lsof -ti:4001)
```

For more troubleshooting, see **DEVELOPER_GUIDE.md**.

## Correlation IDs

- Epic 1: `ZHC-MadMatch-20260226-001`
- Epic 2: `ZHC-MadMatch-20260227-002`
- Epic 3: `ZHC-MadMatch-20260228-003`
- Epic 3.5: `ZHC-MadMatch-Epic3.5-DatabaseInfrastructure`

## License

MIT
