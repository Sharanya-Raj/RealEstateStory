# 📋 Pre-Deployment Checklist

Complete this checklist before deploying Ghibli Nest to Vultr.

## ✅ Prerequisites

### API Keys & Services
- [ ] **Google Gemini API Key** obtained from [Google AI Studio](https://aistudio.google.com/apikey)
  - Test it works: Check API usage dashboard
  - Note: Free tier includes 15 requests per minute
  
- [ ] **ElevenLabs API Key** obtained from [ElevenLabs](https://elevenlabs.io)
  - Test it works: Generate a test audio
  - Check available characters quota
  
- [ ] **Supabase Account** set up at [Supabase](https://supabase.com)
  - Project created
  - PostGIS extension enabled
  - Database schema migrated (run `backend/scripts/run_migration.py`)
  - Sample data loaded (optional: run `backend/scripts/seed_from_csv.py`)
  
- [ ] **Vultr Account** created at [Vultr](https://vultr.com)
  - Payment method added
  - Server location chosen (preferably close to your target users)

### Local Testing
- [ ] Backend runs successfully locally
  ```bash
  cd backend
  source venv/bin/activate  # or .\venv\Scripts\activate on Windows
  python main.py
  # Should start on http://localhost:8000
  ```
  
- [ ] Frontend runs successfully locally
  ```bash
  cd frontend
  npm install
  npm run dev
  # Should start on http://localhost:8080
  ```
  
- [ ] Test full flow end-to-end:
  - [ ] Enter preferences on homepage
  - [ ] View listings
  - [ ] Select a listing and evaluate
  - [ ] All 6 agents return results
  - [ ] Audio plays for at least one agent
  - [ ] Chat interface works

### Code Ready
- [ ] All changes committed to Git
  ```bash
  git status  # Should show clean working tree
  ```
  
- [ ] Latest code pushed to GitHub
  ```bash
  git push origin main
  ```
  
- [ ] `.env` files excluded from Git (check `.gitignore`)
  ```bash
  git check-ignore .env .env.production backend/.env
  # Should show all three files are ignored
  ```

### Configuration Files
- [ ] `.env.example` exists and is up-to-date
- [ ] `.env.production.example` created with production template
- [ ] `deploy.sh` is executable (`chmod +x deploy.sh`)
- [ ] `deploy-docker.sh` is executable (`chmod +x deploy-docker.sh`)
- [ ] Docker files present:
  - [ ] `backend/Dockerfile`
  - [ ] `frontend/Dockerfile.prod`
  - [ ] `docker-compose.prod.yml`
  - [ ] `.dockerignore` and `frontend/.dockerignore`

## 🚀 Deployment Preparation

### Choose Deployment Method
- [ ] **Option A: Docker** (recommended for beginners)
  - Simpler to maintain
  - Isolated environments
  - Easier rollback
  
- [ ] **Option B: Direct** (traditional)
  - More control
  - Easier debugging
  - Lower resource usage

### Vultr Server
- [ ] Server provisioned and running
  - Recommended: 2 vCPU, 4GB RAM, 80GB SSD ($12/mo)
  - Minimum: 1 vCPU, 2GB RAM, 55GB SSD ($6/mo)
  
- [ ] Server OS: Ubuntu 22.04 LTS
  - Docker marketplace image (for Docker deployment)
  - Plain Ubuntu (for direct deployment)
  
- [ ] Server IP address noted: `_________________`

- [ ] SSH access verified:
  ```bash
  ssh root@YOUR_VULTR_IP
  # Should connect successfully
  ```

- [ ] Server updated:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

### Domain (Optional but Recommended)
- [ ] Domain purchased (e.g., from Namecheap, Google Domains)
- [ ] DNS A record pointing to Vultr IP
  - `yourdomain.com` → `YOUR_VULTR_IP`
  - `www.yourdomain.com` → `YOUR_VULTR_IP`
- [ ] DNS propagation checked (can take up to 48 hours)
  ```bash
  nslookup yourdomain.com
  # Should show your Vultr IP
  ```

## 🔐 Security Setup

### Server Security
- [ ] Root login secured (or root password changed)
- [ ] SSH key authentication set up (optional but recommended)
- [ ] Firewall configured:
  ```bash
  sudo ufw allow 22    # SSH
  sudo ufw allow 80    # HTTP
  sudo ufw allow 443   # HTTPS
  sudo ufw enable
  ```

### Application Security
- [ ] Production `.env` file prepared with real keys
- [ ] `.env` file NOT committed to Git
- [ ] API keys have appropriate permissions/scopes
- [ ] Rate limiting considered (future enhancement)

## 📦 Deployment Day

### Before Deployment
- [ ] Read deployment guide: [DEPLOY_VULTR.md](./DEPLOY_VULTR.md)
- [ ] Have quick reference ready: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- [ ] Backup current working version (if updating)
- [ ] Note current working commit SHA: `_______________`

### During Deployment
- [ ] Follow deployment guide step-by-step
- [ ] Take notes of any errors or issues
- [ ] Don't skip verification steps

### After Deployment
- [ ] Health check passes:
  ```bash
  curl http://YOUR_VULTR_IP:8000/health
  # Should return {"status": "healthy", ...}
  ```
  
- [ ] Frontend accessible:
  ```bash
  curl http://YOUR_VULTR_IP:8080
  # Should return HTML
  ```
  
- [ ] Full flow tested in browser:
  - [ ] Visit `http://YOUR_VULTR_IP:8080`
  - [ ] Homepage loads with Ghibli theme
  - [ ] Can navigate to listings
  - [ ] Can evaluate an apartment
  - [ ] Agents return results
  - [ ] Audio playback works
  
- [ ] Logs checked for errors:
  ```bash
  # Docker
  docker-compose -f docker-compose.prod.yml logs
  
  # Direct
  pm2 logs ghiblinest-api
  ```

### SSL Certificate (Post-Deployment)
- [ ] Domain pointing to server (if using)
- [ ] Certbot installed:
  ```bash
  sudo apt install certbot python3-certbot-nginx -y
  ```
  
- [ ] Certificate obtained:
  ```bash
  sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
  ```
  
- [ ] Auto-renewal set up:
  ```bash
  sudo certbot renew --dry-run
  ```
  
- [ ] HTTPS redirect working
- [ ] Mixed content warnings resolved (check browser console)

## 📊 Monitoring Setup

### Application Monitoring
- [ ] Health check endpoint working: `/health`
- [ ] Logs accessible and readable
- [ ] Uptime monitoring set up (optional):
  - UptimeRobot (free)
  - Pingdom
  - Better Uptime

### Performance Monitoring
- [ ] Response time baseline established
- [ ] Resource usage checked:
  ```bash
  free -h     # Memory
  df -h       # Disk
  top         # CPU
  ```

### Error Tracking (Optional)
- [ ] Sentry integration (optional)
- [ ] Log aggregation (optional)

## 🎯 Post-Launch Tasks

### Documentation
- [ ] Update README with live URL
- [ ] Document any deployment-specific quirks
- [ ] Share with team/stakeholders

### Marketing
- [ ] Share on social media
- [ ] Submit to product directories
- [ ] Add to portfolio

### Maintenance Plan
- [ ] Schedule regular updates (monthly?)
- [ ] Monitor API usage/costs
- [ ] Plan for scaling if needed
- [ ] Set up automated backups

## 🐛 Troubleshooting Resources

Quick references if things go wrong:
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common commands and fixes
- [DEPLOY_VULTR.md](./DEPLOY_VULTR.md) - Full deployment guide with troubleshooting
- [CLAUDE.md](./CLAUDE.md) - Architecture and data flow
- [README.md](./README.md) - Project overview and features

## 🎉 You're Ready!

If all items are checked, you're ready to deploy. Good luck! 🚀

---

**Remember:** It's normal for the first deployment to have issues. Stay calm, check logs, and refer to the troubleshooting sections.
