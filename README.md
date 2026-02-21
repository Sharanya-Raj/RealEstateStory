# 🌳 Totoro's Nest

**The true cost of your apartment — revealed by AI spirits.**

Totoro's Nest is a multi-agent AI system that helps college students find apartments by calculating the **real monthly cost** (not just rent) and generating **data-driven negotiation emails** to landlords. The system is themed around Studio Ghibli characters, where each agent is a spirit with a specialized role.

> *"Your rent is a lie. We show you the truth."*

---

## Table of Contents

- [Project Overview](#project-overview)
- [The Problem](#the-problem)
- [System Architecture](#system-architecture)
- [The Agents (Ghibli Cast)](#the-agents-ghibli-cast)
- [MCP Server & Tool Layer](#mcp-server--tool-layer)
- [Data Flow](#data-flow)
- [State Object (PipelineState)](#state-object-pipelinestate)
- [Orchestration (LangGraph)](#orchestration-langgraph)
- [Follow-Up Chat & Selective Re-Running](#follow-up-chat--selective-re-running)
- [Performance Considerations](#performance-considerations)
- [Directory Structure](#directory-structure)
- [Tech Stack](#tech-stack)
- [API Keys Required](#api-keys-required)
- [Setup & Running](#setup--running)
- [Build Priority (Hackathon Order)](#build-priority-hackathon-order)

---

## Project Overview

Traditional apartment search tools show rent. Totoro's Nest shows the **true monthly cost** — rent plus utilities, transportation, groceries, laundry, insurance, and other hidden expenses that vary by location. It then ranks apartments by real value and lets users generate a personalized negotiation email using market data as leverage.

The system uses a **multi-agent architecture** where six AI agents collaborate through shared state, coordinated by a LangGraph orchestrator, with external tool access provided via an MCP (Model Context Protocol) server.

---

## The Problem

A student signs a lease for $1,200/month. By month's end, they're actually spending $1,740:

- $1,200 rent
- $120 utilities (higher than expected for that square footage in that zip code)
- $60 internet
- $15 renters insurance
- $30 laundry (no in-unit washer/dryer)
- $75 transit pass (no parking, no car)
- $240 groceries (no store nearby, forced to use delivery)

**The rent was $1,200. The apartment cost $1,740.** No existing tool shows this number before you sign.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    STREAMLIT FRONTEND                          │
│              (Ghibli-themed UI — soft greens, warm browns,    │
│               character avatars, forest/cloud motifs)          │
│                                                               │
│   Input Form → Spirit Status Panel → Results → Negotiator     │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              THE BATHHOUSE (Orchestrator / LangGraph)          │
│                                                               │
│   Manages agent execution order, conditional routing,         │
│   parallel branching, and selective re-running on follow-ups  │
│                                                               │
│   PipelineState flows through the graph — each agent reads    │
│   what it needs and writes its output back to state           │
└──────┬─────────┬──────────┬──────────┬──────────┬────────────┘
       │         │          │          │          │
       ▼         ▼          ▼          ▼          ▼
    Haku     No-Face     Catbus     Totoro    Calcifer
   (Scout)   (Costs)    (Commute)   (Vibe)   (Advisor)
                                                 │
                                     User picks a listing
                                                 │
                                                 ▼
                                              Yubaba
                                           (Negotiator)
       │         │          │          │          │
       └─────────┴──────────┴──────────┴──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │     MCP SERVER       │
                │  (Shared tool chest) │
                └──────────┬──────────┘
                           │
          ┌────────┬───────┼───────┬────────┐
          ▼        ▼       ▼       ▼        ▼
       Listing   Google  Google   Web     Cost
        APIs      Maps   Places  Search   Data
```

### Key Architectural Decisions

1. **MCP over hardcoded API calls.** Agents access external tools through an MCP server rather than importing API wrappers directly. This lets LLM-powered agents reason about *which* tools to call based on the situation, rather than following a fixed script.

2. **Hybrid agent design.** Not every agent needs an LLM. Two agents (No-Face, Catbus) are deterministic — pure math and API calls. Two agents (Haku, Totoro) are LLM-powered with MCP tool access. Two agents (Calcifer, Yubaba) are LLM-powered with no tool access (they synthesize data already in state). This keeps the system fast and cheap where possible, and intelligent where it matters.

3. **Shared state, not message passing.** Agents don't communicate with each other directly. They read from and write to a single `PipelineState` object that flows through the LangGraph graph. This eliminates coordination complexity.

4. **Parallel execution.** No-Face, Catbus, and Totoro are independent — they all read `listings[]` and don't depend on each other's output. They run in parallel via LangGraph branching, cutting wall-clock time significantly.

---

## The Agents (Ghibli Cast)

### 🐉 Haku — The Listing Scout

**Type:** LLM-powered with MCP tool access
**Role:** Searches for apartments matching user constraints
**Ghibli rationale:** Haku guides Chihiro through the spirit world. He knows the terrain and helps her find her way.

**Behavior:**
- Receives user constraints (zip code, budget, bedrooms, pets, car)
- Reasons about which listing sources to query (Zillow, Apartments.com, Craigslist)
- If one source returns few results, adaptively tries others or broadens the search radius
- Geocodes the school address for downstream agents
- Deduplicates and filters results
- Writes `listings[]` to state

**MCP tools used:** `zillow_search`, `apartments_com_search`, `craigslist_search`, `geocode_address`

**Why LLM-powered:** A hardcoded function always calls the same API. Haku adapts — if Zillow returns nothing for a rural college town, he tries alternative sources or expands the area. That adaptability requires reasoning.

---

### 👻 No-Face — The True Cost Analyst

**Type:** Deterministic (no LLM)
**Role:** Calculates the real monthly cost of each listing beyond rent
**Ghibli rationale:** No-Face is obsessed with consuming everything. He represents the hidden costs that silently devour your budget.

**Behavior:**
- Iterates over each listing in `listings[]`
- Calls `cost_of_living_index` tool to get local multipliers for the zip code
- Applies formulas to estimate:
  - Utilities (based on sqft × rate × local multiplier)
  - Internet
  - Renters insurance
  - Laundry costs (if no in-unit)
  - Parking or transit pass (based on car ownership)
  - Grocery costs (adjusted for local prices)
- Calculates per-person cost if roommates are specified
- Writes `cost_breakdowns[]` to state

**MCP tools used:** `cost_of_living_index`

**Why NOT LLM-powered:** This is pure arithmetic. LLMs are unreliable at math and you need these numbers to be trustworthy. The formulas are deterministic and auditable.

---

### 🚌 Catbus — The Commute Scorer

**Type:** Deterministic (no LLM)
**Role:** Calculates commute time and cost from each listing to campus
**Ghibli rationale:** Catbus is literally transportation. This one writes itself.

**Behavior:**
- For each listing, calls Google Maps Distance Matrix API for all modes: driving, transit, biking, walking
- Uses a **single batched API call per mode** with all listings as origins and campus as destination (avoids N×4 individual calls)
- Skips driving calculations if user has no car
- Identifies the best mode per listing based on user constraints
- Estimates monthly commute cost (gas for drivers, transit pass for non-drivers)
- Flags listings with commutes exceeding 60 minutes
- Writes `commute_scores[]` to state

**MCP tools used:** `get_directions`, `geocode_address`

**Why NOT LLM-powered:** Google Maps gives exact travel times. No reasoning needed — just API calls and arithmetic.

---

### 🌳 Totoro — The Neighborhood Intel

**Type:** LLM-powered with MCP tool access
**Role:** Researches neighborhood quality, walkability, safety, and vibe
**Ghibli rationale:** Totoro is the spirit of the forest. He knows the land, the trees, the feeling of a place.

**Behavior:**
- For each listing area, queries nearby amenities (groceries, gyms, pharmacies, restaurants)
- Calculates a walkability score based on amenity density
- Looks up crime statistics for the zip code
- **Adaptively decides what else to research:**
  - For well-known urban areas, amenity + crime data may be sufficient
  - For lesser-known areas, may additionally search the web for Reddit threads, blog posts, or local reviews about living in that neighborhood
- Generates a 2-sentence "vibe summary" per listing in plain English
- **Uses batched LLM calls** — sends all listings' amenity data in a single prompt and gets all vibe summaries back at once
- Writes `neighborhood_scores[]` to state

**MCP tools used:** `places_nearby`, `crime_stats`, `web_search`, `fetch_page`

**Why LLM-powered:** The research depth varies by location. Totoro decides what to investigate based on what's available — that requires reasoning, not a fixed script.

---

### 🔥 Calcifer — The Advisor

**Type:** LLM-powered, no MCP tools
**Role:** Synthesizes all agent outputs, scores, ranks, and generates recommendations
**Ghibli rationale:** Calcifer powers Howl's Moving Castle — he's the brain that makes the whole operation run. Slightly snarky, very practical.

**Behavior:**
- Reads all data from state: listings, costs, commutes, neighborhoods
- Applies a weighted composite scoring formula:
  - **Affordability: 35%** — true cost vs. budget (per-person if roommates)
  - **Commute: 25%** — shorter is better, scaled by mode
  - **Neighborhood: 20%** — walkability + safety + amenity density
  - **Features: 10%** — laundry, parking, pet-friendly, square footage
  - **Value: 10%** — what you get per dollar (composite of other scores divided by cost)
- Ranks listings by composite score
- **Uses a single batched LLM call** to generate summaries, pros, and cons for all top recommendations at once
- Highlights the biggest "surprise" per listing — the gap between rent and true cost
- Writes `recommendations[]` to state

**MCP tools used:** None — all data is already in state

**Why LLM-powered:** The ranking math is deterministic, but the plain-English summaries and pros/cons require natural language generation. Calcifer's personality (practical, slightly snarky) adds character to the output.

---

### 🧙‍♀️ Yubaba — The Negotiator

**Type:** LLM-powered, no MCP tools (or optionally with `web_search`)
**Role:** Generates a data-driven negotiation email to the landlord
**Ghibli rationale:** Yubaba controls the contracts in the bathhouse. She's powerful and intimidating, but negotiable if you come prepared with leverage.

**Trigger:** This agent does NOT run as part of the main pipeline. It activates only when the user clicks "Negotiate This One" on a specific listing.

**Behavior:**
- Receives the selected listing + all its associated data (cost breakdown, commute, neighborhood, comparable listings from the same search)
- Identifies negotiation leverage:
  - Comparable units at lower prices from the same search
  - Missing amenities that add to the tenant's true cost (no laundry = +$30/month, no parking = +$100/month)
  - Local vacancy rates or time-on-market data (if available)
  - Cost-of-living context for the area
- Generates a professional negotiation email with:
  - Specific data points as leverage (not generic templates)
  - A concrete counter-offer amount with justification
  - An exchange offer (longer lease, immediate move-in, upfront payment)
- Produces 2-3 tone variants:
  - **Polite inquiry** — softer, relationship-preserving
  - **Data-driven firm** — professional, leads with market comparisons
  - **Value exchange** — offers something in return for lower rent

**MCP tools used:** Optionally `web_search` for comparable listings or vacancy data, but can work entirely from data already in state

**Why this is the demo closer:** The email isn't a template. Every data point comes from what the other agents actually discovered. Showing a personalized, data-backed negotiation email generated from the full pipeline output is the most impressive moment in the demo.

---

## MCP Server & Tool Layer

The MCP server is a single process that exposes all external capabilities as tools. Agents discover and call tools through the MCP protocol — they see a tool name, description, and parameter schema, and the LLM decides when and how to use each tool.

### Tool Catalog

**Listing Tools:**
| Tool | Parameters | Returns |
|------|-----------|---------|
| `zillow_search` | zip_code, max_price, bedrooms, pet_friendly | List of rental listings with address, price, beds, baths, sqft, amenities |
| `apartments_com_search` | zip_code, max_price, bedrooms | Same schema as above |
| `craigslist_search` | area, max_price, keywords | Same schema, possibly less structured |

**Location Tools:**
| Tool | Parameters | Returns |
|------|-----------|---------|
| `geocode_address` | address (string) | lat, lng |
| `get_directions` | origin_lat, origin_lng, dest_lat, dest_lng, mode | duration_minutes, distance_km |
| `places_nearby` | lat, lng, type, radius_meters | List of places with name, rating, distance |

**Research Tools:**
| Tool | Parameters | Returns |
|------|-----------|---------|
| `web_search` | query | List of results with title, snippet, URL |
| `fetch_page` | url | Full page text content |

**Data Tools:**
| Tool | Parameters | Returns |
|------|-----------|---------|
| `cost_of_living_index` | zip_code | Multipliers for utilities, groceries, transport, insurance |
| `crime_stats` | zip_code | Crime rate, crime index, safety score |
| `transit_info` | zip_code | Available transit options, monthly pass prices |

### Mock Mode

Every tool has a mock implementation that returns realistic data without requiring API keys. This is controlled by a `USE_MOCK_DATA` flag in config. Mock mode allows:
- Full end-to-end development and testing without API costs
- Reliable hackathon demos even if an API goes down
- Gradual replacement — swap mock implementations for real ones one tool at a time

---

## Data Flow

```
User submits form
       │
       ▼
Orchestrator creates PipelineState with user_input
       │
       ▼
🐉 Haku (LLM + MCP tools)
  - Reasons about which listing APIs to call
  - Deduplicates, filters by constraints
  - Writes: listings[]
       │
       ▼
Orchestrator checks: any listings found?
  - No  → END with "no results" message
  - Yes → continue to parallel branch
       │
       ├──────────────────────┬──────────────────────┐
       ▼                      ▼                      ▼
 👻 No-Face              🚌 Catbus             🌳 Totoro
 (deterministic)         (deterministic)        (LLM + MCP)
 - Calls cost API        - Batched Maps API     - Places, crime,
 - Applies formulas      - All modes, all         web search
 - Writes:                 listings at once      - Batched vibe
   cost_breakdowns[]     - Writes:                summaries
                           commute_scores[]     - Writes:
       │                      │                   neighborhood_scores[]
       └──────────────────────┴──────────────────────┘
                              │
                              ▼
                        🔥 Calcifer (LLM, no tools)
                        - Reads EVERYTHING from state
                        - Composite scoring formula
                        - Batched LLM call for summaries
                        - Writes: recommendations[]
                              │
                              ▼
                        Results rendered in Streamlit
                              │
                        User clicks "Negotiate" on a listing
                              │
                              ▼
                        🧙‍♀️ Yubaba (LLM)
                        - Reads selected listing + all its data
                        - Identifies leverage points
                        - Generates email variants
                              │
                              ▼
                        Email displayed with tone variants
```

---

## State Object (PipelineState)

A single Pydantic model that flows through the entire graph. Each agent reads what it needs and writes its output.

```
PipelineState:
│
├── user_input (UserInput)
│   ├── school_name: str
│   ├── school_address: str        ← resolved by Haku via geocoding
│   ├── zip_code: str
│   ├── max_rent: float
│   ├── has_car: bool
│   ├── num_roommates: int
│   ├── pet_friendly: bool
│   ├── min_bedrooms: int
│   └── preferences: str           ← free-text from user
│
├── listings: list[Listing]         ← written by Haku
│   └── each: id, address, lat, lng, rent, beds, baths, sqft,
│            has_parking, has_laundry, pet_friendly, source
│
├── cost_breakdowns: list[CostBreakdown]    ← written by No-Face
│   └── each: listing_id, rent, utilities, internet, insurance,
│            laundry, parking_or_transit, groceries, total_monthly,
│            per_person_monthly, notes[]
│
├── commute_scores: list[CommuteScore]      ← written by Catbus
│   └── each: listing_id, driving_min, transit_min, biking_min,
│            walking_min, best_mode, best_minutes,
│            monthly_commute_cost, notes[]
│
├── neighborhood_scores: list[NeighborhoodScore]  ← written by Totoro
│   └── each: listing_id, walkability_score, safety_score,
│            nearby_groceries, nearby_restaurants, nearby_gyms,
│            nearby_pharmacies, vibe_summary, notes[]
│
├── recommendations: list[Recommendation]   ← written by Calcifer
│   └── each: rank, listing, cost_breakdown, commute,
│            neighborhood, overall_score, summary, pros[], cons[]
│
├── agent_status: dict[str, str]    ← updated by each agent
├── errors: list[str]               ← accumulated across agents
└── chat_history: list[dict]        ← for follow-up conversation
```

All cross-agent lookups are done by `listing_id`. For example, Calcifer builds lookup dicts: `costs = {c.listing_id: c for c in state.cost_breakdowns}` to match cost data to listings.

---

## Orchestration (LangGraph)

The orchestrator is a compiled LangGraph `StateGraph` that defines:

1. **Node order:** Haku → [No-Face, Catbus, Totoro in parallel] → Calcifer
2. **Conditional routing:** After Haku, check if `listings[]` is empty. If yes, short-circuit to END. If no, continue.
3. **Parallel branching:** No-Face, Catbus, and Totoro are independent nodes that branch from the same point and join before Calcifer. LangGraph executes them concurrently.
4. **State propagation:** Each node receives the full state dict, modifies its portion, and returns the updated dict. LangGraph merges the results.

Yubaba is NOT part of the main graph. She's invoked separately when the user clicks "Negotiate" on a specific listing.

### Graph Definition (Pseudocode)

```
graph = StateGraph(GraphState)

graph.add_node("haku", haku_node)
graph.add_node("noface", noface_node)
graph.add_node("catbus", catbus_node)
graph.add_node("totoro", totoro_node)
graph.add_node("calcifer", calcifer_node)

graph.set_entry_point("haku")

graph.add_conditional_edges("haku", check_listings, {
    "found":    "parallel_analysis",
    "empty":    END,
})

# Parallel branch: noface, catbus, totoro all start simultaneously
graph.add_edge("parallel_analysis", "noface")
graph.add_edge("parallel_analysis", "catbus")
graph.add_edge("parallel_analysis", "totoro")

# All three must complete before Calcifer
graph.add_edge("noface", "calcifer")
graph.add_edge("catbus", "calcifer")
graph.add_edge("totoro", "calcifer")

graph.add_edge("calcifer", END)
```

---

## Follow-Up Chat & Selective Re-Running

After results are displayed, users can ask follow-up questions. The orchestrator classifies the question type and decides what to re-run:

| Question Type | Example | What Re-Runs |
|---|---|---|
| Simple query | "Which one is closest to campus?" | Nothing — Calcifer answers from existing state |
| Constraint change (cost) | "What if I get a roommate?" | No-Face recalculates → Calcifer re-ranks |
| Constraint change (transport) | "What if I get a car?" | No-Face + Catbus recalculate → Calcifer re-ranks |
| Area change | "Show me Cambridge instead" | Entire pipeline from Haku |
| Listing-specific | "Tell me more about #3" | Nothing — Calcifer elaborates from state |
| Negotiation | "Help me negotiate #2" | Yubaba runs on the selected listing |

This selective re-running is a strong technical complexity talking point. The orchestrator doesn't blindly re-run everything — it identifies which agents' outputs are invalidated by the new constraint and only re-triggers those.

---

## Performance Considerations

### The Bottleneck: LLM Calls Per Listing

If each LLM-powered agent makes a separate call per listing, latency compounds:
- 15 listings × 3 seconds per call × 2 LLM agents = **90 seconds** (unacceptable)

### The Solution: Batched LLM Calls

Instead of calling the LLM once per listing, send all listings in a single prompt:

| Agent | Without Batching | With Batching |
|---|---|---|
| Haku | 1 call (always) | 1 call |
| No-Face | 0 LLM calls | 0 LLM calls |
| Catbus | 0 LLM calls | 0 LLM calls |
| Totoro | N calls (1 per listing) | **1 call** (all vibe summaries at once) |
| Calcifer | N calls (1 per recommendation) | **1 call** (all summaries at once) |
| Yubaba | 1 call (single listing) | 1 call |

### Estimated Pipeline Latency (With Batching)

```
Haku:                         ~3-5 sec (1 LLM call + tool calls)
No-Face + Catbus + Totoro:    ~3-5 sec (parallel; Totoro is the bottleneck)
Calcifer:                     ~3-5 sec (1 batched LLM call)
─────────────────────────────────────
Total:                        ~10-15 seconds
```

### Google Maps Optimization

Catbus uses the Distance Matrix API which accepts multiple origins in a single request. Instead of 15 listings × 4 modes = 60 API calls, make 4 calls (one per mode) with all 15 origins and one destination.

---

## Directory Structure

```
totoros-nest/
├── README.md                      # This file
├── requirements.txt               # Python dependencies
├── .env.example                   # API key template
├── config.py                      # Central configuration, constants, flags
│
├── mcp_server/                    # MCP tool server
│   ├── server.py                  # Server entry point, tool registration
│   ├── listing_tools.py           # zillow_search, apartments_com_search, craigslist_search
│   ├── location_tools.py          # geocode_address, get_directions, places_nearby
│   ├── research_tools.py          # web_search, fetch_page
│   └── data_tools.py              # cost_of_living_index, crime_stats, transit_info
│
├── agents/                        # Agent definitions
│   ├── orchestrator.py            # LangGraph StateGraph definition + runner
│   ├── haku.py                    # Listing Scout (LLM + MCP tools)
│   ├── noface.py                  # True Cost Analyst (deterministic)
│   ├── catbus.py                  # Commute Scorer (deterministic)
│   ├── totoro.py                  # Neighborhood Intel (LLM + MCP tools)
│   ├── calcifer.py                # Advisor (LLM, synthesis only)
│   └── yubaba.py                  # Negotiator (LLM, triggered on demand)
│
├── models/
│   └── schemas.py                 # Pydantic models: UserInput, Listing, CostBreakdown,
│                                  # CommuteScore, NeighborhoodScore, Recommendation,
│                                  # PipelineState
│
├── app.py                         # Streamlit frontend
└── utils.py                       # Shared helpers: LLM client, formatting, logging
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Orchestration | LangGraph | Agent graph definition, parallel branching, conditional routing, state management |
| MCP Server | MCP Python SDK | Standardized tool exposure for LLM-powered agents |
| LLM | Anthropic Claude (via langchain-anthropic) | Powers Haku, Totoro, Calcifer, Yubaba |
| Frontend | Streamlit | Rapid UI with input forms, status panels, result cards, chat |
| Data Validation | Pydantic v2 | Schema enforcement for all data flowing between agents |
| Maps/Location | Google Maps Platform (Distance Matrix, Geocoding) | Commute times, address resolution |
| Places/Amenities | Google Places API | Nearby amenities for neighborhood scoring |
| Listings | Zillow API / RentCast / Mock | Rental listing data |
| Environment | python-dotenv | API key management |

---

## API Keys Required

| Service | Used By | Required? |
|---------|---------|-----------|
| Anthropic (Claude) | Haku, Totoro, Calcifer, Yubaba | ✅ Yes (or swap for OpenAI) |
| Google Maps Platform | Catbus (directions + geocoding) | ✅ Yes |
| Google Places | Totoro (nearby amenities) | ✅ Yes |
| Zillow / RentCast | Haku (listing data) | ⬜ Optional — mock data fallback |

All tools have mock implementations. The project runs end-to-end with only an LLM API key and mock mode enabled.

---

## Setup & Running

```bash
# Clone and enter the project
cd totoros-nest

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env with your keys

# Start the MCP server (in one terminal)
python mcp_server/server.py

# Start the app (in another terminal)
streamlit run app.py
```

---

## Build Priority (Hackathon Order)

| Priority | What | Why |
|----------|------|-----|
| 1 | MCP server with mock tools | Everything else depends on this. Mock returns let you test agents without API keys. |
| 2 | Haku + Calcifer (Scout + Advisor) | Core flow: search → recommend. If only these two work, you have a demo. |
| 3 | No-Face + Catbus (Cost + Commute) | Deterministic, fast to build. Plugs into the pipeline immediately. |
| 4 | Yubaba (Negotiator) | Your demo mic-drop moment. Build before Totoro because it's simpler and more impressive. |
| 5 | Totoro (Neighborhood Intel) | Most complex agent. If time runs out, use simplified logic — it barely affects the demo. |
| 6 | Ghibli UI theming | Colors, avatars, status messages, card styling. Last because function beats form. |
| 7 | Follow-up chat + selective re-running | Cherry on top for technical complexity points. |

---

## Scoring Formula (Calcifer's Math)

```
Overall Score (0-100) =
    Affordability  (35 pts)  — how far under budget is the per-person true cost?
  + Commute        (25 pts)  — shorter best-mode commute = higher score
  + Neighborhood   (20 pts)  — walkability (0-10) + safety (0-10)
  + Features       (10 pts)  — laundry (+3), parking if car (+3), pets if needed (+2), sqft (+2)
  + Value          (10 pts)  — composite quality per dollar spent
```

Weights reflect what matters most to students: cost and commute dominate because those are daily impacts. Neighborhood and features matter but are secondary.