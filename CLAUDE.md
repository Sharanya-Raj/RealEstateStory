# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ghibli Nest** — A multi-agent AI system that analyzes apartments and reveals their true monthly cost through a Studio Ghibli-themed storytelling UI. Built for a hackathon targeting Google Gemini, ElevenLabs, Vultr, and ADP prize tracks.

## Development Commands

### Backend (Python/FastAPI — port 8000)
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in API keys
python main.py                # starts uvicorn on port 8000 with reload
```

### Frontend (Vite/React — port 8080)
```bash
cd frontend
npm install
npm run dev       # development server
npm run build     # production build
npm run lint      # ESLint
npm test          # vitest run (single pass)
npm run test:watch  # vitest in watch mode
```

## Architecture

### Data Flow
1. User inputs preferences on `/` (Index page) → stored in `PreferencesContext`
2. `/listings` fetches `GET /api/listings` → renders listing cards
3. Selecting a listing posts `POST /api/evaluate` with listing data → backend runs 6 Ghibli agents
4. Results are stored in `PreferencesContext.aiPayload` and drive the `/journey/:id` slide show
5. `/summary/:id` displays the final compiled insights; `/chat/:id` provides a Gemini chat interface

### Backend (`backend/`)

**Entry point:** `main.py` — single unified FastAPI app that imports and mounts both the REST endpoints and the FastMCP server (`server.py`).

**API endpoints:**
- `GET /api/listings` — reads `data/listings.csv`, returns up to 100 listings in frontend shape
- `GET /api/listings/:id` — single listing lookup
- `POST /api/evaluate` — main AI pipeline endpoint; accepts `{address, budget, mock_data}` and returns the full agent output
- `POST /api/fairness` — deterministic ZORI market fairness check (no LLM)
- `GET /health`

**Agent pipeline (`agents/`):** Orchestrated by `kamaji.py → aggregate_insights()`:
1. `commute_agent.py` — Conductor: transit/walk analysis
2. `budget_agent.py` — Lin: hidden cost vs. budget
3. `fairness_agent.py` — Baron: ZORI percentile analysis
4. `neighborhood_agent.py` — Kiki: crime, walkability, amenities (uses Overpass API)
5. `hidden_cost_agent.py` — Soot Sprites: fee extraction
6. `kamaji.py` — synthesizes all 5 outputs, calls Gemini for LLM padding and summary, then calls ElevenLabs TTS for all 6 agents **in parallel** via `ThreadPoolExecutor`

**LLM client (`llm_client.py`):** Shared abstraction that routes to either Google Gemini directly (`GEMINI_API_KEY`) or via OpenRouter (`OPENROUTER_API_KEY` + `USE_OPENROUTER=1`).

**Market fairness module (`market_fairness/`):** Deterministic ZORI calculations — `schema.py` (Pydantic models), `handler.py`, `calculations.py`, `data_access.py`, `formatter.py`.

**Services (`services/`):** `apartmentsdotcom.py` (Selenium scraper, requires Chrome) and `geolocate.py` (Nominatim geocoding). Apartments.com scraping is enabled by default; disable with `USE_APARTMENTS_COM=0`.

**Field name translation:** The frontend sends camelCase (`price`, `walkScore`, `crimeScore`) but agents expect snake_case (`base_rent`, `walk_score`, `crime_rating`). `_translate_frontend_to_backend()` in `main.py` bridges this gap.

### Frontend (`frontend/src/`)

**Routing (`App.tsx`):** React Router v6 — `/`, `/listings`, `/listing/:id`, `/journey/:id`, `/summary/:id`, `/chat/:id`

**Global state (`contexts/PreferencesContext.tsx`):** Holds `UserPreferences` (college, budget range, commute prefs), `selectedListingId`, and `aiPayload` (the full backend response from `/api/evaluate`).

**Pages:** `Index` (preference form) → `Listings` → `ListingDetail` → `Journey` (animated agent slideshow with Framer Motion) → `Summary` → `Chat`

**Components:** `GhibliLayout` (page shell), `AgentScene` (animated character + audio player per agent), `ListingCard`, `ChatInterface`, `MagneticButton`, `NavLink`

**Mock data (`src/data/`):** `mockListings.ts`, `colleges.ts`, `agents.ts` (agent character definitions used by AgentScene)

**Styling:** Tailwind CSS with custom Ghibli palette (`ghibli-meadow` #A6D784, `ghibli-sky` #8FB1E9, etc.), glassmorphism effects, Framer Motion animations. Path alias `@/` maps to `src/`.

## Required Environment Variables

Create `backend/.env` from `.env.example`:

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini direct API |
| `ELEVENLABS_API_KEY` | Yes | TTS audio generation |
| `OPENROUTER_API_KEY` | Optional | Use OpenRouter instead of direct Gemini |
| `USE_OPENROUTER` | Optional | Set to `1` to route LLM calls through OpenRouter |
| `USE_APARTMENTS_COM` | Optional | Set to `0` to disable Selenium scraper |

## Key Constraints

- The backend must run **before** the frontend can fetch real data; the frontend has mock data fallbacks in `src/data/`.
- The `aggregate_insights` return shape must match what the frontend pages expect — `kamaji.py` is the source of truth for the response contract.
- ElevenLabs TTS returns base64-encoded MP3 chunks stored in `audioStreams` per agent key (`commute`, `budget`, `market`, `neighborhood`, `hidden`, `kamaji`).
- The Apartments.com scraper (`services/apartmentsdotcom.py`) requires Chrome and chromedriver to be installed.
