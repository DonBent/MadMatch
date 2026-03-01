# MadMatch Database Documentation

**Epic:** 3.5 - Database Infrastructure & Recipe Source System  
**Correlation ID:** ZHC-MadMatch-20260301-004  
**Created:** 2026-03-01  
**Version:** 1.0.0

---

## Overview

MadMatch uses PostgreSQL 17+ for persistent recipe storage, enabling Danish recipe content and reducing dependency on the Spoonacular API quota. This document covers database setup, schema, and usage.

## Database Architecture

### Technology Stack

- **Database:** PostgreSQL 17.8
- **ORM:** Prisma 7.4.2
- **Adapter:** @prisma/adapter-pg with pg connection pool
- **Connection Pooling:** Max 10 connections

### Tables

#### 1. `recipe_sources`

Stores metadata about recipe data sources (Arla, Spoonacular, future sources).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID |
| `name` | VARCHAR(255) | UNIQUE, NOT NULL | Source name (e.g., "Arla") |
| `base_url` | VARCHAR(500) | NULLABLE | Base URL for scraping |
| `scraping_enabled` | BOOLEAN | NOT NULL, DEFAULT true | Whether source is actively scraped |
| `priority` | INTEGER | NOT NULL, DEFAULT 1 | Lower number = higher priority in search fallback |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_recipe_sources_priority` on `priority`

**Seed Data:**
- Arla (priority 1, scraping enabled)
- Spoonacular (priority 2, scraping disabled - API-based)

---

#### 2. `recipes`

Core recipe data from all sources.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID |
| `source_id` | UUID | FOREIGN KEY → recipe_sources.id, NOT NULL | Reference to source |
| `external_id` | VARCHAR(255) | NULLABLE | Original ID from source (e.g., Spoonacular recipe ID) |
| `title` | VARCHAR(255) | NOT NULL | Recipe title |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL | URL-safe identifier |
| `description` | TEXT | NULLABLE | Recipe description/summary |
| `image_url` | VARCHAR(500) | NULLABLE | Recipe image URL |
| `prep_time_minutes` | INTEGER | NULLABLE, CHECK >= 0 | Preparation time |
| `cook_time_minutes` | INTEGER | NULLABLE, CHECK >= 0 | Cooking time |
| `total_time_minutes` | INTEGER | NULLABLE, CHECK >= 0 | Total time |
| `servings` | INTEGER | NULLABLE, CHECK > 0 | Number of servings |
| `difficulty` | ENUM | NULLABLE (EASY, MEDIUM, HARD) | Recipe difficulty |
| `instructions` | TEXT | NULLABLE | Step-by-step cooking instructions |
| `language` | VARCHAR(2) | NOT NULL, DEFAULT 'da' | ISO 639-1 language code |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_recipes_source_id` on `source_id`
- `idx_recipes_slug` on `slug` (unique)
- `idx_recipes_language` on `language`
- `idx_recipes_difficulty` on `difficulty`
- `idx_recipes_language_source` on `(language, source_id)` (composite)
- `idx_recipes_title_fts` on `to_tsvector('danish', title)` (GIN index for full-text search)

**Foreign Keys:**
- `source_id` → `recipe_sources.id` (ON DELETE RESTRICT)

---

#### 3. `recipe_ingredients`

Ingredients for each recipe.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID |
| `recipe_id` | UUID | FOREIGN KEY → recipes.id, NOT NULL | Recipe reference |
| `ingredient_name` | VARCHAR(255) | NOT NULL | Ingredient name (e.g., "hakket oksekød") |
| `quantity` | VARCHAR(100) | NULLABLE | Quantity (e.g., "500 g", "2 stk") |
| `order` | INTEGER | NOT NULL | Display order (1-based) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |

**Indexes:**
- `idx_recipe_ingredients_recipe_id` on `recipe_id`
- `idx_recipe_ingredients_recipe_order` on `(recipe_id, order)` (composite)
- `idx_recipe_ingredients_name_fts` on `to_tsvector('danish', ingredient_name)` (GIN index)

**Foreign Keys:**
- `recipe_id` → `recipes.id` (ON DELETE CASCADE)

---

#### 4. `scraping_jobs`

Audit log for scraping operations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID |
| `source_id` | UUID | FOREIGN KEY → recipe_sources.id, NOT NULL | Source being scraped |
| `status` | ENUM | NOT NULL, DEFAULT 'PENDING' | PENDING, RUNNING, COMPLETED, FAILED |
| `started_at` | TIMESTAMP | NULLABLE | Scraping start time |
| `completed_at` | TIMESTAMP | NULLABLE | Scraping completion time |
| `recipes_scraped` | INTEGER | NOT NULL, DEFAULT 0 | Total recipes successfully scraped |
| `error_message` | TEXT | NULLABLE | Error details if failed |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Job creation time |

