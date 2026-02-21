<div align="center">
  <h1>🍃 Ghibli Nest</h1>
  <p><strong>The true cost of your apartment — revealed by AI spirits.</strong></p>
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/ElevenLabs-TTS-black" alt="ElevenLabs" />
  <img src="https://img.shields.io/badge/Vultr-Cloud_Deployed-0051ff?logo=vultr" alt="Vultr" />
</div>

<br />

Welcome to **Ghibli Nest**, a multi-agent AI system that transforms the stressful, opaque apartment hunting process into a magical, transparent storytelling experience.

Traditional apartment search tools only show you the base rent. Ghibli Nest shows you the **true monthly cost** by deeply analyzing utilities, neighborhood walk scores, hidden fees, and historical Zillow rent indices. Our ensemble of 6 Studio Ghibli-inspired AI Agents calculates everything and guides you home.

> *"Your rent is a lie. We show you the truth."*

---

## 🏆 Hackathon Prize Tracks & Integrations

1. **Google Gemini (Best Use of AI):** We deeply integrated the `gemini-2.5-flash` model via the **FastMCP** protocol. If our traditional datasets (ZORI/Kaggle) are missing data points, Gemini dynamically uses its world knowledge to hallucinate and fill in educated real estate estimates (like a neighborhood's walk score or historical pricing) to ensure a flawless experience.
2. **ElevenLabs (Audio Synthesis):** The final synthesis agent (Kamaji) streams a custom voiceover MP3 using the ElevenLabs TTS API, seamlessly narrating your custom property match.
3. **Vultr (Best Deployment):** The entire application is containerized and designed for a robust, permanent deployment on a Vultr VPS Cloud Instance using Docker and PM2.
4. **ADP (Hack the Sales Journey):** By exposing the *true* cost and the Zillow ZORI market percentiles, we give buyers the definitive leverage they need to negotiate fairer prices with landlords.

---

## 🛠️ System Architecture

Ghibli Nest is a unified, full-stack application.
- **Frontend Layer:** `Next.js` and `React`, styled with a bespoke glassmorphism Ghibli aesthetic (`#A6D784` Meadow, `#8FB1E9` Sky). Uses Framer Motion for cinematic slide transitions.
- **Backend Layer:** A single `FastAPI` instance (`main.py`) running on Python Uvicorn. It acts as a central router serving both the deterministic Hackathon API arrays, and the FastMCP Agent server. 
- **AI Tool Layer:** Evaluates properties by triggering the `FastMCP` execution pipeline which coordinates 6 specialized agents. 

### The Agents (Ghibli Cast)
1. 🚂 **Conductor (Commute):** Evaluates distance and local transit transit options to campus.
2. 💫 **Lin (Budget):** Maps out the hidden living costs (internet, utilities, etc.) vs. your base rent.
3. 🎩 **The Baron (Fair Market):** Analyzes Zillow Observed Rent Index (ZORI) to identify whether the unit is overpriced relative to the neighborhood percentile.
4. 🧹 **Kiki (Neighborhood):** Scores crime rates, local grocery access, and walkability.
5. 🕷️ **Soot Sprites (Hidden Costs):** Hunts the fine print for omitted parking fees and security deposits.
6. ♨️ **Kamaji (Synthesis):** The orchestrator. He rolls up all 5 sub-analyses, applies a final Gemini "Vibe Check", and speaks the results using ElevenLabs TTS.

---

## 🚀 Setup & Local Development

### 1. Requirements
* Node.js (v18+)
* Python (3.11+)

### 2. Backend API Setup
Clone the repository, enter the backend, and configure your keys:
```bash
cd GhibliNest/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```
Open `.env` and insert your API Keys:
* `GEMINI_API_KEY`: Get this from Google AI Studio.
* `ELEVENLABS_API_KEY`: Get this from your ElevenLabs Profile.

Run the API:
```bash
python main.py
```
*(The unified backend will start on `http://localhost:8000`)*

### 3. Frontend Setup
Open a second terminal:
```bash
cd GhibliNest/frontend
npm install
npm run dev
```
*(The React UI will start on `http://localhost:8080`)*

Open your browser to `http://localhost:8080`, submit an apartment address, and enjoy the journey!

---

## ☁️ Vultr Cloud Deployment

We have included a 1-click bash script to automatically deploy Ghibli Nest to a fresh Ubuntu 22.04 LTS instance on Vultr. 

1. Provision a Vultr Compute instance.
2. SSH into your instance.
3. Clone this repository and run the setup script:
```bash
git clone <your-repo>
cd GhibliNest
bash deploy.sh
```
This script will automatically install Nginx, Node, and Python, build the React production output, and spin up the FastAPI server via PM2 to ensure permanent uptime for the judges!