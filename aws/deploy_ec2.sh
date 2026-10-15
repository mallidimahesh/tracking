#!/usr/bin/env bash
# ==============================================================================
# VIT Shuttle — Automated AWS EC2 Deployment Script
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "  Deploying VIT Shuttle System on AWS EC2..."
echo "=========================================================="

APP_DIR="/opt/vit-shuttle"
DATA_DIR="${APP_DIR}/data"

# 1. Ensure directory structure exists
sudo mkdir -p "${DATA_DIR}"
sudo chown -R ubuntu:ubuntu "${APP_DIR}"

# 2. Check for .env file
if [ ! -f "${APP_DIR}/.env" ]; then
    echo "[!] No .env file found. Creating from template..."
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
    echo "[!] Please review and populate secrets in ${APP_DIR}/.env"
fi

# 3. Build React Frontend
echo "[*] Building React Vite Frontend..."
cd "${APP_DIR}/frontend"
if command -v npm &> /dev/null; then
    npm ci
    npm run build
    echo "[✓] Frontend build completed."
else
    echo "[!] npm not installed on host. Running build inside node container..."
    docker run --rm -v "${APP_DIR}/frontend:/app" -w /app node:22-alpine sh -c "npm ci && npm run build"
fi

# 4. Deploy Docker Compose Services
echo "[*] Launching Backend and Nginx containers..."
cd "${APP_DIR}/aws"
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 5. Verify Health Check
echo "[*] Waiting for backend container health check..."
sleep 5
HEALTH_URL="http://127.0.0.1:5000/api/health"

for i in {1..10}; do
    if curl -s -f "${HEALTH_URL}" > /dev/null; then
        echo "[✓] Backend is HEALTHY!"
        curl -s "${HEALTH_URL}" | jq . || curl -s "${HEALTH_URL}"
        break
    fi
    echo "  Attempt $i: waiting for service..."
    sleep 3
done

echo ""
echo "=========================================================="
echo "  VIT Shuttle Deployment Completed Successfully!"
echo "  Access URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo 'localhost')"
echo "=========================================================="
