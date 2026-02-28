# Issue: Integrate Real Tilbud Data Source

**Epic:** Epic 2 - Real Data Integration  
**Type:** Feature  
**Priority:** High  
**Correlation ID:** ZHC-MadMatch-20260227-003  

## Problem Statement

MadMatch v1.0.0 currently uses 15 hardcoded mock tilbud in `/backend/data/tilbud.json`. Before moving to Epic 2, we need real data from Danish grocery stores.

## Research Complete ✅

See [`TILBUD_DATA_RESEARCH.md`](./TILBUD_DATA_RESEARCH.md) for full analysis.

**Recommendation:** Use **Salling Group Food Waste API** + enhanced mock data

## Requirements

### Functional Requirements
1. **Real tilbud data** from Salling Group stores (Netto, Føtex, Bilka)
2. **Minimum 10 real tilbud** at any given time
3. **Preserve existing API contract** - No frontend changes required
4. **Same data structure:**
   ```javascript
   {
     id, navn, butik, kategori, 
     normalpris, tilbudspris, rabat, billedeUrl
   }
   ```
5. **Same endpoints:**
   - `GET /api/tilbud` (with ?butik and ?kategori filters)
   - `GET /api/tilbud/:id`
   - `GET /api/butikker`
   - `GET /api/kategorier`

### Non-Functional Requirements
1. **Caching** - API responses cached for 1 hour
2. **Error handling** - Fallback to cached/mock data on API failure
3. **Performance** - Response time < 200ms (from cache)
4. **Observability** - Structured logging for API calls
5. **Configuration** - API keys in environment variables
6. **Testing** - Unit & integration tests with mocked API
7. **Documentation** - Setup instructions for API registration

## Implementation Plan

### 1. Data Service Architecture

Create `/backend/services/tilbudDataService.js`:

```javascript
TilbudDataService
├── SallingGroupAdapter
│   ├── fetchFoodWaste(zipCode)
│   ├── transformToSchema(apiData)
│   └── cache (1h TTL)
├── MockDataAdapter
│   └── getEnhancedMockData()
└── DataAggregator
    ├── mergeSources()
    └── applyFilters(butik, kategori)
```

### 2. Salling Group API Integration

**Endpoint:** `GET https://api.sallinggroup.com/v1/food-waste?zip={zipCode}`

**Authentication:** `Authorization: Bearer <SALLING_API_KEY>`

**Response mapping:**
- `clearances[].product.description` → `navn`
- `clearances[].store.brand` → `butik`
- Smart inference from description → `kategori`
- `clearances[].offer.originalPrice` → `normalpris`
- `clearances[].offer.newPrice` → `tilbudspris`
- `clearances[].offer.percentDiscount` → `rabat`
- `clearances[].product.image` → `billedeUrl`

### 3. Caching Layer

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

async function getCachedTilbud() {
  let tilbud = cache.get('tilbud');
  if (!tilbud) {
    tilbud = await fetchAndAggregate();
    cache.set('tilbud', tilbud);
  }
  return tilbud;
}
```

### 4. Error Handling

```javascript
try {
  const apiData = await fetchSallingAPI();
  cache.set('tilbud', apiData);
  return apiData;
} catch (error) {
  console.error('[ERROR] Salling API failed:', error);
  
  // Fallback strategy
  const cached = cache.get('tilbud_last_success');
  if (cached) return cached;
  
  // Ultimate fallback
  return getMockData();
}
```

### 5. Configuration

Add to `.env`:
```bash
# Salling Group API
SALLING_API_KEY=your_bearer_token_here
SALLING_API_BASE_URL=https://api.sallinggroup.com
SALLING_ZIP_CODE=8000
SALLING_CACHE_TTL=3600

# Feature flags
ENABLE_REAL_DATA=true
ENABLE_MOCK_FALLBACK=true
```

### 6. Environment Setup

Update `.env.example`:
```bash
# Salling Group API Configuration
SALLING_API_KEY=
SALLING_API_BASE_URL=https://api.sallinggroup.com
SALLING_ZIP_CODE=8000

