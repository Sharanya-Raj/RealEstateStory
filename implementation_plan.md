# Ghibli Nest: Implementation Plan

## 1. Overview & Prize Strategy
This project transforms a standard real estate dashboard into a beautiful, emotionally engaging storytelling experience inspired by Studio Ghibli. We target maximum impact by aiming for:
- **Best Overall & Best UI/UX**: Cinematic, narrative-driven interface.
- **Financial Solutions / AI & Analytics**: Multi-agent time-series analysis (ZORI/ZORDI) to predict fair value and true living costs.
- **MLH Special Prizes**: Vultr (Hosting), Gemini (Unstructured data analysis), ElevenLabs (Voiceovers).

## 2. Current Implementation Status
### What We Have:
- **Frontend Layer**: Next.js/React UI deployed with soft, watercolor CSS glassmorphism and Framer Motion context. Features a dynamic slide-show "Journey" that fetches listing data.
- **Backend Data API**: `main.py` implements a deterministic `/api/fairness` endpoint and mock data `/api/listings` endpoints on port 8000, developed by colleagues.
- **Multi-Agent LLM AI (FastMCP)**: `server.py` and `web_bridge.py` implement our core Gemini and ElevenLabs pipeline via FastMCP tools, providing sophisticated insight generation and audio clips dynamically.
- **Integration Merge**: The React UI successfully merges the deterministic team's API fetching with the Generative AI team's FastMCP payload, displaying realtime analysis if the AI is running, while safely falling back.

### What is Missing / Needs To Be Done:
- **Unify Backend Apps**: The `main.py` (data API) and `web_bridge.py` (FastMCP AI bridge) are currently two separate FastAPI apps that both try to use port 8000. They need to be unified into a single FastAPI router so the frontend only needs to point to one server.
- **Vultr Deployment**: The entire application (unified backend + built Vite frontend) needs to be containerized or cloned to the Vultr VPS instance for the final demo submission.
- **Codebase Polish**: Remove all old scraper components or local test scripts once the combined API is stabilized. Ensure `.gitignore` ignores `__pycache__` and `.env` securely.

## 3. Data Flow
1. **Frontend**: Captures address input -> sends to Backend.
2. **Backend**: Looks up Kagan mock properties or matches Zillow neighborhoods.
3. **Backend**: Runs all Agent pipelines utilizing `google-genai` and `elevenlabs`.
4. **Backend**: Packages AI scores, metrics, and character text into a single cohesive JSON object along with the `main.py` deterministic ZORI formulas.
5. **Frontend**: Receives JSON -> Animates characters and charts sequentially -> Presents the final magical story with voiceover.
