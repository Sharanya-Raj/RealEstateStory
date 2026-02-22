# 🚀 Quick Deployment Reference

Quick commands for deploying and managing Ghibli Nest on Vultr.

## Initial Setup

### Option 1: Docker (Recommended)
```bash
# On your Vultr server
git clone <your-repo-url>
cd RealEstateStory

# Configure environment
cp .env.production.example .env.production
nano .env.production  # Add your API keys

# Deploy
chmod +x deploy-docker.sh
./deploy-docker.sh
```

### Option 2: Direct Deployment
```bash
# On your Vultr server
git clone <your-repo-url>
cd RealEstateStory

# Configure environment
cp .env.example backend/.env
nano backend/.env  # Add your API keys

# Deploy
chmod +x deploy.sh
./deploy.sh
```

---

## Daily Operations

### Docker Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend -f
docker-compose -f docker-compose.prod.yml logs frontend -f

# Check status
docker-compose -f docker-compose.prod.yml ps

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Update after git pull
./deploy-docker.sh
```

### PM2 Commands (Direct Deployment)

```bash
# View logs
pm2 logs ghiblinest-api

# Check status
pm2 status

# Restart backend
pm2 restart ghiblinest-api

# Stop backend
pm2 stop ghiblinest-api

# Start backend
pm2 start ghiblinest-api

# View detailed info
pm2 show ghiblinest-api
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

---

## Updating Your App

### Git Pull and Redeploy

**Docker:**
```bash
cd ~/RealEstateStory
git pull
./deploy-docker.sh
```

**Direct:**
```bash
cd ~/RealEstateStory
git pull

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart ghiblinest-api

# Frontend
cd ../frontend
npm install
npm run build
```

### Update Environment Variables

**Docker:**
```bash
nano .env.production
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**Direct:**
```bash
nano backend/.env
pm2 restart ghiblinest-api
```

---

## Monitoring

### Check Backend Health
```bash
curl http://localhost:8000/health
```

### Check System Resources
```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU usage
top

# Docker resources (if using Docker)
docker stats
```

### View Application Logs

**Docker:**
```bash
# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs backend --tail=50
```

**Direct:**
```bash
# PM2 logs
pm2 logs ghiblinest-api

# System logs
tail -f backend/logs/out.log
tail -f backend/logs/err.log
```

---

## Troubleshooting

### Backend Not Responding

**Docker:**
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs backend

# Restart
docker-compose -f docker-compose.prod.yml restart backend

# Check inside container
docker-compose -f docker-compose.prod.yml exec backend /bin/sh
```

**Direct:**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs ghiblinest-api

# Restart
pm2 restart ghiblinest-api

# Check if port is in use
sudo lsof -i :8000
```

### Frontend Not Loading

**Docker:**
```bash
# Check nginx container
docker-compose -f docker-compose.prod.yml logs frontend

# Restart frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

**Direct:**
```bash
# Check nginx
sudo systemctl status nginx
sudo nginx -t

# Check if files are built
ls -la frontend/dist/

# Rebuild frontend
cd frontend
npm run build
```

### Out of Memory

```bash
# Check memory
free -h

# Docker: Clear unused images/containers
docker system prune -a

# Restart services
pm2 restart all
# or
docker-compose -f docker-compose.prod.yml restart
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

---

## Security

### Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### Check Open Ports
```bash
sudo ss -tulpn | grep LISTEN
```

### Firewall Rules (UFW)
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

---

## Backup

### Backup Environment File
```bash
# Docker
cp .env.production .env.production.backup

# Direct
cp backend/.env backend/.env.backup
```

### Backup Database (if using local DB)
```bash
# Note: Ghibli Nest uses Supabase (cloud), so database is already backed up
# But you can export data if needed
cd backend/scripts
python export_data.py  # Create this script if needed
```

---

## Performance Optimization

### Clear Docker Cache
```bash
docker system prune -a --volumes
```

### Optimize PM2
```bash
pm2 optimize
pm2 save
```

### Monitor API Performance
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/health

# curl-format.txt content:
# time_total: %{time_total}\n
```

---

## Quick Health Check Script

Save as `health-check.sh`:
```bash
#!/bin/bash
echo "🔍 Ghibli Nest Health Check"
echo "=========================="

# Backend
if curl -sf http://localhost:8000/health > /dev/null; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Down"
fi

# Frontend
if curl -sf http://localhost:8080 > /dev/null; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Down"
fi

# Disk space
echo ""
echo "💾 Disk Space:"
df -h | grep -E '^/dev/'

# Memory
echo ""
echo "🧠 Memory:"
free -h | grep -E '^Mem'

echo ""
echo "=========================="
```

Run with: `chmod +x health-check.sh && ./health-check.sh`

---

## Emergency Restart

If everything is broken:

**Docker:**
```bash
cd ~/RealEstateStory
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

**Direct:**
```bash
pm2 restart all
sudo systemctl restart nginx
```

---

## Support

- Full guide: [DEPLOY_VULTR.md](./DEPLOY_VULTR.md)
- Architecture: [CLAUDE.md](./CLAUDE.md)
- Issues: [GitHub Issues](your-repo-url/issues)