# Optional
SALLING_CACHE_TTL=3600
ENABLE_REAL_DATA=true
ENABLE_MOCK_FALLBACK=true
```

## Acceptance Criteria

- [ ] Real tilbud data displays in frontend (no code changes to frontend)
- [ ] At least 10 tilbud available at all times
- [ ] Data refreshes every hour (cached)
- [ ] API failures don't crash app (fallback to cache/mock)
- [ ] No hardcoded API keys (environment variables only)
- [ ] Unit tests pass for data service
- [ ] Integration tests pass with mocked Salling API
- [ ] Existing frontend tests still pass
- [ ] README updated with API setup instructions
- [ ] `.env.example` includes all required variables
- [ ] Structured logging shows:
  - API call attempts
  - Cache hits/misses
  - Fallback usage
  - Error details

## Testing Strategy

### Unit Tests
```javascript
// backend/services/tilbudDataService.test.js
describe('TilbudDataService', () => {
  describe('SallingGroupAdapter', () => {
    it('should fetch food waste data');
    it('should transform API response to schema');
    it('should infer categories from product names');
    it('should handle API errors gracefully');
  });
  
  describe('Caching', () => {
    it('should cache responses for 1 hour');
    it('should return cached data on subsequent calls');
    it('should refresh cache after TTL expires');
  });
  
  describe('Error Handling', () => {
    it('should fallback to cached data on API failure');
    it('should fallback to mock data if cache expired');
    it('should log errors appropriately');
  });
});
```

### Integration Tests
```javascript
// backend/server.integration.test.js
describe('Tilbud API with Real Data', () => {
  it('GET /api/tilbud returns real + mock data');
  it('GET /api/tilbud?butik=netto filters correctly');
  it('GET /api/tilbud/:id returns specific tilbud');
  it('GET /api/butikker includes Salling stores');
  it('GET /api/kategorier includes inferred categories');
});
```

## Documentation Checklist

- [ ] **README.md** updated with:
  - Salling Group API registration instructions
  - How to get Bearer token
  - Environment variable setup
  - Data refresh behavior
- [ ] **TILBUD_DATA_RESEARCH.md** created (research findings)
- [ ] **.env.example** updated with all variables
- [ ] **Inline code comments** for complex logic
- [ ] **API documentation** in comments (JSDoc)

## Dependencies

Add to `backend/package.json`:
```json
{
  "dependencies": {
    "node-cache": "^5.1.2",
    "axios": "^1.6.7"
  },
  "devDependencies": {
    "nock": "^13.5.0"
  }
}
```

## Migration & Rollback

**Migration:**
- No database changes required
- No breaking API changes
- Backend-only changes

**Rollback:**
- Revert to previous commit
- Falls back to mock data automatically if `ENABLE_REAL_DATA=false`

**Deployment:**
1. Set environment variables in deployment environment
2. Register for Salling API key first
3. Deploy backend with new service
4. Verify `/health` endpoint still works
5. Monitor logs for API call success/failures

## Monitoring

Log the following events:
```javascript
console.log('[INFO] Fetching tilbud from Salling API', { zipCode });
console.log('[SUCCESS] Retrieved X tilbud from API', { count });
console.log('[CACHE] Returning cached tilbud', { age: '15min' });
console.log('[ERROR] Salling API failed, using fallback', { error });
console.log('[WARN] Cache expired, refreshing', { lastUpdate });
```

## Success Metrics

After deployment:
1. **API uptime:** > 95% successful calls
2. **Cache hit rate:** > 80%
3. **Response time:** < 200ms (cached), < 2s (API call)
4. **Data freshness:** < 1 hour old
5. **Fallback usage:** < 5% of requests

## Out of Scope (Future Enhancements)

- [ ] Multiple zip codes / nationwide coverage
- [ ] Real-time push updates
- [ ] Additional data sources (eTilbudsavis)
- [ ] Machine learning for better categorization
- [ ] User-specific location-based offers
- [ ] Price history tracking

## References

- Research document: [`TILBUD_DATA_RESEARCH.md`](./TILBUD_DATA_RESEARCH.md)
- Salling API docs: https://developer.sallinggroup.dev/
- Example implementation: https://github.com/larsdpeder/Salling-Group-Food-Waste-Finder

---

**Labels:** `enhancement`, `epic-2`, `high-priority`, `backend`  
**Assignee:** @zhc-developer  
**Milestone:** Epic 2 - Real Data Integration
