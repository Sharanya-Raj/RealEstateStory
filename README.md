<div align="center">
  <h1>� Ghibli Nest</h1>
  <p><strong>A multi-agent AI system that analyzes apartments and reveals their true monthly cost through a Studio Ghibli-themed storytelling UI.</strong></p>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.5-4285F4?logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/ElevenLabs-TTS-5B21B6" alt="ElevenLabs" />
  <img src="https://img.shields.io/badge/Supabase-PostGIS-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
</div>

<br />

Welcome to **Ghibli Nest**, a magical apartment-hunting experience where AI agents inspired by Studio Ghibli characters guide you through the hidden truths of rental properties in New Jersey. 

Built for the **AI Agents Challenge 2025** targeting **Google Gemini**, **ElevenLabs**, **Vultr**, and **ADP** prize tracks. We transform apartment hunting from a stressful, opaque process into an enchanting journey where six AI agents reveal commute times, hidden costs, market fairness, and neighborhood vibes — all narrated with character-specific voices.

---

## ✨ Features

### 🎭 Six AI Agents (Ghibli Characters)
Meet the spirits who will guide your apartment search:

1. **🚇 The Conductor (Commute Agent)** — Calculates transit routes, walk times, and total commute burden using OSRM routing API
2. **💸 Lin (Budget Agent)** — Identifies hidden fees (parking, pet deposits, renters insurance) and calculates true monthly costs vs. your budget
3. **⚖️ The Baron (Market Fairness Agent)** — Compares rent to ZORI (Zillow Observed Rent Index) data and calculates percentile fairness scores
4. **🌿 Kiki (Neighborhood Agent)** — Scores walkability, safety (crime data), and nearby amenities using Overpass API (OpenStreetMap)
5. **💰 The Soot Sprites (Hidden Cost Agent)** — Extracts often-overlooked costs from listing text (utilities, move-in fees, broker fees)
6. **🕰️ Kamaji (Orchestrator Agent)** — Assembles all insights, enriches with LLM-generated narratives, and generates character voice audio via ElevenLabs TTS

### 🎨 Ghibli-Themed UI/UX
- **Glassmorphism** design with custom Ghibli color palette (meadow green, sky blue, sunset orange)
- **Animated Agent Journey** — Each agent presents their findings in sequence with Framer Motion transitions
- **Character Voice Audio** — On-demand TTS narration for each agent using ElevenLabs API
- **Interactive Chat** — Ask follow-up questions to Gemini with full listing context
- **Summary Dashboard** — At-a-glance view of all 6 agent insights with cost breakdowns

### 🛢️ Supabase + PostGIS Backend
- **Geo-spatial queries** for nearby apartments using PostgreSQL PostGIS
- **Automated Craigslist scraper** populates database with New Jersey listings near 20 universities
- **RPC functions** for efficient upsert operations and distance-based searches
- **Real-time data sync** with scraped listings updated periodically

### 🧠 Multi-Agent Architecture
- **Parallel processing** — All 5 specialist agents run concurrently
- **LLM enrichment** — Gemini 2.5 Flash generates narrative insights and summaries
- **Deterministic fallbacks** — ZORI market fairness calculations work without LLM
- **External API integrations** — OSRM (routing), Overpass (amenities), Nominatim (geocoding), ElevenLabs (TTS)

---

## 🛠️ Tech Stack

**Frontend:**
- **React 18** + **TypeScript** + **Vite** — Fast, modern development
- **Tailwind CSS** — Utility-first styling with custom Ghibli theme
- **Framer Motion** — Smooth animations and page transitions
- **React Router v6** — Client-side routing
- **Lucide React** — Beautiful icon system

**Backend:**
- **FastAPI** — High-performance Python API server
- **Supabase** (PostgreSQL + PostGIS) — Geo-spatial database for listing storage
- **Google Gemini 2.5 Flash** — LLM for narrative generation and chat
- **ElevenLabs** — Text-to-speech for character voice narration
- **FastMCP** — Multi-agent orchestration server

**External APIs:**
- **OSRM** — Open-source routing machine for commute calculations
- **Overpass API** — OpenStreetMap amenity and POI queries
- **Nominatim** — Geocoding service for address resolution
- **ZORI/ZORDI Data** — Zillow rent index for market fairness analysis

---

## 🚀 Setup & Local Development

### Prerequisites
- **Node.js** (v18+)
- **Python** (3.11+)
- **Supabase Account** (for database hosting)
- **API Keys:** Google Gemini, ElevenLabs

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/RealEstateStory.git
cd RealEstateStory
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# MacOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

**Environment Variables:** Create `backend/.env` from `.env.example`
```env
# Required
GEMINI_API_KEY=your_google_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Optional
OPENROUTER_API_KEY=your_openrouter_key  # Alternative to Gemini
USE_OPENROUTER=0  # Set to 1 to use OpenRouter
USE_APARTMENTS_COM=0  # Set to 1 to enable Apartments.com scraper (requires Chrome)
```

