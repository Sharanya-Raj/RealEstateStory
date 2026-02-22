# The Spirited Oracle - Development To-Do List

## 🚨 CRITICAL ISSUES

### 1. **Unify Backend Architecture**
**Problem:** Two separate FastAPI apps (`main.py` and `server.py`) both trying to use port 8000
- [x] Merge `server.py` FastMCP tools into `main.py` as additional routes
- [x] Update Dockerfile to point to correct entry point
- [x] Test all endpoints work after merge

### 2. **Fix Hardcoded API URLs in Frontend**
**Problem:** All API calls use `http://127.0.0.1:8000` or `http://localhost:8000`
- [x] Create environment variable system for frontend (Vite `.env` support)
- [x] Add `VITE_API_URL` to `.env` and `.env.example`
- [x] Replace all hardcoded URLs in all frontend pages
- [x] Create `src/lib/api.ts` with centralized API client
- [ ] Update `deploy.sh` to set production URLs

### 3. **Eliminate Mock Data Dependencies**
**Problem:** Frontend still imports and uses `mockListings.ts`, backend generates fake data
- [x] Remove `frontend/src/data/mockListings.ts` entirely
- [x] Update all imports to use backend Listing type instead
- [x] Create TypeScript types from backend Pydantic models
- [x] Remove random data generation in `_map_row_to_listing()`
- [x] Integrate real-world images from AI generation
- [x] Remove hardcoded cost values in budget_agent.py

## ⚠️ HIGH PRIORITY

### 4. **Data Synchronization Issues**
**Problem:** Frontend sends camelCase, backend expects snake_case
- [x] Standardize on one naming convention (snake_case for API)
- [x] Add translation layer in `main.py` to bridge camelCase ↔ snake_case
- [x] Add TypeScript types that match backend exactly

### 5. **Missing/Incomplete API Endpoints**
- [x] `/api/listings` - EXISTS but needs refinement
- [x] `/api/listings/{id}` - EXISTS but needs refinement
- [x] `/api/fairness` - EXISTS and working
- [x] `/api/evaluate` - EXISTS but could be optimized
- [ ] `/api/evaluate-batch` - EXISTS but frontend doesn't use it
- [x] `/api/chat` - EXISTS for Howl character
- [ ] Consider adding:
  - `POST /api/search` - intelligent search with filters
  - `GET /api/colleges` - list of supported colleges
  - `GET /api/neighborhoods/{zip}` - cached neighborhood data

### 6. **Environment Configuration**
- [x] Create `backend/.env.example` with all required variables
- [x] Create `frontend/.env.example`
- [x] Add `.env` to `.gitignore`
- [x] Document which API keys are required vs optional

### 7. **ZORI/ZORDI Market Data Issues**
**Problem:** Data access uses ZIP codes but ZORI uses city names
- [ ] Fix `market_fairness/data_access.py` to handle both ZIP and city lookups
- [ ] Add city name → ZIP mapping or vice versa
- [ ] Handle missing data gracefully (currently returns error)
- [ ] Add caching for ZORI/ZORDI lookups (loads CSV every time)
- [ ] Verify ZORDI p25/p50/p75 calculation is correct

## 📋 MEDIUM PRIORITY

### 8. **Supabase Integration**
**Problem:** Partially implemented but not fully utilized
- [ ] Decide: Use Supabase OR CSV, not both
- [ ] If using Supabase:
  - [ ] Complete schema migration (`scripts/supabase_migration.sql`)
  - [ ] Remove CSV fallback logic
  - [ ] Add proper error handling
  - [ ] Test geo-radius queries
- [ ] If NOT using Supabase:
  - [ ] Remove `db.py` and all Supabase references
  - [ ] Remove from `requirements.txt`

### 9. **Agent System Improvements**
- [ ] **Commute Agent**: Batch OSRM calls work but not all routes return timing
- [ ] **Budget Agent**: Remove hardcoded transportation/grocery costs
- [ ] **Fairness Agent**: LLM fallback when ZORI fails - but this duplicates work
- [ ] **Neighborhood Agent**: Walk score calculation is simplistic
- [ ] **Hidden Cost Agent**: Structured costs are estimated, need real data
- [x] **Kamaji (Orchestrator)**: Voiceover generation integrated using ElevenLabs

### 10. **Frontend Component Issues**
- [ ] `Journey.tsx` - Loads AI data but if it fails, dialog is confusing
- [ ] `Summary.tsx` - Charts show mock data when aiPayload missing
- [ ] `Listings.tsx` - No loading state while fetching
- [ ] `Chat.tsx` - Howl character is great but could use chat history
- [ ] All pages reference `Listing` type from mockListings - centralize this

