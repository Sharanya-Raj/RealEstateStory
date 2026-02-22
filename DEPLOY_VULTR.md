# 🚀 Ghibli Nest - Vultr Deployment Guide

Complete guide to deploying Ghibli Nest on Vultr Cloud. This project uses FastAPI backend + React frontend with AI agents powered by Google Gemini and ElevenLabs.

## Prerequisites

Before you begin, gather these API keys:
- ✅ **GEMINI_API_KEY** — Get from [Google AI Studio](https://aistudio.google.com/apikey)
- ✅ **ELEVENLABS_API_KEY** — Get from [ElevenLabs](https://elevenlabs.io)
- ✅ **SUPABASE_URL & SUPABASE_KEY** — Get from [Supabase Dashboard](https://supabase.com/dashboard)
- ✅ A GitHub repo with your code pushed

## Deployment Options

Choose between two deployment methods:

### Option A: Docker Deployment (Recommended)
Fast and isolated. Uses Docker Compose to spin up the full stack.

### Option B: Direct Deployment
Traditional approach using PM2 and Nginx. Good for debugging.

---

## 🐳 Option A: Docker Deployment

### Step 1: Provision Vultr Instance

1. Log into [Vultr Dashboard](https://my.vultr.com/)
2. Click **Deploy New Server** → **Cloud Compute**
3. Choose **Docker** from Marketplace Apps (Ubuntu 22.04)
4. Server size: **Regular Performance** - $12/mo (2 vCPU, 4GB RAM) recommended
5. Deploy and note your IP address

### Step 2: SSH Into Your Server

```bash
ssh root@YOUR_VULTR_IP
```

### Step 3: Clone and Configure

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/RealEstateStory.git
cd RealEstateStory

# Create production environment file
cp .env.example .env.production
nano .env.production
```

**Edit `.env.production`** with your actual API keys:
```env
GEMINI_API_KEY=your_actual_gemini_key
ELEVENLABS_API_KEY=your_actual_elevenlabs_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
USE_OPENROUTER=0
USE_APARTMENTS_COM=0
USE_MOCK_DATA=0
USE_MCP_CLIENT=1
```

### Step 4: Deploy with Docker Compose

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

Your app is now live at:
- **Frontend:** `http://YOUR_VULTR_IP:8080`
- **Backend API:** `http://YOUR_VULTR_IP:8000`
- **Health Check:** `http://YOUR_VULTR_IP:8000/health`

### Step 5: Configure Domain (Optional)

Point your domain's A record to `YOUR_VULTR_IP`, then set up Nginx reverse proxy:

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/ghiblinest
```

Paste this configuration (replace `yourdomain.com`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/ghiblinest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔧 Option B: Direct Deployment

### Step 1: Provision Vultr Instance

1. Log into [Vultr Dashboard](https://my.vultr.com/)
2. Click **Deploy New Server** → **Cloud Compute**
3. Choose **Ubuntu 22.04 LTS** (regular image, not Docker)
4. Server size: **Regular Performance** - $12/mo recommended
5. Deploy and note your IP address

### Step 2: Run Automated Setup Script

```bash
# SSH into server
ssh root@YOUR_VULTR_IP

# Clone repository
git clone https://github.com/YOUR_USERNAME/RealEstateStory.git
cd RealEstateStory

# Make deploy script executable
chmod +x deploy.sh

# Set up environment before running
cp .env.example backend/.env
nano backend/.env  # Add your API keys

# Run deployment script
./deploy.sh
```

The script will:
- Install Node.js, Python, Nginx
- Set up Python virtual environment
- Install all dependencies
- Configure PM2 process manager
- Set up Nginx reverse proxy
- Build and serve frontend

### Step 3: Configure Environment

After setup, ensure your environment is configured:
```bash
cd ~/RealEstateStory/backend
nano .env
```

Add your production keys, then restart:
```bash
pm2 restart ghiblinest-api
pm2 save
```

### Step 4: SSL Certificate (Production)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx
```

---

## 📊 Post-Deployment

### Verify Everything Works

```bash
# Check backend health
curl http://YOUR_VULTR_IP:8000/health

# Check PM2 status (if using Option B)
pm2 status

# Check Docker status (if using Option A)
docker-compose -f docker-compose.prod.yml ps

# View logs (Docker)
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# View logs (Direct)
pm2 logs ghiblinest-api
```

### Set Up Monitoring

```bash
# Enable PM2 startup on reboot (Option B)
pm2 startup
pm2 save

# Enable Docker restart on reboot (Option A)
docker update --restart unless-stopped $(docker ps -q)
```

### Update Frontend API URL

If your backend is on a different domain/IP, update the frontend:

1. Rebuild frontend with production API URL:
```bash
cd frontend
VITE_API_URL=https://api.yourdomain.com npm run build
```

2. Or update it in docker-compose.prod.yml before deploying

---

## 🐛 Troubleshooting

### Backend not starting
```bash
# Check logs
pm2 logs ghiblinest-api  # Option B
docker-compose -f docker-compose.prod.yml logs backend  # Option A

# Common issue: Missing API keys
nano backend/.env  # Verify all keys are present
```

### Frontend can't reach backend
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check Nginx config (if using reverse proxy)
sudo nginx -t
sudo systemctl status nginx

# Verify CORS settings in backend/main.py
```

### Port already in use
```bash
# Find process using port 8000
sudo lsof -i :8000
sudo kill -9 <PID>

# Restart service
pm2 restart ghiblinest-api  # or docker-compose restart
```

### Out of memory
```bash
# Check memory usage
free -h

# Restart services to free memory
pm2 restart all
# or
docker-compose -f docker-compose.prod.yml restart
```

---

## 🔄 Updating Your Deployment

### Quick Update (Code Changes)

```bash
cd ~/RealEstateStory
git pull origin main

# Option A (Docker)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Option B (Direct)
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart ghiblinest-api

cd ../frontend
npm install
npm run build
```

### Database Migrations

If you've updated Supabase schema:
```bash
cd backend/scripts
python run_migration.py
```

---

## 💰 Cost Estimate

| Service | Cost | Notes |
|---------|------|-------|
| Vultr Compute (4GB) | $12/mo | Recommended for production |
| Vultr Compute (2GB) | $6/mo | Minimum for light traffic |
| Supabase | Free | Up to 500MB database |
| Google Gemini API | Pay-per-use | ~$0.07 per 1K requests (Flash) |
| ElevenLabs TTS | ~$5/mo | 30K characters free tier |
| **Total** | **$12-18/mo** | Depending on API usage |

---

## 🎯 Next Steps

1. **Set up GitHub Actions** for automated deployment on push
2. **Configure rate limiting** to protect your API keys
3. **Set up monitoring** with Uptime Robot or similar
4. **Enable backups** for your Vultr instance
5. **Add Google Analytics** to track frontend usage

---

## 📞 Support

- Check [CLAUDE.md](./CLAUDE.md) for project architecture
- Review [README.md](./README.md) for feature documentation
- Open an issue on GitHub for bugs

---

**You're all set! 🎉** Your Ghibli Nest AI apartment finder is now live on Vultr.
