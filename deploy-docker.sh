#!/bin/bash
# Quick Docker deployment script for Vultr
# Usage: ./deploy-docker.sh

set -e

echo "🚀 Ghibli Nest - Docker Deployment"
echo "=================================="

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ docker-compose installed"
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    if [ -f ".env.production.example" ]; then
        echo "⚠️  .env.production not found. Creating from example..."
        cp .env.production.example .env.production
        echo ""
        echo "❌ Please edit .env.production with your actual API keys:"
        echo "   nano .env.production"
        echo ""
        echo "Required keys:"
        echo "  - GEMINI_API_KEY"
        echo "  - ELEVENLABS_API_KEY"
        echo "  - SUPABASE_URL"
        echo "  - SUPABASE_KEY"
        echo "  - VITE_API_URL (your Vultr IP)"
        echo ""
        exit 1
    else
        echo "❌ .env.production.example not found. Cannot proceed."
        exit 1
    fi
fi

echo "✅ Environment file found"

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
echo "📍 Server IP: $SERVER_IP"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start services
echo "🏗️  Building containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build

echo "▶️  Starting services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo "🔍 Checking backend health..."
if curl -f http://localhost:8000/health &>/dev/null; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed. Checking logs..."
    docker-compose -f docker-compose.prod.yml logs backend | tail -20
fi

echo "🔍 Checking frontend health..."
if curl -f http://localhost:8080 &>/dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend health check failed. Checking logs..."
    docker-compose -f docker-compose.prod.yml logs frontend | tail -20
fi

echo ""
echo "=================================="
echo "✨ Deployment Complete!"
echo "=================================="
echo ""
echo "🌐 Access your app:"
echo "   Frontend: http://$SERVER_IP:8080"
echo "   Backend:  http://$SERVER_IP:8000"
echo "   Health:   http://$SERVER_IP:8000/health"
echo ""
echo "📊 Useful commands:"
echo "   View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop:         docker-compose -f docker-compose.prod.yml down"
echo "   Restart:      docker-compose -f docker-compose.prod.yml restart"
echo "   Status:       docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "🔄 To update after git pull:"
echo "   ./deploy-docker.sh"
echo ""