**Indexes:**
- `idx_scraping_jobs_source_id` on `source_id`
- `idx_scraping_jobs_status` on `status`
- `idx_scraping_jobs_created_at` on `created_at DESC`

**Foreign Keys:**
- `source_id` → `recipe_sources.id` (ON DELETE CASCADE)

---

## Setup Instructions

### Prerequisites

- PostgreSQL 14+ installed
- Node.js 18+ with npm
- Backend environment variables configured

### Local Development Setup

#### 1. Install PostgreSQL

**Debian/Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@17
brew services start postgresql@17
```

**Windows:**
Download installer from https://www.postgresql.org/download/windows/

#### 2. Create Database and User

```bash
sudo -u postgres psql

# Inside psql:
CREATE DATABASE madmatch_recipes;
CREATE USER madmatch WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE madmatch_recipes TO madmatch;
ALTER USER madmatch CREATEDB;  # Required for Prisma shadow database
\c madmatch_recipes
GRANT ALL ON SCHEMA public TO madmatch;
\q
```

#### 3. Configure Environment Variables

Create or update `backend/.env`:

```env
DATABASE_URL="postgresql://madmatch:your_secure_password@localhost:5432/madmatch_recipes?schema=public"
```

**Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA`

**Examples:**
- Local: `postgresql://madmatch:password@localhost:5432/madmatch_recipes`
- Supabase: `postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres`
- Railway: `postgresql://postgres:[PASSWORD]@[HOST].railway.app:5432/railway`

#### 4. Install Dependencies

```bash
cd backend
npm install @prisma/client @prisma/adapter-pg pg prisma --save
```

#### 5. Run Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create all tables with indexes
- Apply foreign keys and constraints
- Generate Prisma Client

#### 6. Verify Schema

```bash
npx prisma studio
```

Opens Prisma Studio in browser at http://localhost:5555 to browse database visually.

#### 7. Seed Initial Data

Initial recipe sources are created via SQL during migration. Verify:

```bash
psql -U madmatch -d madmatch_recipes -c "SELECT * FROM recipe_sources;"
```

Expected output:
- Arla (priority 1)
- Spoonacular (priority 2)

---

## Production Deployment

### Hosting Options

#### Option A: Supabase (Recommended for MVP)

**Pros:**
- Free tier (500 MB database)
- Automatic backups
- Built-in connection pooling
- Dashboard for monitoring

**Setup:**
1. Create account at https://supabase.com
2. Create new project
3. Copy connection string from Settings → Database
4. Set `DATABASE_URL` in production environment
5. Run migrations: `npx prisma migrate deploy`

**Cost:** Free tier sufficient for 3,000-5,000 recipes

#### Option B: Railway

**Pros:**
- Simple deployment
- Git integration
- $5/month for always-on database

**Setup:**
1. Create account at https://railway.app
2. Create PostgreSQL service
3. Copy `DATABASE_URL` from service variables
4. Run migrations via Railway CLI or GitHub Actions

#### Option C: Self-Hosted

**Pros:**
- Full control
- Cost-effective at scale

**Cons:**
- Requires infrastructure management
- Manual backup setup

**Recommended for:** Production at scale (10,000+ recipes)

---

## Database Service Usage

### Importing the Service

```javascript
const { getPrismaClient, healthCheck } = require('./services/databaseService');
```

### Getting Prisma Client

```javascript
const prisma = getPrismaClient();

// Query recipe sources
const sources = await prisma.recipeSource.findMany();

// Create a recipe
const recipe = await prisma.recipe.create({
  data: {
    sourceId: 'source-uuid-here',
    title: 'Beef Tacos',
    slug: 'beef-tacos',
    language: 'da',
    ingredients: {
      create: [
        { ingredientName: 'Hakket oksekød', quantity: '500 g', order: 1 },
        { ingredientName: 'Tacoskaller', quantity: '8 stk', order: 2 },
      ],
    },
  },
  include: {
    ingredients: true,
  },
});
```

### Health Check Endpoint

```javascript
app.get('/api/health/database', async (req, res) => {
  const health = await healthCheck();
  res.status(health.healthy ? 200 : 503).json(health);
});
```

**Response (Healthy):**
```json
{
  "healthy": true,
  "message": "Connected to database. 2 recipe sources configured."
}
```

**Response (Unhealthy):**
```json
{
  "healthy": false,
  "message": "Database connection failed: connection refused"
}
```

---

## Full-Text Search

PostgreSQL's full-text search (FTS) is optimized for Danish language via GIN indexes.

### Search Recipes by Title

```javascript
const prisma = getPrismaClient();

// Using Prisma raw query for full-text search
const recipes = await prisma.$queryRaw`
  SELECT *, ts_rank(to_tsvector('danish', title), plainto_tsquery('danish', ${query})) AS rank
  FROM recipes
  WHERE to_tsvector('danish', title) @@ plainto_tsquery('danish', ${query})
  ORDER BY rank DESC
  LIMIT 10