**Database Migration:** Run the Supabase migration
```sql
-- In your Supabase SQL Editor, run:
-- backend/scripts/supabase_migration.sql
-- This creates the listings table, PostGIS indexes, and RPC functions
```

**Start Backend Server:**
```bash
python main.py  # Starts on http://localhost:8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:8080
```

### 4. Run Craigslist Scraper (Optional)
```bash
cd backend/scripts
python scrape_nj.py  # Populates Supabase with NJ listings
```

---

## 📡 API Endpoints

### Core Endpoints

**`GET /api/listings`** — Retrieve all available listings
- **Query Params:** `college` (optional), `limit` (default: 100)
- **Response:** Array of listing objects with address, rent, amenities, coordinates

**`GET /api/listings/:id`** — Get single listing by ID
- **Response:** Single listing object

**`POST /api/evaluate`** — Main AI agent pipeline
- **Body:** `{ address, budget, mock_data (optional) }`
- **Response:** Full `aiPayload` with all 6 agent outputs + audio streams
- **Processing Time:** 10-30 seconds (parallel agent execution + TTS generation)

**`POST /api/fairness`** — Deterministic ZORI market fairness check
- **Body:** `{ price, zip_code }`
- **Response:** `{ percentile, is_fair, market_median, explanation }`
- **Note:** No LLM required, instant response

**`POST /api/chat`** — Gemini chat with listing context
- **Body:** `{ message, listing_data, conversation_history }`
- **Response:** `{ response, sources }`

**`GET /api/tts`** — On-demand text-to-speech
- **Query Params:** `text`, `voice`
- **Response:** Base64-encoded MP3 audio

**`GET /health`** — Health check endpoint

### Agent Data Structure

The `/api/evaluate` endpoint returns this structure:

```typescript
{
  commute: {
    totalMinutes: number,
    walkMinutes: number,
    transitMinutes: number,
    routes: Array<{ mode, duration, distance }>,
    insight: string  // LLM-generated
  },
  costBreakdown: {
    baseRent: number,
    utilities: number,
    parking: number,
    petFee: number,
    insurance: number,
    total: number
  },
  budgetInsight: {
    overBudget: boolean,
    percentOfBudget: number,
    recommendation: string  // LLM-generated
  },
  historicalPercent: number,  // ZORI percentile (0-100)
  walkScore: number,          // 0-100
  safety: {
    crimeScore: number,       // 0-10 scale
    rating: string,           // "Excellent", "Good", etc.
    detail: string
  },
  trueCost: number,           // Total monthly cost
  audioStreams: {
    commute: string | null,   // Base64 MP3
    budget: string | null,
    market: string | null,
    neighborhood: string | null,
    hidden: string | null,
    kamaji: string | null
  }
}
```

---

## 🎯 Agent Architecture

See [AGENT_WIRING_REPORT.md](AGENT_WIRING_REPORT.md) for comprehensive documentation.

**Orchestration Flow:**
1. User selects listing on `/listings`
2. Frontend posts to `/api/evaluate` with address + budget
3. Backend calls `kamaji.aggregate_insights()` orchestrator
4. Kamaji spawns 5 parallel agents:
   - `commute_agent.py` → OSRM routing API
   - `budget_agent.py` → Cost extraction + LLM
   - `fairness_agent.py` → ZORI data lookup
   - `neighborhood_agent.py` → Overpass API + crime data
   - `hidden_cost_agent.py` → Fee extraction from listing text
5. Kamaji enriches results with Gemini LLM narratives
6. ElevenLabs TTS generates audio for each agent **in parallel**
7. Full payload returned to frontend
8. `/journey/:id` displays animated agent scenes with audio playback

**LLM Client (`llm_client.py`):** Routes to either Google Gemini directly or OpenRouter (configurable via `USE_OPENROUTER`).

**Voice Mapping:**
- The Conductor: `Charlie` (ElevenLabs voice ID)
- Lin: `Rachel` 
- The Baron: `Clyde`
- Kiki: `Bella`
- Soot Sprites: `Antoni`
- Kamaji: `Arnold`

---

## 📂 Project Structure

