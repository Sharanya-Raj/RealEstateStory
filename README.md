<div align="center">

# 🏡 The Spirited Oracle

### *Apartment hunting, reimagined as a Ghibli film.*

**A multi-agent AI system that reveals the true cost of renting — narrated by six Studio Ghibli characters, powered by Gemini, voiced by ElevenLabs.**

<br/>

<img src="https://img.shields.io/badge/Google_Gemini_2.5_Flash-4285F4?logo=google&logoColor=white&style=for-the-badge" />
<img src="https://img.shields.io/badge/ElevenLabs_TTS-5B21B6?style=for-the-badge" />
<img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white&style=for-the-badge" />
<img src="https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=white&style=for-the-badge" />
<img src="https://img.shields.io/badge/Supabase_PostGIS-3ECF8E?logo=supabase&logoColor=white&style=for-the-badge" />

<br/><br/>

> **Built for AI Agents Challenge 2025** — targeting Google Gemini, ElevenLabs, Vultr, and ADP prize tracks.

</div>

---

## The Problem

College students renting near NJ universities face a hidden-cost minefield. A listing says **$1,400/mo** — but by the time you add utilities, parking, internet, renter's insurance, and the gym membership you need because there isn't one nearby, the real bill is **$1,850/mo**. On top of that: Is this neighborhood safe? Is the commute actually 8 minutes or 35? Is this rent fair for the ZIP code?

Nobody tells you. Until now.

---

## The Solution

The Spirited Oracle sends **six specialized AI agents** — each voiced as a beloved Ghibli character — to investigate every corner of a rental listing. They answer the questions landlords won't:

| Agent | Character | What They Uncover |
|---|---|---|
| 🚂 **The Conductor** | *Spirited Away* train | Real commute times via OSRM routing (driving, transit, biking, walking) |
| 💸 **Lin** | *Spirited Away* | True monthly cost after all hidden fees, roommate splits, budget fit |
| ⚖️ **The Baron** | *The Cat Returns* | ZORI market fairness percentile — are you being overcharged? |
| 🌿 **Kiki** | *Kiki's Delivery Service* | Walk score, safety score, nearest grocery & gym via live OpenStreetMap data |
| 🖤 **The Soot Sprites** | *Spirited Away* | Every hidden fee lurking in the listing text |
| 🔧 **Kamaji** | *Spirited Away* | Final synthesis: Spirit Match score, true cost, pros/cons, Gemini narrative |

Each agent speaks in their character's voice — literally. ElevenLabs TTS generates character-specific audio for every scene.

---

## Demo Flow

```
🏠 Enter preferences  →  📋 Browse live listings  →  🎬 Watch the agent journey  →  📊 See the full summary  →  💬 Chat with Howl
```

