# Recipe API Documentation - Epic 3.5

**Correlation ID:** ZHC-MadMatch-20260301-004  
**Version:** 1.0.0  
**Base URL:** `http://localhost:4001/api` (development)

---

## Overview

The Recipe API provides access to MadMatch's multi-source recipe database. It supports searching recipes by query text, ingredients, and retrieving individual recipes with full details.

**Features:**
- Multi-source recipe search (Database + Spoonacular fallback)
- Full-text search with Danish language support
- Ingredient-based recipe discovery
- Source health monitoring
- Consistent JSON responses
- Comprehensive error handling

---

## Authentication

**Current:** No authentication required (public API)  
**Future:** Optional API keys for elevated limits (Epic 5+)

---

## Common Headers

### Request Headers
```
Content-Type: application/json
X-Correlation-ID: <correlation-id> (optional, for tracking)
```

### Response Headers
```
Content-Type: application/json
Cache-Control: public, max-age=600
```

---

## Endpoints

### 1. Search Recipes

Search recipes by query string with optional filters.

**Endpoint:** `GET /api/recipes/search`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query (e.g., "kylling", "pasta") |
| `language` | string | No | `da` | Language filter (`da`, `en`) |
| `source` | string (UUID) | No | - | Recipe source ID filter |
| `difficulty` | string | No | - | Difficulty filter (`easy`, `medium`, `hard`) |
| `max_time` | integer | No | - | Maximum total time in minutes |
| `limit` | integer | No | `10` | Results per page (max: 50) |
| `offset` | integer | No | `0` | Pagination offset |

**Example Request:**
```bash
curl -X GET "http://localhost:4001/api/recipes/search?q=kylling&language=da&limit=5" \
  -H "X-Correlation-ID: test-123"
```

**Success Response (200 OK):**
```json
{
  "recipes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "source": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Arla"
      },
      "title": "Grillet Kylling med Grøntsager",
      "slug": "grillet-kylling-med-groentsager",
      "description": "Saftig grillet kylling med sæsongrøntsager",
      "imageUrl": "https://www.arla.dk/recipes/images/kylling.jpg",
      "prepTimeMinutes": 15,
      "cookTimeMinutes": 30,
      "totalTimeMinutes": 45,
      "servings": 4,
      "difficulty": "medium",
      "language": "da",
      "ingredients": [
        {
          "name": "kyllingebryst",
          "quantity": "500 g",
          "order": 1
        }
      ],
      "instructions": "1. Forvarm grill...",
      "sourceUrl": "https://www.arla.dk/opskrifter/grillet-kylling",
      "createdAt": "2026-03-01T10:00:00Z",
      "updatedAt": "2026-03-01T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 5,
  "offset": 0,
  "hasMore": true
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid query parameters",
  "message": "Query parameter 'q' is required and cannot be empty",
  "correlationId": "test-123",
  "timestamp": "2026-03-01T12:34:56.789Z"
}
```

---

### 2. Get Recipe by ID

Retrieve a single recipe by its unique identifier.

**Endpoint:** `GET /api/recipes/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Recipe ID |

**Example Request:**
```bash
curl -X GET "http://localhost:4001/api/recipes/550e8400-e29b-41d4-a716-446655440000"
```

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Arla"
  },
  "title": "Grillet Kylling med Grøntsager",
  "slug": "grillet-kylling-med-groentsager",
  "description": "Saftig grillet kylling med sæsongrøntsager",
  "imageUrl": "https://www.arla.dk/recipes/images/kylling.jpg",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "totalTimeMinutes": 45,
  "servings": 4,
  "difficulty": "medium",
  "language": "da",
  "ingredients": [
    {
      "name": "kyllingebryst",
      "quantity": "500 g",
      "order": 1
    }
  ],
  "instructions": "1. Forvarm grill til 200°C.\n2. Krydre kylling...",
  "sourceUrl": "https://www.arla.dk/opskrifter/grillet-kylling",
  "createdAt": "2026-03-01T10:00:00Z",
  "updatedAt": "2026-03-01T10:00:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Recipe not found",
  "message": "Recipe with ID '550e8400-e29b-41d4-a716-446655440000' does not exist. Try searching for recipes instead.",
  "correlationId": "ZHC-MadMatch-Epic3.5-...",
  "timestamp": "2026-03-01T12:34:56.789Z"
}
```

---

### 3. Get Recipes by Ingredient

Find recipes containing a specific ingredient.

**Endpoint:** `GET /api/recipes/by-ingredient`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `ingredient` | string | Yes | - | Ingredient name (e.g., "hakket oksekød") |
| `language` | string | No | `da` | Language filter |
| `limit` | integer | No | `10` | Results per page (max: 50) |
| `offset` | integer | No | `0` | Pagination offset |

**Example Request:**
```bash
curl -X GET "http://localhost:4001/api/recipes/by-ingredient?ingredient=hakket%20oksekød&limit=3"
```

**Success Response (200 OK):**
```json
{
  "ingredient": "hakket oksekød",
  "recipes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "source": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Arla"
      },
      "title": "Spaghetti Bolognese",
      "slug": "spaghetti-bolognese",
      "imageUrl": "https://www.arla.dk/recipes/images/bolognese.jpg",
      "totalTimeMinutes": 45,
      "servings": 4,
      "difficulty": "easy",
      "language": "da",
      "matchedIngredients": [
        {
          "name": "hakket oksekød",
          "quantity": "400 g"
        }
      ]
    }
  ],
  "total": 12,
  "limit": 3,
  "offset": 0,
  "hasMore": true
}
```

