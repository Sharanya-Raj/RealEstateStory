# Vultr Deployment Guide

This project features an AI-native backend running on **FastMCP** (Model Context Protocol), integrated with Gemini 2.5 Flash and ElevenLabs. 
This guide details how to deploy the backend container to a Vultr cloud instance so the React frontend can consume its intelligence API.

## 1. Provision a Vultr Compute Instance
1. Log into your [Vultr Account](https://my.vultr.com/).
2. Click **Deploy New Server**.
3. Choose **Cloud Compute** -> **Regular Performance** (or optimized based on budget).
4. Under **Server Image**, choose **Marketplace Apps** -> **Docker** (Ubuntu).
5. Deploy and wait for the IP address to be assigned.

## 2. Deploy the Container
1. SSH into your newly created Vultr server:
   ```bash
   ssh root@<YOUR_VULTR_IP>
   ```
2. Clone your GhibliNest GitHub repository:
   ```bash
   git clone <YOUR_REPO_URL>
   cd GhibliNest/backend
   ```
3. Generate the mock 500-listing Kaggle dataset locally before building (or run this securely on local and push the `data` folder):
   ```bash
   python scripts/generate_listings.py
   ```
4. Build the Docker container:
   ```bash
   docker build -t ghiblinest-backend .
   ```
5. Run the Docker container, passing in your API Keys as Environment Variables:
   ```bash
   docker run -d -p 8000:8000 \
     -e GEMINI_API_KEY="your_gemini_key_here" \
     -e ELEVENLABS_API_KEY="your_elevenlabs_key_here" \
     --name ghiblinest-api \
     ghiblinest-backend
   ```

## 3. Connect the Frontend
In your frontend `.env` file or hardcoded config, point the FastMCP bridge target IP to your new Vultr server:

```typescript
// frontend/src/pages/Results.tsx
const response = await fetch("http://<YOUR_VULTR_IP>:8000/api/evaluate", { ... })
```

Build and host the Vite frontend (on Vercel, Netlify, or a separate Vultr instance).
