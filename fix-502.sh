#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
echo "=========================================================="
echo "   UPTOWARE FLEET ERP — 502 BAD GATEWAY SELF-HEALING      "
echo "=========================================================="
echo "Timestamp: $(date -u)"
echo "Working directory: $SCRIPT_DIR"

# 1. Identify all Docker containers in the stack
echo "==> Step 1: Inspecting Docker containers..."
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

BACKEND_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E 'backend' | head -n1 || true)
FRONTEND_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E 'frontend' | grep -vE 'uptoware|next' | head -n1 || true)
WEBSOCKET_CONTAINER=$(docker ps -a --format '{{.Names}}' | grep -E 'websocket' | head -n1 || true)

echo "Detected backend container:   ${BACKEND_CONTAINER:-NOT FOUND}"
echo "Detected internal proxy (8080): ${FRONTEND_CONTAINER:-NOT FOUND}"
echo "Detected websocket container: ${WEBSOCKET_CONTAINER:-NOT FOUND}"

# Start any stopped containers in the stack
STOPPED=$(docker ps -a -q -f status=exited)
if [ -n "$STOPPED" ]; then
    echo "==> Starting stopped containers..."
    docker start $STOPPED || true
    sleep 3
fi

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "ERROR: Backend container could not be found."
    exit 1
fi

# 2. Configure default_site and server_script_enabled in Frappe
echo "==> Step 2: Configuring default_site and server scripts in Frappe..."
docker exec "$BACKEND_CONTAINER" bench set-config -g default_site frontend || true
docker exec "$BACKEND_CONTAINER" bench set-config -g server_script_enabled true || true
docker exec "$BACKEND_CONTAINER" bench --site frontend set-config server_script_enabled true || true

# Verify common_site_config.json
echo "==> Verifying common_site_config.json inside $BACKEND_CONTAINER:"
docker exec "$BACKEND_CONTAINER" cat /home/frappe/frappe-bench/sites/common_site_config.json || true

# 3. Restart internal Nginx (frontend) and WebSocket so fresh upstream container IPs are loaded
echo "==> Step 3: Restarting Frappe internal proxy container(s) to reload upstream IPs..."
if [ -f "$SCRIPT_DIR/frappe_docker/pwd.yml" ]; then
    docker compose -f "$SCRIPT_DIR/frappe_docker/pwd.yml" restart frontend websocket 2>/dev/null || true
elif [ -f "$SCRIPT_DIR/pwd.yml" ]; then
    docker compose -f "$SCRIPT_DIR/pwd.yml" restart frontend websocket 2>/dev/null || true
fi

if [ -n "$FRONTEND_CONTAINER" ]; then
    docker restart "$FRONTEND_CONTAINER" > /dev/null 2>&1 || true
fi
if [ -n "$WEBSOCKET_CONTAINER" ]; then
    docker restart "$WEBSOCKET_CONTAINER" > /dev/null 2>&1 || true
fi

# 4. Wait for http://127.0.0.1:8080/api/method/ping to return pong
echo "==> Step 4: Probing http://127.0.0.1:8080/api/method/ping..."
PING_OK=0
for i in $(seq 1 15); do
    RESP=$(curl -s --max-time 2 http://127.0.0.1:8080/api/method/ping || true)
    if echo "$RESP" | grep -q "pong"; then
        echo "Frappe backend is UP and responsive (attempt $i/15): $RESP"
        PING_OK=1
        break
    fi
    echo "Waiting for Frappe ping on port 8080 (attempt $i/15)..."
    sleep 1
done

if [ "$PING_OK" -ne 1 ]; then
    echo "=========================================================="
    echo "WARNING: Frappe did not return pong within 15 seconds."
    echo "Dumping recent logs for diagnostics:"
    echo "--- Backend Logs ($BACKEND_CONTAINER) ---"
    docker logs --tail 30 "$BACKEND_CONTAINER" || true
    if [ -n "$FRONTEND_CONTAINER" ]; then
        echo "--- Frontend Proxy Logs ($FRONTEND_CONTAINER) ---"
        docker logs --tail 30 "$FRONTEND_CONTAINER" || true
    fi
    echo "=========================================================="
fi

# 5. Restart Next.js frontend systemd service
echo "==> Step 5: Restarting uptoware-frontend.service..."
if systemctl list-unit-files | grep -q "uptoware-frontend.service"; then
    systemctl restart uptoware-frontend.service
    echo "Restarted uptoware-frontend.service"
elif systemctl list-unit-files | grep -q "frontend.service"; then
    systemctl restart frontend.service
    echo "Restarted frontend.service"
else
    MATCHING_SERVICE=$(systemctl list-units --type=service --state=running | grep -iE 'uptoware|fleet|next|frontend' | awk '{print $1}' | head -n1 || true)
    if [ -n "$MATCHING_SERVICE" ]; then
        systemctl restart "$MATCHING_SERVICE"
        echo "Restarted $MATCHING_SERVICE"
    fi
fi

sleep 3

# 6. Automated end-to-end login test
echo "==> Step 6: Testing end-to-end authentication on http://127.0.0.1:3001/api/auth/login..."
LOGIN_OUTPUT=$(curl -i -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://fleet.uptoware.com" \
  -H "Host: fleet.uptoware.com" \
  -d '{"email":"sahooashutosh011@gmail.com","password":"Asdf@123--"}' || true)

echo "--- Response from Next.js (port 3001) ---"
echo "$LOGIN_OUTPUT"

if echo "$LOGIN_OUTPUT" | grep -qi '"success":\s*true'; then
    echo "=========================================================="
    echo " SUCCESS: Authentication verified end-to-end on EC2!      "
    echo " You can now log in at: https://fleet.uptoware.com/login  "
    echo "=========================================================="
else
    echo "=========================================================="
    echo " Notice: Inspect the curl output above for error details. "
    echo "=========================================================="
fi
