#!/usr/bin/env bash
# ==============================================================================
# UPTOWARE FLEET ERP V1 — OPERATOR PRODUCTION ROLLBACK SCRIPT
# ==============================================================================
# Target Environment: AWS EC2 (13.239.121.225)
# User:               ubuntu
# Working Directory:  /home/ubuntu/uptoware-fleet-erp
# Frappe Bench:       /home/frappe/frappe-bench
# Frappe Site:        frontend
# Backend Container:  erpnext-docker-backend-1
# Systemd Service:    uptoware-frontend.service
#
# USAGE:
#   ./OPERATOR_ROLLBACK_V1.sh <path-to-backup-snapshot-directory>
# Example:
#   ./OPERATOR_ROLLBACK_V1.sh /home/ubuntu/deployment_backups_20261121_120000
# ==============================================================================

set -euo pipefail

DEPLOY_DIR="/home/ubuntu/uptoware-fleet-erp"
SITE_NAME="frontend"
BACKEND_CONTAINER="erpnext-docker-backend-1"
FRONTEND_SERVICE="uptoware-frontend.service"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path-to-backup-snapshot-directory>"
    echo "Available backup snapshot directories:"
    ls -d /home/ubuntu/deployment_backups_* 2>/dev/null || echo "None found in /home/ubuntu/"
    exit 1
fi

SNAPSHOT_DIR="$1"

if [ ! -d "${SNAPSHOT_DIR}" ]; then
    echo "[ERROR] Backup snapshot directory ${SNAPSHOT_DIR} does not exist!"
    exit 1
fi

echo "=============================================================================="
echo "          UPTOWARE FLEET ERP V1 — PRODUCTION ROLLBACK EXECUTION               "
echo "                     Started: $(date -u +"%Y-%m-%d %H:%M:%S UTC")              "
echo "=============================================================================="
echo "Restoring from snapshot: ${SNAPSHOT_DIR}"

# 1. Rollback Frontend Source & Rebuild
if [ -d "${SNAPSHOT_DIR}/frontend_pre_deploy" ]; then
    echo -e "\n--- 1. RESTORING FRONTEND PRE-DEPLOYMENT SOURCE ---"
    rm -rf "${DEPLOY_DIR}/frontend"
    cp -r "${SNAPSHOT_DIR}/frontend_pre_deploy" "${DEPLOY_DIR}/frontend"
    echo "  Restored ${DEPLOY_DIR}/frontend from snapshot."
    
    echo "  Rebuilding previous frontend build..."
    cd "${DEPLOY_DIR}/frontend"
    npm run build
    
    echo "  Restarting ${FRONTEND_SERVICE}..."
    sudo systemctl restart "${FRONTEND_SERVICE}"
    systemctl is-active --quiet "${FRONTEND_SERVICE}" && echo "  [PASS] Frontend service active."
else
    echo "  [WARNING] No frontend_pre_deploy found in ${SNAPSHOT_DIR}; frontend source untouched."
fi

# 2. Rollback Database if Requested
SQL_GZ_FILE=$(ls "${SNAPSHOT_DIR}"/*-database.sql.gz 2>/dev/null | head -n 1 || echo "")
if [ -n "${SQL_GZ_FILE}" ]; then
    echo -e "\n--- 2. RESTORING PRE-DEPLOYMENT DATABASE DUMP ---"
    echo "  Database archive: ${SQL_GZ_FILE}"
    echo "  Copying backup archive into ${BACKEND_CONTAINER}..."
    docker cp "${SQL_GZ_FILE}" "${BACKEND_CONTAINER}:/home/frappe/frappe-bench/rollback_db.sql.gz"
    
    echo "  Restoring database on site ${SITE_NAME}..."
    docker exec -u frappe "${BACKEND_CONTAINER}" bench --site "${SITE_NAME}" restore /home/frappe/frappe-bench/rollback_db.sql.gz --force
    
    echo "  Clearing Frappe cache..."
    docker exec -u frappe "${BACKEND_CONTAINER}" bench --site "${SITE_NAME}" clear-cache
    echo "  [PASS] Database restored to pre-deployment snapshot."
else
    echo "  [INFO] No SQL database dump found in ${SNAPSHOT_DIR}; database untouched."
fi

echo -e "\n=============================================================================="
echo "               ROLLBACK PROCESS COMPLETED SUCCESSFULLY                        "
echo "=============================================================================="
curl -I https://fleet.uptoware.com/login || true