**Note:** Results are ordered by relevance (exact match first, then partial matches). Fuzzy matching is applied.

---

### 4. List Recipe Sources

Get metadata about all available recipe sources with health status.

**Endpoint:** `GET /api/recipes/sources`

**Query Parameters:** None

**Example Request:**
```bash
curl -X GET "http://localhost:4001/api/recipes/sources"
```

**Success Response (200 OK):**
```json
{
  "sources": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Arla",
      "priority": 1,
      "enabled": true,
      "healthy": true,
      "message": "Database operational"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "name": "Spoonacular",
      "priority": 2,
      "enabled": true,
      "healthy": true,
      "message": "API accessible"
    }
  ],
  "total": 2
}
```

**Notes:**
- Sources ordered by priority (ascending - lower number = higher priority)
- `healthy` indicates if source is operational
- Database sources show recipe count; API sources show 0

---

## Error Handling

All errors follow this structure:

```json
{
  "error": "<error-type>",
  "message": "<human-readable-message>",
  "correlationId": "<correlation-id>",
  "timestamp": "2026-03-01T12:34:56.789Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Recipe found |
| 400 | Bad Request | Missing required query parameter |
| 404 | Not Found | Recipe ID doesn't exist |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Database connection failed |

---

## Rate Limiting

**Phase 1 (Current):** No rate limiting  
**Phase 2 (Future):** 100 requests/minute per IP

---

## Caching Strategy

**Client-Side Caching Headers:**
```
Cache-Control: public, max-age=600
```

**Caching Rules:**
- Search results: 10 minutes (600 seconds)
- Recipe by ID: 10 minutes (600 seconds)
- Recipe sources: 10 minutes (600 seconds)

**Server-Side Caching:**
- In-memory cache with 10-minute TTL
- Cache invalidation on recipe updates

---

## Backward Compatibility (Epic 2)

The existing endpoint `/api/produkt/:id/recipes` continues to work and now uses the new multi-source RecipeService:

**Endpoint:** `GET /api/produkt/:id/recipes`

This endpoint is maintained for backward compatibility with Epic 2 (ProductDetailPage). It now searches the database first, with Spoonacular fallback.

**Example:**
```bash
curl -X GET "http://localhost:4001/api/produkt/123/recipes"
```

**Response Format (unchanged):**
```json
{
  "success": true,
  "count": 3,
  "data": [...]
}
```

---

## Testing

### Run Tests
```bash
cd backend
npm test -- routes/recipes.test.js
```

### Test Coverage
- Unit tests for all endpoints
- Request validation tests
- Error handling tests
- Backward compatibility tests

**Expected Result:** All tests passing ✓

---

## Examples

### Search for Danish Chicken Recipes
```bash
curl -X GET "http://localhost:4001/api/recipes/search?q=kylling&language=da&limit=5"
```

### Find Easy Recipes Under 30 Minutes
```bash
curl -X GET "http://localhost:4001/api/recipes/search?q=pasta&difficulty=easy&max_time=30"
```

### Get Recipes with Ground Beef
```bash
curl -X GET "http://localhost:4001/api/recipes/by-ingredient?ingredient=hakket%20oksekød"
```

### Check Recipe Source Health
```bash
curl -X GET "http://localhost:4001/api/recipes/sources"
```

---

## Postman Collection

Import the following JSON to test all endpoints:

```json
{
  "info": {
    "name": "MadMatch Recipe API - Epic 3.5",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Search Recipes",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "X-Correlation-ID",
            "value": "postman-test-{{$timestamp}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/api/recipes/search?q=kylling&language=da&limit=5",
          "host": ["{{baseUrl}}"],
          "path": ["api", "recipes", "search"],
          "query": [
            {"key": "q", "value": "kylling"},
            {"key": "language", "value": "da"},
            {"key": "limit", "value": "5"}
          ]
        }
      }
    },
    {
      "name": "Get Recipe by ID",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/api/recipes/{{recipeId}}"
      }
    },
    {
      "name": "Recipes by Ingredient",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/recipes/by-ingredient?ingredient=hakket oksekød",
          "host": ["{{baseUrl}}"],
          "path": ["api", "recipes", "by-ingredient"],
          "query": [
            {"key": "ingredient", "value": "hakket oksekød"}
          ]
        }
      }
    },
    {
      "name": "List Sources",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/api/recipes/sources"
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:4001"
    },
    {
      "key": "recipeId",
      "value": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

---

## Troubleshooting

### "Query parameter 'q' is required"
- Ensure you include `?q=<query>` in the search URL
- Query cannot be empty or whitespace-only

### "Service unavailable" (503)
- Database connection failed
- Check `DATABASE_URL` environment variable
- Verify PostgreSQL is running

### "Recipe not found" (404)
- Recipe ID doesn't exist in database
- Try searching instead of direct ID lookup

### No Results Returned
- Check spelling (Danish characters: æ, ø, å)
- Try broader search terms
- Verify recipes exist in database (run scraper)

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-01 | Initial Epic 3.5 Slice 4 implementation |

---

**End of API Documentation**