### 11. **Apartments.com Scraper**
**Problem:** Uses Selenium, requires Chrome, often disabled
- [ ] Make scraper truly optional (currently errors if USE_APARTMENTS_COM=0)
- [ ] Add proper error handling when scraper fails
- [ ] Document Chrome/Selenium setup requirements
- [ ] Consider alternative: Use Apartments.com API if available
- [ ] OR: Remove scraper entirely and focus on user-submitted data

## 🎯 NICE TO HAVE

### 12. **Performance Optimizations**
- [ ] Implement API response caching (Redis or in-memory)
- [ ] Batch agent calls are good, but could parallelize LLM calls
- [ ] Frontend: Implement React Query caching properly
- [ ] Add loading skeletons instead of basic "Loading..." text
- [ ] Lazy load agent animations in Journey page

### 13. **User Experience Enhancements**
- [ ] Add ability to save/favorite listings
- [ ] Comparison view for multiple listings side-by-side
- [ ] Export summary as PDF
- [ ] Share link for specific listing analysis
- [x] Add user preferences persistence (localStorage)

### 14. **Code Quality**
- [ ] Add TypeScript strict mode
- [ ] Add ESLint rules and fix all warnings
- [ ] Add Python type hints everywhere (some missing)
- [ ] Write tests for critical agent functions
- [ ] Add API integration tests
- [ ] Document all agent prompts and expected outputs

### 15. **Deployment Readiness**
- [ ] Fix `deploy.sh` - has typos (`apt-update` should be `apt-get update`)
- [ ] Add health check endpoint monitoring
- [ ] Add proper logging (not just print statements)
- [ ] Set up error tracking (Sentry?)
- [ ] Configure CORS properly for production
- [ ] Add rate limiting to API endpoints
- [ ] Set up CI/CD pipeline

### 16. **Documentation**
- [ ] API documentation (Swagger/OpenAPI already available via FastAPI)
- [ ] Frontend component documentation
- [ ] Agent prompt engineering documentation
- [ ] Deployment guide with screenshots
- [ ] Contributing guidelines
- [ ] Architecture diagram

## 🐛 BUGS TO FIX

### Known Issues:
1. **Journey page**: aiPayload can be null, causing undefined errors in dialogue generation
2. **Fairness API**: Returns 404 as HTTP error instead of graceful error object
3. **Geocoding**: Nominatim rate limit (1 req/sec) not enforced in `geocode_batch`
4. **OSRM routing**: Returns None for some routes but no clear error message
5. **College data**: `frontend/src/data/colleges.ts` - is this used? Check if needed
6. **Dockerfile**: Points to `web_bridge.py` which doesn't exist (should be `main.py`)
7. **main.py line 111**: `_translate_frontend_to_backend` - only translates some fields
8. **Overpass API**: Can timeout with no retry logic

## 📊 DATA QUALITY ISSUES

### Real Data Needed:
- [x] Actual listing photos (using AI generation)
- [x] Real property manager names
- [x] Actual year built for properties
- [x] Real utility costs per property
- [x] Actual parking fees
- [x] Real amenity fees
- [x] Historical rent data (via realistic mock generation)
- [ ] User reviews/ratings system

## 🎨 UI/UX Polish

- [ ] Add proper error boundaries in React
- [ ] Improve mobile responsiveness (test on actual devices)
- [ ] Add proper form validation with error messages
- [ ] Accessibility audit (ARIA labels, keyboard navigation)
- [ ] Empty states for when no listings found
- [x] Skeleton loaders for all data fetching
- [ ] Toast notifications for errors (already have toast component)
- [ ] Dark mode support (README says "zero dark mode" but might want it later)

---

## 🎯 RECOMMENDED PRIORITY ORDER:

### Week 1 (MVP):
1. Unify backend architecture (#1)
2. Fix hardcoded API URLs (#2)
3. Create .env.example files (#6)
4. Fix Dockerfile (#bugs)
5. Test end-to-end flow works

### Week 2 (Data Quality):
6. Eliminate mock data (#3)
7. Fix ZORI/ZORDI lookups (#7)
8. Remove hardcoded costs from agents (#3, #9)
9. Decide on Supabase vs CSV (#8)

### Week 3 (Polish):
10. Fix data synchronization (#4)
11. Improve error handling everywhere
12. Add loading states and skeletons
13. Deploy to Vultr and test

### Week 4 (Enhancement):
14. Implement caching (#12)
15. Add user features (#13)
16. Documentation (#16)

---

**Legend:**
- [ ] Not started
- [x] Complete
- ⚠️ Blocked/needs discussion
