<div align="center">
  <h1>🌤️ The Spirited Oracle</h1>
  <p><strong>A magical real estate platform — where every home tells a story.</strong></p>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.0-4285F4?logo=google" alt="Gemini" />
</div>

<br />

Welcome to **The Spirited Oracle**, a magical apartment-hunting experience inspired by the airy, cinematic daytime aesthetic of Studio Ghibli. 

We transform the often stressful and opaque process of finding a home into a premium, transparent journey. The Oracle uses a multi-agent AI system to reveal the **true essence** of a property — analyzing commute times, true monthly costs, neighborhood vibes, and market fairness.

---

## 🎨 Aesthetic & Vibe
- **Theme:** "Daytime Studio Ghibli" — focused on Pastel Blues, Sky Blues, and Soft Whites.
- **UI:** Ultra-premium Light Mode Glassmorphism with `backdrop-blur-2xl` and soft, diffused shadows.
- **Experience:** Airy, cinematic, and welcoming. Zero dark mode, zero black backgrounds.

---

## 🛠️ System Architecture

- **Frontend:** Built with **Vite + React + TypeScript**, styled with Tailwind CSS. Uses **Framer Motion** for smooth, kinetic transitions and **Lucide React** for soft, themed iconography.
- **Backend:** A **FastAPI** service serving property data and coordinating AI agent evaluations.
- **AI Engine:** Powered by **Google Gemini**, providing deep insights into property fairness and neighborhood context.

### The Journey Agents
1. 🚂 **The Conductor:** Calculates your trek to campus and evaluates transit options.
2. 💫 **The Steward:** Uncovers hidden living costs and creates a true budget breakdown.
3. 🎩 **The Appraiser:** Consults the "Great Ledger" to determine if rent is fair relative to the market.
4. 🧹 **The Pathfinder:** Explores the neighborhood for safety, groceries, and walkability.
5. 🕷️ **The Auditor:** Inspects the fine print for omitted fees and security deposit details.
6. ♨️ **The Oracle:** The final orchestrator. Synthesizes all insights into a cohesive "Vibe Check" for your future sanctuary.

---

## 🚀 Setup & Local Development

### 1. Requirements
* Node.js (v18+)
* Python (3.11+)

### 2. Backend API Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Unix/macOS
source venv/bin/activate
pip install -r requirements.txt

# Configure your .env
cp .env.example .env
```
Ensure your `GEMINI_API_KEY` is set in the `.env` file.

Run the API:
```bash
python main.py
```
*(Backend starts on `http://localhost:8000`)*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*(Frontend starts on `http://localhost:8080`)*

Open your browser to `http://localhost:8080` to begin your journey.

---

## ☁️ Deployment
The platform is designed for containerized deployment, with a focus on high-uptime environments. Refer to `deploy.sh` for standard deployment orchestration steps.
