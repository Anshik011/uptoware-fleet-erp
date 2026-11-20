#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "   UPTOWARE FLEET ERP — FRAPPE SERVER SCRIPTS ENABLER     "
echo "=========================================================="

echo "==> Detecting Frappe backend container..."
BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'backend|erpnext.*backend' | head -n1 || true)

if [ -z "$BACKEND_CONTAINER" ]; then
    BACKEND_CONTAINER=$(docker ps -q -f name=backend | head -n1 || true)
fi

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "ERROR: Could not find running Frappe backend container."
    echo "Running containers:"
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    exit 1
fi

echo "Found backend container: $BACKEND_CONTAINER"

echo "==> Enabling server_script_enabled globally in common_site_config.json..."
docker exec "$BACKEND_CONTAINER" bench set-config -g server_script_enabled true

echo "==> Enabling server_script_enabled specifically on site 'frontend'..."
docker exec "$BACKEND_CONTAINER" bench --site frontend set-config server_script_enabled true

echo "==> Verifying site_config.json inside container..."
docker exec "$BACKEND_CONTAINER" cat /home/frappe/frappe-bench/sites/frontend/site_config.json | grep -i "server_script" || true

echo "==> Restarting Frappe backend container to refresh runtime configurations..."
docker restart "$BACKEND_CONTAINER" > /dev/null

echo "==> Waiting 10 seconds for backend to become ready..."
sleep 10

echo "==> Testing authentication profile resolution locally on EC2..."
LOGIN_COOKIE=$(curl -s -c - -X POST http://127.0.0.1:8080/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr":"fleet.manager@uptoware.com","pwd":"Password@123"}' | grep -o 'sid=[^;]*' | head -n1 || true)

if [ -n "$LOGIN_COOKIE" ]; then
    echo "Login test: SUCCESS ($LOGIN_COOKIE)"
    PROFILE_TEST=$(curl -s -X GET http://127.0.0.1:8080/api/method/uptoware_get_current_user \
      -H "Cookie: $LOGIN_COOKIE")
    echo "Profile test output: $PROFILE_TEST"
else
    echo "Notice: Could not test local login. Please check credentials or container health."
fi

echo "=========================================================="
echo " SUCCESS: Frappe Server Scripts are enabled on EC2!      "
echo " You can now log in at https://fleet.uptoware.com         "
echo "=========================================================="
