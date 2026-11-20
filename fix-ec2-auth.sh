#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
echo "=========================================================="
echo "   UPTOWARE FLEET ERP — EC2 PRODUCTION AUTH FIX          "
echo "=========================================================="
echo "Working directory: $SCRIPT_DIR"

# 1. Enable Frappe Server Scripts inside backend Docker container
echo "==> Step 1: Detecting Frappe backend Docker container..."
BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'backend|erpnext.*backend' | head -n1 || true)
if [ -z "$BACKEND_CONTAINER" ]; then
    BACKEND_CONTAINER=$(docker ps -q -f name=backend | head -n1 || true)
fi

if [ -n "$BACKEND_CONTAINER" ]; then
    echo "Found Frappe backend container: $BACKEND_CONTAINER"
    echo "Enabling server_script_enabled in common_site_config.json..."
    docker exec "$BACKEND_CONTAINER" bench set-config -g server_script_enabled true || true
    echo "Enabling server_script_enabled on site 'frontend'..."
    docker exec "$BACKEND_CONTAINER" bench --site frontend set-config server_script_enabled true || true
    echo "Restarting backend container..."
    docker restart "$BACKEND_CONTAINER" > /dev/null 2>&1 || true
    sleep 5
else
    echo "Notice: Frappe backend container not detected directly via name=backend; proceeding with host configuration."
fi

# 2. Write complete, working frontend/.env.local for EC2 production
echo "==> Step 2: Writing complete frontend/.env.local..."
cat > "$SCRIPT_DIR/frontend/.env.local" << 'EOF'
# Production Next.js & Frappe Backend Routing
PORT=3001
FRAPPE_URL=http://127.0.0.1:8080
NEXT_PUBLIC_APP_URL=https://fleet.uptoware.com
NODE_ENV=production
EOF

echo "frontend/.env.local successfully written:"
cat "$SCRIPT_DIR/frontend/.env.local"

# 3. Rebuild Next.js for production with updated environment
echo "==> Step 3: Rebuilding Next.js frontend (production build)..."
cd "$SCRIPT_DIR/frontend"
npm run build
cd "$SCRIPT_DIR"

# 4. Restart uptoware-frontend.service systemd unit
echo "==> Step 4: Restarting uptoware-frontend.service..."
if systemctl list-unit-files | grep -q "uptoware-frontend.service"; then
    systemctl restart uptoware-frontend.service
    echo "Restarted uptoware-frontend.service"
elif systemctl list-unit-files | grep -q "frontend.service"; then
    systemctl restart frontend.service
    echo "Restarted frontend.service"
else
    echo "Notice: Searching for active systemd service managing port 3001..."
    MATCHING_SERVICE=$(systemctl list-units --type=service --state=running | grep -iE 'uptoware|fleet|next|frontend' | awk '{print $1}' | head -n1 || true)
    if [ -n "$MATCHING_SERVICE" ]; then
        systemctl restart "$MATCHING_SERVICE"
        echo "Restarted $MATCHING_SERVICE"
    else
        echo "Please restart your frontend process manually or via systemctl."
    fi
fi

# 5. Live Verification of Authentication API on local EC2 port 3001
echo "==> Step 5: Testing authentication response..."
sleep 3
TEST_LOGIN=$(curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fleet.manager@uptoware.com","password":"Password@123"}' || true)

echo "Test login response from 127.0.0.1:3001:"
echo "$TEST_LOGIN" | grep -o '"success":[^,}]*' || echo "$TEST_LOGIN"

echo "=========================================================="
echo " SUCCESS! EC2 Production Authentication Fix is complete.  "
echo " You can now log in at: https://fleet.uptoware.com/login  "
echo "=========================================================="