1. **Landing page** — cinematic Spirited Away background, choose your NJ college, set budget, commute tolerance, amenities
2. **Listings page** — real apartments scraped from Apartments.com, filtered by your preferences, pre-analyzed by the batch agent pipeline
3. **Journey** — 6 animated scenes, one per agent. Each character delivers real data-backed dialogue and plays their ElevenLabs voice
4. **Summary** — full breakdown: true cost, Spirit Match score, market percentile, pros/cons, cost chart
5. **Chat** — Howl (from *Howl's Moving Castle*) answers follow-up questions about the listing using Gemini with full listing context

---

## Technical Architecture

### The Agent Pipeline

The system runs two pipelines depending on the use case:

**Batch Pipeline** (`aggregate_insights_batch`) — for the listings page:
```
1 Nominatim geocode batch      (all listing addresses at once)
         ↓
1 OSRM routing table query     (all apartments → college, 1 API call)
         ↓
1 Overpass bbox query          (ALL gyms, groceries, transit, police across all listings)
         ↓
Deterministic per-listing:     budget fit, ZORI fairness, hidden cost extraction
         ↓
1 batched Gemini call          (8 listings per chunk — narrative insights for all)
         ↓
Merged result object per listing
```

**Single Pipeline** (`aggregate_insights`) — for individual deep-dive:
```
commute_agent   →  OSRM + Gemini LLM data padding
budget_agent    →  cost extraction + budget fit score
fairness_agent  →  ZORI/ZORDI percentile lookup (deterministic, no LLM)
neighborhood_agent → Overpass API + distance-weighted walk score + Jacobs-effect crime score
hidden_cost_agent  → structured fee extraction from listing text
         ↓
Kamaji orchestrates → Gemini LLM summary → ElevenLabs TTS (6 voices, parallel)
```

### Walk Score Algorithm

The walk score isn't a third-party lookup — it's computed in-house from real OpenStreetMap data:

```python
# Distance-weighted scoring (mirrors Walk Score methodology)
score = 35  # car-dependent baseline
for element in overpass_results:
    weight = 1.0 if dist < 0.4km else 0.6 if dist < 0.8km else 0.3 if dist < 1.6km else 0
    if bus_stop:     score += 6.0 * weight
    if supermarket:  score += 8.0 * weight
    if gym:          score += 4.0 * weight
    if restaurant:   score += 1.5 * weight
    if shop:         score += 3.0 * weight
```

### Crime Score — The Jacobs Effect

Safety is derived from two OSM signals (no proprietary crime data needed):

1. **Emergency-response proximity** — distance to nearest police/fire station (60% weight)
2. **Active-street density** — restaurants and bus stops within 1 km correlate with natural surveillance and lower residential crime (Jane Jacobs' "eyes on the street", 40% weight)

### Market Fairness — ZORI Data

The Baron agent compares each listing against the **Zillow Observed Rent Index (ZORI)** dataset — a ZIP-code-level rent index. The fairness score is entirely deterministic (no LLM call), computing a percentile position from the ZORDI distribution data:

```
Listed rent → ZORI median for ZIP → percentile → fairness score (0–100)
```

### LLM Layer — Gemini 2.5 Flash

Gemini is used for three purposes:
- **Data completion**: Fill in walk score / driving time estimates for listings where Overpass/OSRM returns no data
- **Narrative generation**: Character-voiced insights per agent (batch-processed, 8 listings per call)
- **Final synthesis**: Kamaji's 2-sentence verdict as the boiler room supervisor from Spirited Away

All LLM calls are routed through a shared `llm_client.py` that supports both Google Gemini directly and OpenRouter as a drop-in alternative.

### ElevenLabs TTS

Each agent has a dedicated ElevenLabs voice ID. TTS generation happens on-demand via `GET /api/tts?text=...&agent=commute` — streamed as MP3 directly to the browser. The frontend plays audio per scene in the Journey slideshow.

### Data Sources

| Source | Used For |
|---|---|
| **Apartments.com** (Selenium scraper) | Live NJ listings near 20+ universities |
| **Supabase + PostGIS** | Persistent listing storage, geo-spatial queries |
| **OSRM** (open-source routing) | Driving/transit commute time calculations |
| **Overpass API** (OpenStreetMap) | Gyms, groceries, restaurants, transit stops, police stations |
| **Nominatim** | Geocoding listing addresses and college campuses |
| **ZORI / ZORDI CSV** | Zillow rent index for market fairness analysis |
| **CSV fallback** | Offline mode when all live sources fail |

---

## Full Stack

### Backend (FastAPI — port 8000)

```
backend/
├── main.py                    FastAPI app + FastMCP server + all REST endpoints
├── agents/
│   ├── kamaji.py              Orchestrator — batch + single pipelines
│   ├── commute_agent.py       OSRM routing, commute matrix
│   ├── budget_agent.py        Hidden cost detection, budget fit score
│   ├── fairness_agent.py      ZORI percentile analysis (deterministic)
│   ├── neighborhood_agent.py  Overpass API, walk score, crime score
│   └── hidden_cost_agent.py   Fee extraction from listing text
├── market_fairness/           ZORI calculations — schema, handler, data_access
├── services/
│   ├── apartmentsdotcom.py    Selenium scraper
│   ├── geolocate.py           Nominatim geocoding + batch geocode with caching
│   └── voice_service.py       ElevenLabs TTS
├── llm_client.py              Gemini / OpenRouter abstraction
├── data_loader.py             CSV fallback
└── db.py                      Supabase PostGIS client
```

### Frontend (Vite + React 18 — port 8080)

```
frontend/src/
├── pages/
│   ├── SpiritedOracle.tsx     Preference form — dual-range slider, Spirited Away bg
│   ├── Listings.tsx           Grid of analyzed listings with Spirit Match badges
│   ├── Journey.tsx            Animated 6-scene agent slideshow
│   ├── Summary.tsx            Full insights dashboard, cost breakdown chart
│   └── Chat.tsx               Howl chat — Gemini with full listing context
├── components/
│   ├── AgentScene.tsx         Character animation + ElevenLabs audio player
│   └── GhibliLayout.tsx       Glassmorphism page shell
└── contexts/
    └── PreferencesContext.tsx Global state: user prefs, cached listings, aiPayload
```

**UI highlights:**
- Animated particle system on landing page
- Kinetic word-by-word title reveal (Framer Motion)
- Spotlight hover effect on glass cards (tracks mouse position)
- Floating Ghibli background orbs
- **Live/CSV toggle** — switch between live Apartments.com scraping and instant CSV mode without restarting anything

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/pipeline` | Full scrape → agents → return analyzed listings in one call |
| `POST` | `/api/evaluate` | Run all 6 agents on a single listing |
| `POST` | `/api/evaluate-batch` | Batch agent analysis (1 geocode + 1 OSRM + 1 Overpass for N listings) |
| `GET`  | `/api/listings` | Get listings (Apartments.com → Supabase → CSV priority chain) |
| `GET`  | `/api/listings/:id` | Single listing by ID |
| `POST` | `/api/fairness` | Deterministic ZORI market fairness (no LLM, instant) |
| `GET`  | `/api/tts` | ElevenLabs TTS stream — `?text=...&agent=commute` |
| `POST` | `/api/chat` | Howl chat with listing context (Gemini) |
| `GET`  | `/health` | Health check |

---

## Setup

### Prerequisites
- Python 3.11+, Node.js 18+
- Chrome + chromedriver (for Apartments.com scraper)
- API keys: Google Gemini, ElevenLabs

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # fill in keys
python main.py          # starts on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # starts on http://localhost:8080
```

### Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini 2.5 Flash (narrative + chat) |
| `ELEVENLABS_API_KEY` | Yes | Character voice TTS |
| `SUPABASE_URL` + `SUPABASE_KEY` | Optional | Persistent listing storage |
| `OPENROUTER_API_KEY` + `USE_OPENROUTER=1` | Optional | OpenRouter as Gemini alternative |
| `USE_APARTMENTS_COM` | Optional | `0` to disable scraper, use CSV only |

**No Supabase? No problem.** The app gracefully falls back to a bundled CSV of NJ listings — all 6 agents still run full analysis.

---

## What Makes This Different

Most apartment tools give you a list. We give you a **story**.

Instead of scanning a table of specs, you sit with each Ghibli character as they reveal their findings — The Conductor announces your commute like a train departure, Kiki flies over the neighborhood on her broom, The Soot Sprites dig through the fine print for fees the landlord buried. Every data point is real (OSRM routing, OpenStreetMap amenities, ZORI rent index), but delivered through a cinematic, character-driven experience.

The technical result is a system that answers questions apartment hunters actually care about:

> *"My listed rent is $1,500 — but what will I actually spend each month, including the gym I'll need, the utilities that aren't included, and the $80 parking the description mentioned once?"*

The Spirited Oracle answers that question with a Spirit Match score, a true cost breakdown, a ZORI market percentile, and a neighborhood vibe summary — all narrated in character.

---

## Architecture Diagram

```
User Input (college, budget, preferences)
         │
         ▼
GET /api/listings          POST /api/pipeline
         │                        │
   ┌─────┴──────────────────────┐
   │     Data Sources           │
   │  Apartments.com (Selenium) │
   │  Supabase PostGIS          │
   │  CSV fallback              │
   └─────┬──────────────────────┘
         │
         ▼
aggregate_insights_batch()
   ├── Nominatim (geocode all addresses, 1 batch)
   ├── OSRM     (commute matrix, 1 API call)
   ├── Overpass (bbox query, 1 API call for ALL listings)
   ├── ZORI     (deterministic, no API)
   └── Gemini   (batched narratives, 8 listings/chunk)
         │
         ▼
Listings page (with Spirit Match scores)
         │
    User selects listing
         │
         ▼
Journey (6 animated agent scenes)
   ├── 🚂 Conductor  →  ElevenLabs Charlie voice
   ├── 💸 Lin        →  ElevenLabs Rachel voice
   ├── ⚖️ Baron      →  ElevenLabs Clyde voice
   ├── 🌿 Kiki       →  ElevenLabs Bella voice
   ├── 🖤 Soot Sprites → ElevenLabs Antoni voice
   └── 🔧 Kamaji     →  ElevenLabs Arnold voice
         │
         ▼
Summary dashboard → Chat with Howl (Gemini)
```

---

## Project Structure

```
RealEstateStory/
├── backend/
│   ├── agents/               6 AI agent modules + Kamaji orchestrator
│   ├── market_fairness/      Deterministic ZORI rent fairness module
│   ├── services/             Scraper, geocoding, TTS
│   ├── data/                 listings.csv, ZORI.csv, ZORDI.csv
│   ├── scripts/              DB migration SQL, NJ scraper script
│   ├── main.py               FastAPI + FastMCP entry point
│   └── llm_client.py         Gemini/OpenRouter abstraction
├── frontend/src/
│   ├── pages/                5 route pages (Oracle → Listings → Journey → Summary → Chat)
│   ├── components/           AgentScene, GhibliLayout, MagneticButton
│   ├── contexts/             PreferencesContext (global state)
│   └── data/                 agents.ts, colleges.ts, mockListings.ts
└── README.md
```

---

## Additional Documentation

- **[CLAUDE.md](CLAUDE.md)** — Full development guide for AI-assisted contributors
- **[AGENT_WIRING_REPORT.md](AGENT_WIRING_REPORT.md)** — Deep-dive agent architecture
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** — PostGIS database setup

---

<div align="center">

**May your apartment search be as enchanting as a Ghibli film. 🏡**

*Inspired by Spirited Away, Kiki's Delivery Service, The Cat Returns, and Howl's Moving Castle.*

</div>
