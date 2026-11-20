#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Nginx, Certbot, and Python Certbot plugin..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

echo "==> Configuring Nginx reverse proxy for fleet.uptoware.com..."
sudo tee /etc/nginx/sites-available/fleet.uptoware.com > /dev/null << 'EOF'
server {
    listen 80;
    server_name fleet.uptoware.com;
    client_max_body_size 50m;

    # Frappe Desk, App, Assets, Files, Private & Realtime WebSocket
    location ~ ^/(assets|files|private|desk|app|socket\.io) {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Frappe Core REST API
    location ~ ^/api/(method|resource) {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Next.js Custom Fleet Portal (Pages & BFF API routes)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "==> Enabling site and testing Nginx configuration..."
sudo ln -sf /etc/nginx/sites-available/fleet.uptoware.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Requesting and configuring Let's Encrypt SSL/TLS certificate..."
sudo certbot --nginx -d fleet.uptoware.com --non-interactive --agree-tos -m admin@uptoware.com --redirect

echo "==> Nginx + Certbot HTTPS setup complete for fleet.uptoware.com!"
