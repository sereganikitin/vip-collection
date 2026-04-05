#!/bin/bash
# Deploy VIP COLLECTION to Ubuntu server
# Usage: ssh root@72.56.12.105 'bash -s' < scripts/deploy.sh

set -e

echo "=== 1. Updating system ==="
apt-get update -qq

echo "=== 2. Installing Node.js 20 ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v), NPM: $(npm -v)"

echo "=== 3. Installing Nginx & Git ==="
apt-get install -y nginx git -qq

echo "=== 4. Installing PM2 ==="
npm install -g pm2 2>/dev/null || true

echo "=== 5. Cloning project ==="
APP_DIR="/var/www/vip-collection"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone https://github.com/sereganikitin/vip-collection.git "$APP_DIR"
  cd "$APP_DIR"
fi

echo "=== 6. Installing dependencies ==="
npm ci --production=false

echo "=== 7. Building project ==="
npm run build

echo "=== 8. Setting up PM2 ==="
pm2 delete vip-collection 2>/dev/null || true
PORT=3000 pm2 start npm --name "vip-collection" -- start
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "=== 9. Configuring Nginx ==="
cat > /etc/nginx/sites-available/vip-collection <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/vip-collection /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== 10. Configuring firewall ==="
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 22/tcp 2>/dev/null || true

echo ""
echo "=========================================="
echo "  DEPLOYED SUCCESSFULLY!"
echo "  http://72.56.12.105"
echo "=========================================="
