#!/bin/bash
# Ghibli Nest - Automated Vultr Deployment Script
# Run this on a fresh Ubuntu 22.04 LTS instance

set -e

echo "=== Ghibli Nest Setup ==="

# Check if .env file exists in backend
if [ ! -f "backend/.env" ]; then
    echo "ERROR: backend/.env file not found!"
    echo "Please create backend/.env with your API keys before running this script."
    echo "You can copy from .env.example:"
    echo "  cp .env.example backend/.env"
    echo "  nano backend/.env  # Edit with your keys"
    exit 1
fi

echo "✓ Environment file found"

echo "Updating system..."
sudo apt-get update && sudo apt-get upgrade -y

echo "Installing Node.js & npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Installing Python, Pip, and system dependencies..."
sudo apt install -y python3-pip python3-venv nginx curl

echo "Setting up Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Start backend using PM2 (a production process manager)
echo "Installing PM2 to keep backend running permanently..."
sudo npm install -g pm2

# Create ecosystem file for PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ghiblinest-api',
    script: 'main.py',
    interpreter: './venv/bin/python',
    cwd: '/root/RealEstateStory/backend',
    env: {
      PYTHONUNBUFFERED: '1'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "Setting up Frontend..."
cd ../frontend
npm install

# Get backend URL for frontend (default to localhost if not set in .env)
BACKEND_URL=$(grep VITE_API_URL ../backend/.env | cut -d '=' -f2 || echo "http://localhost:8000")
export VITE_API_URL=$BACKEND_URL

npm run build


echo "Configuring Nginx Reverse Proxy..."
sudo rm -f /etc/nginx/sites-enabled/default

# Get server IP for configuration
SERVER_IP=$(curl -s ifconfig.me || echo "localhost")

# Create an Nginx config that serves the built React app and proxies /api to port 8000
cat << 'EOF' | sudo tee /etc/nginx/sites-available/ghiblinest
server {
    listen 80;
    server_name _;

    # Root directory for frontend build
    root /root/RealEstateStory/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend - React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings for long-running AI requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ghiblinest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "=== DEPLOYMENT COMPLETE! ==="
echo ""
echo "Your Ghibli Nest is now live at:"
echo "  🌐 Frontend: http://$SERVER_IP"
echo "  🔌 Backend API: http://$SERVER_IP/api/"
echo "  ❤️  Health Check: http://$SERVER_IP/health"
echo ""
echo "Next steps:"
echo "  1. Test the deployment: curl http://$SERVER_IP/health"
echo "  2. Set up a domain and SSL: sudo certbot --nginx -d yourdomain.com"
echo "  3. Monitor logs: pm2 logs ghiblinest-api"
echo "  4. Check status: pm2 status"
echo ""
echo "To update the app:"
echo "  cd /root/RealEstateStory"
echo "  git pull"
echo "  pm2 restart ghiblinest-api"
echo ""
