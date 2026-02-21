#!/bin/bash
# Ghibli Nest - Automated Vultr Deployment Script
# Run this on a fresh Ubuntu 22.04 LTS instance

set -e

echo "=== Ghibli Nest Setup ==="
echo "Updating system..."
sudo apt-update && sudo apt upgrade -y

echo "Installing Node.js & npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Installing Python and Pip..."
sudo apt install -y python3-pip python3-venv nginx

echo "Setting up Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start backend using PM2 (a production process manager)
echo "Installing PM2 to keep backend running permanently..."
sudo npm install -g pm2
pm2 start "python main.py" --name ghiblinest-api

echo "Setting up Frontend..."
cd ../frontend
npm install
npm run build

echo "Configuring Nginx Reverse Proxy..."
sudo rm -f /etc/nginx/sites-enabled/default

# Create an Nginx config that serves the built React app and proxies /api to port 8000
cat << 'EOF' | sudo tee /etc/nginx/sites-available/ghiblinest
server {
    listen 80;
    server_name _;

    root /var/www/ghiblinest/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/ghiblinest /etc/nginx/sites-enabled/
sudo systemctl restart nginx

echo "=== DEPLOYMENT COMPLETE! ==="
echo "Your server is now live. Be sure to configure .env in the backend folder!"
