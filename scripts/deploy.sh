#!/usr/bin/env bash

# deploy.sh
# Orchestrates first-time setup and configuration on the production VPS.

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)."
  exit 1
fi

echo "=== Beginning Production Deployment Audit & Setup ==="

# 1. Setup Swap Space (2 GB) if not already configured
if ! swapon --show | grep -q 'swapfile'; then
  echo "Creating 2GB Swap space..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Swap space configured successfully."
else
  echo "Swap space already configured."
fi

# 2. Update APT and install dependencies
echo "Installing Docker, Nginx, and UFW..."
apt-get update
apt-get install -y docker.io docker-compose-v2 nginx ufw

# 3. Enable UFW Firewall
echo "Hardening Firewall (UFW)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "Firewall active. Blocked all other traffic."

# 4. Create Directories
echo "Setting up /opt/ads directory structure..."
mkdir -p /opt/ads/data/postgres
mkdir -p /opt/ads/backups
mkdir -p /opt/ads/logs

# 5. Generate Secrets
if [ ! -f "/opt/ads/.env" ]; then
  echo "No existing .env file found. Creating secure secrets..."
  bash ./scripts/generate-secrets.sh /opt/ads/.env
else
  echo "Using existing .env file at /opt/ads/.env"
fi

# Link .env into the repository so compose picks it up
ln -sf /opt/ads/.env /opt/ads/repo/.env

# 6. Build and Start Containers
echo "Building and launching Docker containers..."
docker compose build --no-cache
docker compose up -d

# 7. Run Database Migrations
echo "Waiting for PostgreSQL to be healthy..."
docker compose exec -T eds-postgres sh -c "until pg_isready -U eds_user -d erp_data; do sleep 1; done"
echo "Running database migrations..."
docker compose exec -T eds-api npm run db:migrate

# 8. Setup Nginx Reverse Proxy
echo "Configuring Nginx Reverse Proxy..."
NGINX_CONF="/etc/nginx/sites-available/ads"
cat <<'EOF' > "$NGINX_CONF"
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none';" always;

    # Gzip Compression
    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_vary on;
    gzip_min_length 1000;

    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "Testing Nginx configuration..."
nginx -t
systemctl restart nginx

echo "=== Deployment Finished Successfully ==="
