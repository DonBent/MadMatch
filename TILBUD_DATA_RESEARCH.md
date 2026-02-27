# Tilbud Data Source Research Report

**Correlation ID:** ZHC-MadMatch-20260227-003  
**Date:** 2026-02-27  
**Status:** Complete  

## Executive Summary

Research conducted on available Danish grocery tilbud (offers) APIs. **Recommendation: Use Salling Group Food Waste API** as primary data source with fallback to cached mock data.

## Research Findings

### 1. Salling Group API ✅ RECOMMENDED

**Website:** https://developer.sallinggroup.dev/  
**Coverage:** Netto, Føtex, Bilka, Salling  
**API Type:** REST/JSON  
**Authentication:** Bearer Token  

#### Pros:
- ✅ **Free tier available** - Free to use, requires registration
- ✅ **Official API** from major Danish retailer group
- ✅ **Real-time data** - Updated continuously
- ✅ **Multiple stores** - Covers 3 major chains (Netto, Føtex, Bilka)
- ✅ **Well-documented** - OpenAPI specifications available
- ✅ **No rate limits mentioned** for food waste API
- ✅ **JSON responses** - Easy integration
- ✅ **NPM SDKs available** (@salling-group/stores)

#### Available APIs:
1. **Food Waste API** (Anti Food Waste)
   - Endpoint: `GET /v1/food-waste?zip={zipCode}`
   - Returns: Products with short expiry dates (heavily discounted)
   - Stores: Føtex, Netto, Basalt, Bilka
   - Perfect for tilbud use case!

2. **Stores API**
   - Store locations, opening hours
   - Can filter by brand, ZIP code, coordinates

3. **Product Suggestions API**
   - Product recommendations
   - Frequently bought together

#### Cons:
- ⚠️ **Requires registration** - Need to sign up for developer portal
- ⚠️ **Food Waste only** - Main free API focuses on clearance items (not all tilbud)
- ⚠️ **No regular offers** - Regular weekly offers not available in free tier
- ⚠️ **Missing Rema 1000** - Salling Group doesn't own Rema 1000

#### API Structure Example:
```json
{
  "clearances": [
    {
      "offer": {
        "currency": "DKK",
        "discount": 12.00,
        "ean": "5712345678901",
        "endTime": "2026-02-27T22:59:59.000Z",
        "lastUpdate": "2026-02-27T12:00:00.000Z",
        "newPrice": 7.95,
        "originalPrice": 19.95,
        "percentDiscount": 60,
        "startTime": "2026-02-27T08:00:00.000Z",
        "stock": 3,
        "stockUnit": "each"
      },
      "product": {
        "description": "Økologisk Hakket Oksekød",
        "image": "https://..."
      },
      "store": {
        "name": "Netto Aarhus C",
        "brand": "netto"
      }
    }
  ]
}
```

#### Registration Process:
1. Visit https://developer.sallinggroup.dev/
2. Sign up for developer account
3. Create application/project
4. Get Bearer token
5. Use in Authorization header: `Authorization: Bearer <token>`

---

### 2. eTilbudsavis / Tjek ⚠️ LIMITED

**Website:** https://tjek.com/apis-and-sdks  
**Coverage:** All Danish stores (Rema 1000, Netto, Føtex, Bilka, etc.)  
**API Type:** REST/JSON  
**Authentication:** Private - requires contact  

#### Pros:
- ✅ **Comprehensive coverage** - All Danish grocery stores
- ✅ **Publication/catalog data** - Full tilbudsaviser (offer catalogs)
- ✅ **Used by major retailers** - Netto uses their solution
- ✅ **PDF and Incito reader** included

#### Cons:
- ❌ **No public/free tier** - Must contact sales team (services@tjek.com)
- ❌ **Private API** - Requires business relationship
- ❌ **Likely paid** - No pricing info, enterprise-focused
- ❌ **No documentation** available without signup

#### Verdict:
**Not suitable** for MVP/free tier requirement. Would require CEO approval for paid tier.

---

### 3. Alternative Options Considered

#### OpenFoodFacts API
- ❌ **Not suitable** - Product database only, no pricing/offers
- Coverage: International product data
- Use case: Product information, not tilbud

#### Web Scraping
- ❌ **Not recommended** for following reasons:
  1. **Legal risks** - Terms of Service violations
  2. **robots.txt compliance** - Most sites disallow scraping
  3. **High maintenance** - Sites change frequently
  4. **Unreliable** - No SLA, can break anytime
  5. **Rate limiting** - Risk of IP bans
  6. **Data quality** - Inconsistent structure

#### Direct Store APIs (Rema 1000, etc.)
- ❌ **Not publicly available** - No public APIs found
- Rema 1000: No developer program
- Fakta: No API documented
- Aldi: No API available

---

## Recommendation: Hybrid Approach

### Primary Strategy: Salling Group Food Waste API + Enhanced Mock Data

**Why this works:**
1. **Real data from major stores** (Netto, Føtex, Bilka) via API
2. **Augment with curated mock data** for missing stores (Rema 1000, Aldi, etc.)
3. **Graceful degradation** - Always have data available
4. **MVP-appropriate** - Free tier, quick to implement
5. **Easy to extend** - Can add more sources later