`;
```

### Search by Ingredient

```javascript
const recipes = await prisma.$queryRaw`
  SELECT DISTINCT r.* 
  FROM recipes r
  JOIN recipe_ingredients ri ON r.id = ri.recipe_id
  WHERE to_tsvector('danish', ri.ingredient_name) @@ plainto_tsquery('danish', ${ingredient})
  ORDER BY r.created_at DESC
  LIMIT 10
`;
```

### Performance

- GIN indexes dramatically improve search speed (10x+ faster than LIKE queries)
- Search on 10,000 recipes: < 50ms with proper indexing
- Full-text search supports stemming and stop words for Danish

---

## Migrations

### Creating New Migrations

```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

### Applying Migrations in Production

```bash
npx prisma migrate deploy
```

### Rolling Back Migrations

Prisma doesn't support automatic rollback. Manual steps:

1. Restore database from backup
2. Delete migration file from `prisma/migrations/`
3. Update Prisma schema to previous state
4. Run `npx prisma migrate dev`

**Prevention:** Always test migrations in staging first!

---

## Backup & Restore

### Manual Backup

```bash
pg_dump -U madmatch -d madmatch_recipes -F c -f madmatch_backup_$(date +%Y%m%d).dump
```

### Automated Backups (Production)

**Supabase:** Automatic daily backups (free tier: 7 days retention)  
**Railway:** Requires manual setup with pg_dump cron job  
**Self-Hosted:** Use pgBackRest or Barman

### Restore from Backup

```bash
pg_restore -U madmatch -d madmatch_recipes -c madmatch_backup_20260301.dump
```

---

## Monitoring

### Connection Pool Status

```javascript
const prisma = getPrismaClient();
const metrics = await prisma.$metrics.json();
console.log('Pool status:', metrics);
```

### Query Performance

Enable query logging in `.env`:

```env
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=10&connect_timeout=5"
```

Set Prisma log level in `databaseService.js`:

```javascript
const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});
```

### Slow Query Detection

Run `EXPLAIN ANALYZE` on queries to verify index usage:

```sql
EXPLAIN ANALYZE
SELECT * FROM recipes
WHERE to_tsvector('danish', title) @@ plainto_tsquery('danish', 'kylling')
LIMIT 10;
```

Expected: "Bitmap Index Scan on idx_recipes_title_fts"

---

## Troubleshooting

### Issue: `PrismaClient` constructor error

**Error:** `Using engine type "client" requires either "adapter" or "accelerateUrl"`

**Solution:** Ensure `databaseService.js` uses the `PrismaPg` adapter:

```javascript
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### Issue: Connection refused

**Error:** `ECONNREFUSED` or `connection refused`

**Solutions:**
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify `DATABASE_URL` in `.env`
3. Test connection: `psql -U madmatch -d madmatch_recipes`
4. Check firewall allows port 5432

### Issue: Permission denied to create database

**Error:** `ERROR: permission denied to create database`

**Solution:** Grant CREATEDB to user (required for Prisma shadow database):

```sql
ALTER USER madmatch CREATEDB;
```

### Issue: Tests fail with password error

**Error:** `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`

**Solution:** Ensure `.env` is loaded in tests:

```javascript
require('dotenv').config();
```

---

## Schema Diagram

```
┌────────────────────┐
│  recipe_sources    │
│────────────────────│
│ id (PK)           │
│ name (UNIQUE)     │───┐
│ base_url          │   │
│ scraping_enabled  │   │
│ priority          │   │
└────────────────────┘   │
                         │ 1
                         │
                         │ N
┌────────────────────────┼───────────────┐
│  recipes               ↓               │
│────────────────────────────────────────│
│ id (PK)                               │───┐
│ source_id (FK)                        │   │
│ external_id                           │   │
│ title                                 │   │
│ slug (UNIQUE)                         │   │
│ ... (20+ fields)                      │   │
└────────────────────────────────────────┘   │ 1
                                             │
                                             │ N
                         ┌───────────────────┼────────────┐
                         │ recipe_ingredients↓            │
                         │────────────────────────────────│
                         │ id (PK)                       │
                         │ recipe_id (FK)                │
                         │ ingredient_name               │
                         │ quantity                      │
                         │ order                         │
                         └────────────────────────────────┘
```

---

## References

- **Epic 3.5 Specification:** `/home/moltbot/.openclaw/workspace-zhc-product-owner/EPIC3.5_SPECIFICATION.md`
- **Prisma Docs:** https://www.prisma.io/docs
- **PostgreSQL Full-Text Search:** https://www.postgresql.org/docs/current/textsearch.html
- **Supabase:** https://supabase.com
- **Railway:** https://railway.app

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-03-01  
**Maintainer:** ZHC Developer Agent