```
backend/
├── agents/                  # 6 AI agent modules
│   ├── commute_agent.py
│   ├── budget_agent.py
│   ├── fairness_agent.py
│   ├── neighborhood_agent.py
│   ├── hidden_cost_agent.py
│   └── kamaji.py            # Orchestrator
├── market_fairness/         # ZORI calculations
├── services/
│   ├── apartmentsdotcom.py  # Selenium scraper
│   ├── craigslist.py        # Craigslist scraper
│   ├── geolocate.py         # Nominatim geocoding
│   └── voice_service.py     # ElevenLabs TTS
├── scripts/
│   ├── scrape_nj.py         # Main scraper script
│   └── supabase_migration.sql  # Database setup
├── data/
│   ├── listings.csv         # Fallback listing data
│   ├── ZORI.csv            # Zillow rent index data
│   └── ZORDI.csv           # Zillow rent distribution
├── main.py                  # FastAPI + FastMCP server
├── llm_client.py           # Gemini/OpenRouter abstraction
└── requirements.txt

frontend/src/
├── pages/
│   ├── Index.tsx           # Preference input form
│   ├── Listings.tsx        # Listing grid
│   ├── ListingDetail.tsx   # Single listing view
│   ├── Journey.tsx         # Animated agent slideshow
│   ├── Summary.tsx         # Final insights dashboard
│   └── Chat.tsx            # Gemini chat interface
├── components/
│   ├── AgentScene.tsx      # Character animation + audio
│   ├── GhibliLayout.tsx    # Page shell
│   └── ListingCard.tsx
├── contexts/
│   └── PreferencesContext.tsx  # Global state (user prefs, aiPayload)
├── lib/
│   ├── api.ts              # API client
│   └── utils.ts
└── data/
    ├── agents.ts           # Agent character definitions
    ├── colleges.ts         # NJ universities
    └── mockListings.ts     # Fallback mock data
```

---

## ⚠️ Troubleshooting

### Scraper Issues
- **"Function not found" error:** Ensure you've run `supabase_migration.sql` in your Supabase SQL Editor
- **All coordinates are 0.0:** Craigslist may have changed their JSON-LD structure; check `services/craigslist.py` for extraction logic
- **Chrome driver errors:** Install Chrome and chromedriver if using `USE_APARTMENTS_COM=1`

### API Errors
- **401 Unauthorized:** Check that `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` are set correctly
- **Slow /api/evaluate:** First request is always slower due to cold start; subsequent requests are faster
- **Missing audio:** Audio is generated on-demand via `/api/tts` if pre-generated streams are null

### Frontend Issues
- **Blank aiPayload:** Ensure backend is running and `/api/evaluate` returns valid data structure
- **Audio not playing:** Check browser console for CORS errors or audio decoding issues
- **Listings not loading:** Backend may be down or Supabase connection failed; check `backend/.env`

---

## 📚 Additional Documentation

- **[CLAUDE.md](CLAUDE.md)** — Comprehensive development guide for AI assistants
- **[AGENT_WIRING_REPORT.md](AGENT_WIRING_REPORT.md)** — Detailed agent architecture documentation
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** — Database configuration guide
- **[TODO.md](TODO.md)** — Development roadmap and pending tasks

---

## ☁️ Deployment

See [backend/VULTR_DEPLOYMENT.md](backend/VULTR_DEPLOYMENT.md) for containerized deployment instructions.

**Quick Deploy:**
```bash
# Build and deploy backend
cd backend
docker build -t ghibli-nest-backend .
docker run -p 8000:8000 --env-file .env ghibli-nest-backend

# Build and deploy frontend
cd frontend
npm run build
# Deploy dist/ to static hosting (Vercel, Netlify, Cloudflare Pages)
```

---

## 🏆 Hackathon Prize Tracks

**🤖 Google Gemini Track**
- Multi-agent system powered by Gemini 2.5 Flash for narrative generation
- Real-time chat interface with full listing context
- LLM-enriched insights for commute, budget, and neighborhood analysis

**🎙️ ElevenLabs Track**
- Character-specific voice narration for all 6 agents
- Parallel TTS generation for optimal performance
- On-demand audio synthesis via `/api/tts` endpoint

**☁️ Vultr Track**
- Containerized FastAPI backend ready for Vultr deployment
- Supabase PostgreSQL + PostGIS for geo-spatial queries
- See [VULTR_DEPLOYMENT.md](backend/VULTR_DEPLOYMENT.md) for deployment guide

**💼 ADP Track**
- Budget transparency features (hidden cost extraction)
- True cost of living calculator including utilities, parking, insurance
- Financial planning insights aligned with user budgets

---

## 🙏 Acknowledgments

Built for the **AI Agents Challenge 2025** by [Your Team Name].

**Powered by:**
- Google Gemini 2.5 Flash
- ElevenLabs Voice AI
- Supabase (PostgreSQL + PostGIS)
- OpenStreetMap (Overpass API)
- OSRM Project
- Zillow Research (ZORI/ZORDI data)

**Inspired by the magical worlds of Studio Ghibli** — Spirited Away, Howl's Moving Castle, Kiki's Delivery Service, and more.

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

<div align="center">
  <p><strong>May your apartment search be as enchanting as a Ghibli film. 🏡✨</strong></p>
</div>