### Implementation Plan:

#### Phase 1: Data Service Architecture
```
TilbudDataService
├── SallingGroupAdapter (Food Waste API)
│   ├── Fetch clearance offers
│   ├── Transform to our schema
│   └── Cache responses (1 hour TTL)
├── MockDataAdapter (Enhanced mock)
│   ├── Rema 1000 offers
│   ├── Aldi offers
│   └── Fallback data
└── DataAggregator
    ├── Merge sources
    ├── Deduplicate
    └── Return unified response
```

#### Phase 2: Data Mapping
Map Salling API → Our schema:
```javascript
{
  id: generateId(offer.ean, store.id),
  navn: product.description,
  butik: store.brand, // "netto", "foetex", "bilka"
  kategori: inferCategory(product.description), // Smart categorization
  normalpris: offer.originalPrice,
  tilbudspris: offer.newPrice,
  rabat: offer.percentDiscount,
  billedeUrl: product.image || '/images/placeholder.jpg'
}
```

#### Phase 3: Caching Strategy
- **API responses:** Cache for 1 hour
- **Fallback:** Use last successful response if API fails
- **Refresh:** Background job every hour
- **Health check:** Monitor API availability

#### Phase 4: Configuration
```bash
# .env
SALLING_API_KEY=<bearer-token>
SALLING_API_BASE_URL=https://api.sallinggroup.com
SALLING_ZIP_CODE=8000  # Configurable search area
CACHE_TTL_SECONDS=3600
ENABLE_MOCK_DATA=true  # For Rema 1000, etc.
```

---

## Data Quality Expectations

### Coverage:
- **Real data:** Netto, Føtex, Bilka (via Salling API)
- **Mock data:** Rema 1000, Aldi, Lidl (curated)
- **Total tilbud:** 20-30 items (10+ real, 10+ mock)

### Refresh Rate:
- **Salling API:** Updated continuously by stores
- **Our cache:** Refresh every hour
- **User experience:** Always fresh data (< 1 hour old)

### Categories:
Smart inference from product names:
- "Hakket Oksekød" → Kød
- "Mælk" → Mejeri
- "Bananer" → Frugt
- etc.

### Fallback Strategy:
```
1. Try Salling API
   ↓ (on success)
2. Transform & cache
   ↓
3. Merge with mock data
   ↓
4. Return to user

(on failure)
   ↓
Use cached data (if < 24h old)
   ↓ (if cache expired)
Use mock data only
```

---

## Cost Analysis

### Salling Group API:
- **Free tier:** ✅ Yes
- **Rate limits:** Not specified (likely generous for food waste)
- **Registration:** Required but free
- **SLA:** None (free tier)

### Infrastructure:
- **Additional costs:** $0
- **Storage:** Minimal (cache only)
- **Bandwidth:** Low (JSON responses, ~1 MB/day)

### Total Cost: **$0** ✅ Meets CEO requirement

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API unavailable | Low | Medium | Cached fallback + mock data |
| Rate limiting | Low | Low | Caching (1h TTL) reduces calls |
| API key exposed | Medium | Low | Environment variables, .gitignore |
| Food waste limited scope | High | Low | Augment with mock data |
| Salling API discontinued | Low | Medium | Abstract adapter pattern, easy to swap |

---

## Timeline & Effort Estimate

1. **Research:** ✅ Complete (this document)
2. **API registration:** 15 minutes
3. **Service implementation:** 4 hours
4. **Testing:** 2 hours
5. **Documentation:** 1 hour
6. **PR & review:** 1 hour

**Total:** ~8 hours development time

---

## Next Steps

1. ✅ **Complete research** (Done)
2. ⏭️ **Register for Salling Group developer account**
   - Visit https://developer.sallinggroup.dev/
   - Get Bearer token
3. ⏭️ **Create GitHub Issue** "Integrate real tilbud data source"
4. ⏭️ **Implement TilbudDataService**
   - Salling Group adapter
   - Mock data adapter
   - Caching layer
   - Error handling
5. ⏭️ **Add tests**
   - Unit tests for adapters
   - Integration tests with mocked API
   - E2E tests for existing frontend
6. ⏭️ **Update documentation**
   - README with setup instructions
   - .env.example
7. ⏭️ **Create Pull Request**

---

## Conclusion

**Salling Group Food Waste API** is the optimal choice for MadMatch MVP:
- ✅ Free and accessible
- ✅ Real data from major Danish stores
- ✅ Quick to implement
- ✅ Easy to extend later
- ✅ Meets all acceptance criteria

The hybrid approach (API + mock data) ensures:
- Always have 10+ tilbud available
- Coverage of stores not in Salling Group
- Graceful degradation if API fails
- Low maintenance burden

**Ready to proceed with implementation.** 🚀

---

## References

1. Salling Group Developer Portal: https://developer.sallinggroup.dev/
2. API Danmark (Danish API List): https://github.com/mauran/API-Danmark
3. Salling Food Waste Examples: https://github.com/larsdpeder/Salling-Group-Food-Waste-Finder
4. NPM SDK: https://www.npmjs.com/package/@salling-group/stores
