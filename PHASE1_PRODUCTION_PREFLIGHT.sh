#!/usr/bin/env bash
# ==============================================================================
# UPTOWARE FLEET ERP V1 — PHASE 1 PRODUCTION PREFLIGHT INSPECTION SCRIPT
# ==============================================================================
# Execution Mode: Direct execution via SSH Standard Input (NO remote file created)
# Target Host:    AWS EC2 (13.239.121.225)
# User:            ubuntu
# Application:     /home/ubuntu/uptoware-fleet-erp
# Frappe Bench:    /home/frappe/frappe-bench
# Frappe Site:     frontend
# Backend:         erpnext-docker-backend-1
# Proxy:           erpnext-docker-frontend-1
# Frontend:        uptoware-frontend.service (Port 3001)
# Public URL:      https://fleet.uptoware.com
#
# GUARANTEES & CONSTRAINTS:
# 1. 100% READ-ONLY: Never writes files, runs git mutations, alters permissions,
#    modifies databases, or restarts any service or container.
# 2. ZERO CREDENTIALS: Never outputs passwords, keys, salts, or secrets.
# 3. NON-STOP DIAGNOSTICS: Diagnostic checks continue across all sections even
#    if an individual check fails, collecting complete system state.
# 4. STATUS NOMENCLATURE: PASS, WARNING, BLOCKER, NOT VERIFIED.
# 5. BOUNDED EXECUTION: Strict timeouts on all network, socket, and disk probes.
#    If timeout utility is unavailable, commands fail closed (NOT VERIFIED).
# ==============================================================================

set -uo pipefail

REPO_DIR="/home/ubuntu/uptoware-fleet-erp"
INTENDED_BASE_COMMIT="b8924335a69f33b44b320418d63c635462309a13"
BACKEND_CONTAINER="erpnext-docker-backend-1"
FRONTEND_CONTAINER="erpnext-docker-frontend-1"
SITE_NAME="frontend"
FRONTEND_SERVICE="uptoware-frontend.service"
FRONTEND_PORT="3001"
PUBLIC_URL="https://fleet.uptoware.com"

PASS_COUNT=0
WARNING_COUNT=0
BLOCKER_COUNT=0
NOT_VERIFIED_COUNT=0

report_check() {
    local status="$1"
    local name="$2"
    local details="$3"

    case "$status" in
        PASS)
            echo "  [PASS]         ${name}"
            PASS_COUNT=$((PASS_COUNT + 1))
            ;;
        WARNING)
            echo "  [WARNING]      ${name}"
            WARNING_COUNT=$((WARNING_COUNT + 1))
            ;;
        BLOCKER)
            echo "  [BLOCKER]      ${name}"
            BLOCKER_COUNT=$((BLOCKER_COUNT + 1))
            ;;
        NOT_VERIFIED)
            echo "  [NOT VERIFIED] ${name}"
            NOT_VERIFIED_COUNT=$((NOT_VERIFIED_COUNT + 1))
            ;;
    esac

    if [ -n "$details" ]; then
        echo "                 ${details}"
    fi
}

TIMEOUT_AVAILABLE=true
if ! command -v timeout &>/dev/null; then
    TIMEOUT_AVAILABLE=false
fi

run_with_timeout() {
    local max_time="$1"
    shift
    if [ "${TIMEOUT_AVAILABLE}" != "true" ]; then
        return 127
    fi
    timeout "${max_time}" "$@"
}

evaluate_container_status() {
    local container_name="$1"
    local role_label="$2"
    local is_critical="$3"

    if ! docker inspect "$container_name" &>/dev/null; then
        if [ "$is_critical" = "true" ]; then
            report_check "BLOCKER" "${role_label} (${container_name})" "Container does not exist."
        else
            report_check "NOT VERIFIED" "${role_label} (${container_name})" "Container does not exist."
        fi
        return
    fi

    local is_running is_restarting restart_count started_at health_status
    is_running=$(docker inspect --format='{{.State.Running}}' "$container_name" 2>/dev/null || echo "false")
    is_restarting=$(docker inspect --format='{{.State.Restarting}}' "$container_name" 2>/dev/null || echo "false")
    restart_count=$(docker inspect --format='{{.RestartCount}}' "$container_name" 2>/dev/null || echo "N/A")
    started_at=$(docker inspect --format='{{.State.StartedAt}}' "$container_name" 2>/dev/null || echo "N/A")
    health_status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_name" 2>/dev/null || echo "none")

    if [ "$is_running" != "true" ] || [ "$is_restarting" = "true" ]; then
        if [ "$is_critical" = "true" ]; then
            report_check "BLOCKER" "${role_label} (${container_name})" "Container is NOT running cleanly (Running: ${is_running}, Restarting: ${is_restarting}, Restarts: ${restart_count})"
        else
            report_check "BLOCKER" "${role_label} (${container_name})" "Container is NOT running (Running: ${is_running}, Restarting: ${is_restarting})"
        fi
        return
    fi

    # Container is running; interpret healthcheck
    case "$health_status" in
        healthy)
            report_check "PASS" "${role_label} (${container_name})" "Running and healthy (Restarts: ${restart_count}, Started: ${started_at})"
            ;;
        unhealthy)
            report_check "BLOCKER" "${role_label} (${container_name})" "Running but UNHEALTHY (Healthcheck failing)"
            ;;
        starting)
            report_check "WARNING" "${role_label} (${container_name})" "Running (Healthcheck status: starting)"
            ;;
        none|"")
            report_check "WARNING" "${role_label} (${container_name})" "Running (Healthcheck not configured)"
            ;;
        *)
            report_check "WARNING" "${role_label} (${container_name})" "Running (Healthcheck status: ${health_status})"
            ;;
    esac
}

echo "=============================================================================="
echo "          UPTOWARE FLEET ERP V1 — PHASE 1 PREFLIGHT INSPECTION               "
echo "                     Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")           "
echo "=============================================================================="

# ------------------------------------------------------------------------------
# SECTION 1: GIT REPOSITORY & RELEASE BASELINE INSPECTION
# ------------------------------------------------------------------------------
echo -e "\n--- 1. GIT REPOSITORY & RELEASE BASELINE INSPECTION ---"

if [ ! -d "${REPO_DIR}/.git" ]; then
    report_check "BLOCKER" "Repository Directory" "${REPO_DIR} does not exist or is not a valid git repository."
elif ! cd "${REPO_DIR}" 2>/dev/null; then
    report_check "BLOCKER" "Repository Directory" "Cannot access repository directory ${REPO_DIR}."
else
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
    CURRENT_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")
    CURRENT_DATE=$(git log -1 --format="%cd" --date=iso 2>/dev/null || echo "UNKNOWN")
    CURRENT_SUBJ=$(git log -1 --format="%s" 2>/dev/null || echo "UNKNOWN")

    echo "  Current Branch:         ${CURRENT_BRANCH}"
    echo "  Current HEAD Commit:    ${CURRENT_HEAD}"
    echo "  Current Commit Date:    ${CURRENT_DATE}"
    echo "  Current Commit Subject: ${CURRENT_SUBJ}"

    # Working tree cleanliness check
    PORCELAIN_STATUS=$(git status --porcelain 2>/dev/null || echo "ERROR")
    if [ "${PORCELAIN_STATUS}" = "ERROR" ]; then
        report_check "BLOCKER" "Working Tree Status" "Unable to execute git status in repository."
    elif [ -z "${PORCELAIN_STATUS}" ]; then
        report_check "PASS" "Working Tree Cleanliness" "Working tree is completely clean (zero modified or untracked files)."
    else
        report_check "BLOCKER" "Working Tree Cleanliness" "Production working tree contains uncommitted modifications or untracked files!"
        echo "  Full git status --porcelain output:"
        echo "${PORCELAIN_STATUS}" | sed 's/^/    /'
    fi

    # Release baseline relationship check
    echo "  Intended Base Commit:   ${INTENDED_BASE_COMMIT}"
    if [ "${CURRENT_HEAD}" = "${INTENDED_BASE_COMMIT}" ]; then
        report_check "PASS" "Commit Equality" "Production HEAD exactly matches intended base commit (${CURRENT_HEAD:0:8})."
    else
        IS_ANCESTOR=$(git merge-base --is-ancestor "${CURRENT_HEAD}" "${INTENDED_BASE_COMMIT}" 2>/dev/null && echo "YES" || echo "NO")
        IS_DESCENDANT=$(git merge-base --is-ancestor "${INTENDED_BASE_COMMIT}" "${CURRENT_HEAD}" 2>/dev/null && echo "YES" || echo "NO")

        if [ "${IS_ANCESTOR}" = "YES" ]; then
            COMMITS_BEHIND=$(git rev-list --count "${CURRENT_HEAD}..${INTENDED_BASE_COMMIT}" 2>/dev/null || echo "N/A")
            report_check "WARNING" "Commit Lineage" "Production HEAD is an ancestor of intended base (${COMMITS_BEHIND} commits behind; clean fast-forward candidate)."
        elif [ "${IS_DESCENDANT}" = "YES" ]; then
            COMMITS_AHEAD=$(git rev-list --count "${INTENDED_BASE_COMMIT}..${CURRENT_HEAD}" 2>/dev/null || echo "N/A")
            report_check "WARNING" "Commit Lineage" "Production HEAD is ${COMMITS_AHEAD} commits ahead of intended base commit."
        else
            report_check "BLOCKER" "Commit Lineage" "Production HEAD has diverged from intended base commit (neither ancestor nor descendant)."
        fi
    fi
fi

# ------------------------------------------------------------------------------
# SECTION 2: DOCKER CONTAINER STACK HEALTH
# ------------------------------------------------------------------------------
echo -e "\n--- 2. DOCKER CONTAINER STACK HEALTH ---"

ALL_CONTAINERS=""
DB_CANDIDATES=()
REDIS_CANDIDATES=()

if ! command -v docker &>/dev/null; then
    report_check "BLOCKER" "Docker CLI Availability" "Docker CLI is not found on the host system."
else
    if ! docker info &>/dev/null; then
        report_check "BLOCKER" "Docker Daemon Responsiveness" "Cannot connect to Docker daemon. Socket unreachable or permission denied."
    else
        report_check "PASS" "Docker Daemon Responsiveness" "Docker daemon is active and responsive."

        # Backend container inspection
        evaluate_container_status "${BACKEND_CONTAINER}" "Backend Container" "true"

        # Frontend proxy container inspection
        evaluate_container_status "${FRONTEND_CONTAINER}" "Proxy Container" "true"

        # Discover all container names
        ALL_CONTAINERS=$(docker ps -a --format "{{.Names}}" 2>/dev/null || echo "")

        # Discover MariaDB candidates:
        # Excludes backup, dump, and restore containers; inspects image and compose service metadata
        while IFS= read -r cname; do
            [ -z "$cname" ] && continue
            if echo "$cname" | grep -qiE '(backup|dump|restore)'; then
                continue
            fi

            c_image=$(docker inspect --format '{{.Config.Image}}' "$cname" 2>/dev/null || echo "")
            c_service=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$cname" 2>/dev/null || echo "")

            if echo "${c_image} ${c_service}" | grep -qiE '(backup|dump|restore)'; then
                continue
            fi

            is_db_image=false
            if echo "$c_image" | grep -qiE '(mariadb|mysql)'; then
                is_db_image=true
            fi

            is_db_service=false
            if echo "$c_service" | grep -qiE '(mariadb|mysql|(^|[-_])db([-_]|$))'; then
                is_db_service=true
            fi

            is_db_name=false
            if echo "$cname" | grep -qiE '(mariadb|(^|[-_])db([-_]|$))'; then
                is_db_name=true
            fi

            if [ "$is_db_image" = "true" ] || [ "$is_db_service" = "true" ] || [ "$is_db_name" = "true" ]; then
                DB_CANDIDATES+=("$cname")
            fi
        done <<< "${ALL_CONTAINERS}"

        if [ "${#DB_CANDIDATES[@]}" -gt 0 ]; then
            for db_c in "${DB_CANDIDATES[@]}"; do
                evaluate_container_status "${db_c}" "MariaDB Container" "true"
            done
        else
            report_check "NOT VERIFIED" "MariaDB Container Discovery" "No container matching database metadata or service name discovered."
        fi

        # Discover Redis candidates
        while IFS= read -r cname; do
            [ -z "$cname" ] && continue
            if echo "$cname" | grep -qiE '(redis|(^|[-_])redis([-_]|$))'; then
                REDIS_CANDIDATES+=("$cname")
            fi
        done <<< "${ALL_CONTAINERS}"

        if [ "${#REDIS_CANDIDATES[@]}" -gt 0 ]; then
            for r_c in "${REDIS_CANDIDATES[@]}"; do
                evaluate_container_status "${r_c}" "Redis Container" "false"
            done
        else
            report_check "NOT VERIFIED" "Redis Container Discovery" "No container matching 'redis' discovered."
        fi
    fi
fi

# ------------------------------------------------------------------------------
# SECTION 3: MARIADB & REDIS ENGINE RESPONSIVENESS
# ------------------------------------------------------------------------------
echo -e "\n--- 3. MARIADB & REDIS ENGINE RESPONSIVENESS ---"

# MariaDB responsiveness using discovered database candidates and metadata preference
RUNNING_DB_CANDIDATES=()
if [ "${#DB_CANDIDATES[@]}" -gt 0 ]; then
    for c in "${DB_CANDIDATES[@]}"; do
        if [ "$(docker inspect --format='{{.State.Running}}' "$c" 2>/dev/null)" = "true" ]; then
            RUNNING_DB_CANDIDATES+=("$c")
        fi
    done
fi

MARIADB_TARGET=""
if [ "${#RUNNING_DB_CANDIDATES[@]}" -eq 1 ]; then
    c_cand="${RUNNING_DB_CANDIDATES[0]}"
    c_cand_img=$(docker inspect --format '{{.Config.Image}}' "$c_cand" 2>/dev/null || echo "")
    c_cand_svc=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$c_cand" 2>/dev/null || echo "")
    if echo "$c_cand_img" | grep -qiE '(mariadb|mysql)' || echo "$c_cand_svc" | grep -qiE '^(db|mariadb|mysql)$'; then
        MARIADB_TARGET="$c_cand"
    else
        report_check "NOT VERIFIED" "MariaDB Target Selection" "Running candidate (${c_cand}) has no reliable image/service metadata confirming MariaDB server; candidate name alone is not conclusive."
    fi
elif [ "${#RUNNING_DB_CANDIDATES[@]}" -gt 1 ]; then
    # Disambiguate using compose service and image metadata
    PRIMARY_METADATA_CANDIDATES=()
    for c in "${RUNNING_DB_CANDIDATES[@]}"; do
        c_img=$(docker inspect --format '{{.Config.Image}}' "$c" 2>/dev/null || echo "")
        c_svc=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$c" 2>/dev/null || echo "")
        if echo "$c_img" | grep -qiE '(mariadb|mysql)' && echo "$c_svc" | grep -qiE '^(db|mariadb|mysql)$'; then
            PRIMARY_METADATA_CANDIDATES+=("$c")
        fi
    done

    if [ "${#PRIMARY_METADATA_CANDIDATES[@]}" -eq 1 ]; then
        MARIADB_TARGET="${PRIMARY_METADATA_CANDIDATES[0]}"
    else
        report_check "NOT VERIFIED" "MariaDB Target Selection" "Multiple running database candidates discovered (${RUNNING_DB_CANDIDATES[*]}); primary database cannot be established reliably without inspection."
    fi
else
    report_check "NOT VERIFIED" "MariaDB Target Selection" "No running database container available for socket probe."
fi

if [ -n "${MARIADB_TARGET}" ]; then
    if [ "${TIMEOUT_AVAILABLE}" != "true" ]; then
        report_check "NOT VERIFIED" "MariaDB Ping Response (${MARIADB_TARGET})" "timeout command unavailable on host; bounded probe skipped."
    else
        DB_PING_STATUS="FAILED"
        if run_with_timeout 5 docker exec "${MARIADB_TARGET}" mariadb-admin ping --silent 2>/dev/null; then
            DB_PING_STATUS="ALIVE"
        elif run_with_timeout 5 docker exec "${MARIADB_TARGET}" mysqladmin ping --silent 2>/dev/null; then
            DB_PING_STATUS="ALIVE"
        fi

        if [ "${DB_PING_STATUS}" = "ALIVE" ]; then
            report_check "PASS" "MariaDB Ping Response (${MARIADB_TARGET})" "MariaDB server is alive and responding to admin ping."
        else
            DB_HEALTH_CHECK=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "${MARIADB_TARGET}" 2>/dev/null)
            if [ "${DB_HEALTH_CHECK}" = "healthy" ]; then
                report_check "PASS" "MariaDB Health Status (${MARIADB_TARGET})" "MariaDB container healthcheck reports 'healthy'."
            else
                report_check "NOT VERIFIED" "MariaDB Ping Response (${MARIADB_TARGET})" "Ping check timed out, failed, or required credentials not available via socket."
            fi
        fi
    fi
fi

# Redis responsiveness across all discovered Redis containers with finite 5-second timeout
if [ "${#REDIS_CANDIDATES[@]}" -gt 0 ]; then
    for r_c in "${REDIS_CANDIDATES[@]}"; do
        R_IS_RUNNING=$(docker inspect --format='{{.State.Running}}' "$r_c" 2>/dev/null || echo "false")
        if [ "${R_IS_RUNNING}" = "true" ]; then
            if [ "${TIMEOUT_AVAILABLE}" != "true" ]; then
                report_check "NOT VERIFIED" "Redis Ping Response (${r_c})" "timeout command unavailable on host; bounded probe skipped."
            else
                REDIS_PING_OUTPUT=$(run_with_timeout 5 docker exec "${r_c}" redis-cli ping 2>/dev/null || echo "TIMEOUT_OR_FAILED")
                if [ "${REDIS_PING_OUTPUT}" = "PONG" ]; then
                    report_check "PASS" "Redis Ping Response (${r_c})" "Redis server responded PONG to ping."
                elif echo "${REDIS_PING_OUTPUT}" | grep -q "NOAUTH"; then
                    report_check "PASS" "Redis Ping Response (${r_c})" "Redis server is alive and responding (password authentication enforced)."
                elif [ "${REDIS_PING_OUTPUT}" = "TIMEOUT_OR_FAILED" ]; then
                    report_check "NOT VERIFIED" "Redis Ping Response (${r_c})" "redis-cli ping timed out or failed to execute."
                else
                    report_check "WARNING" "Redis Ping Response (${r_c})" "redis-cli ping returned '${REDIS_PING_OUTPUT}'."
                fi
            fi
        else
            report_check "BLOCKER" "Redis Ping Response (${r_c})" "Container is not running; cannot ping."
        fi
    done
else
    report_check "NOT VERIFIED" "Redis Engine Check" "No Redis containers discovered for responsiveness check."
fi

# ------------------------------------------------------------------------------
# SECTION 4: FRAPPE BACKEND API & SITE CONFIGURATION
# ------------------------------------------------------------------------------
echo -e "\n--- 4. FRAPPE BACKEND API & SITE CONFIGURATION ---"

# HTTP ping via internal Nginx proxy to Gunicorn backend (bounded timeouts: connect 5s, max-time 10s)
FRAPPE_PING_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -m 10 "http://localhost:8080/api/method/ping" -H "Host: ${SITE_NAME}" 2>/dev/null || echo "000")
if [ "${FRAPPE_PING_HTTP}" = "200" ]; then
    report_check "PASS" "Frappe HTTP Ping" "Internal endpoint http://localhost:8080/api/method/ping returned HTTP 200 OK."
else
    report_check "BLOCKER" "Frappe HTTP Ping" "Expected HTTP 200, received HTTP '${FRAPPE_PING_HTTP}' from http://localhost:8080."
fi

# Site configuration file existence (read-only existence check, NO content printing)
if command -v docker &>/dev/null && docker inspect "${BACKEND_CONTAINER}" &>/dev/null; then
    SITE_CONFIG_PATH="/home/frappe/frappe-bench/sites/${SITE_NAME}/site_config.json"
    if [ "${TIMEOUT_AVAILABLE}" != "true" ]; then
        report_check "NOT VERIFIED" "Site Configuration Presence" "timeout command unavailable on host; bounded probe skipped."
    else
        CONFIG_CHECK_OUT=$(run_with_timeout 5 docker exec "${BACKEND_CONTAINER}" sh -c "[ -f '${SITE_CONFIG_PATH}' ] && echo FOUND || echo MISSING" 2>/dev/null || echo "TIMEOUT_OR_ERROR")
        if [ "${CONFIG_CHECK_OUT}" = "FOUND" ]; then
            report_check "PASS" "Site Configuration Presence" "${SITE_CONFIG_PATH} exists inside backend container (contents unprinted)."
        elif [ "${CONFIG_CHECK_OUT}" = "MISSING" ]; then
            report_check "BLOCKER" "Site Configuration Presence" "${SITE_CONFIG_PATH} confirmed missing inside backend container!"
        else
            report_check "NOT VERIFIED" "Site Configuration Presence" "Site configuration probe timed out or failed to execute."
        fi
    fi
else
    report_check "NOT VERIFIED" "Site Configuration Presence" "Cannot query backend container."
fi

# ------------------------------------------------------------------------------
# SECTION 5: NEXT.JS SYSTEMD FRONTEND SERVICE
# ------------------------------------------------------------------------------
echo -e "\n--- 5. NEXT.JS FRONTEND SERVICE & LOCAL PORT PROBE ---"

if systemctl is-active --quiet "${FRONTEND_SERVICE}" 2>/dev/null; then
    SERVICE_UPTIME=$(systemctl show -p ActiveEnterTimestamp "${FRONTEND_SERVICE}" 2>/dev/null | cut -d= -f2)
    report_check "PASS" "Next.js Systemd Service" "${FRONTEND_SERVICE} is active (running since: ${SERVICE_UPTIME})."
else
    SERVICE_STATE=$(systemctl is-active "${FRONTEND_SERVICE}" 2>/dev/null || echo "inactive")
    report_check "BLOCKER" "Next.js Systemd Service" "${FRONTEND_SERVICE} is NOT active (Current state: ${SERVICE_STATE})."
fi

# Local HTTP probe on port 3001 (bounded timeouts: connect 5s, max-time 10s)
LOCAL_PORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -m 10 "http://localhost:${FRONTEND_PORT}/login" 2>/dev/null || echo "000")
if [ "${LOCAL_PORT_STATUS}" = "200" ] || [ "${LOCAL_PORT_STATUS}" = "307" ] || [ "${LOCAL_PORT_STATUS}" = "308" ]; then
    report_check "PASS" "Local Frontend Port (${FRONTEND_PORT})" "http://localhost:${FRONTEND_PORT}/login responded with HTTP ${LOCAL_PORT_STATUS}."
else
    report_check "BLOCKER" "Local Frontend Port (${FRONTEND_PORT})" "http://localhost:${FRONTEND_PORT}/login returned HTTP '${LOCAL_PORT_STATUS}'."
fi

# ------------------------------------------------------------------------------
# SECTION 6: PUBLIC DOMAIN & TLS INGRESS
# ------------------------------------------------------------------------------
echo -e "\n--- 6. PUBLIC DOMAIN & TLS INGRESS ---"

# Bounded public probes: connect 5s, max-time 10s
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -m 10 "${PUBLIC_URL}/login" 2>/dev/null || echo "000")
if [ "${PUBLIC_STATUS}" = "200" ]; then
    report_check "PASS" "Public Ingress (${PUBLIC_URL})" "Endpoint responded with HTTP 200 OK."
elif [ "${PUBLIC_STATUS}" = "307" ] || [ "${PUBLIC_STATUS}" = "308" ]; then
    report_check "PASS" "Public Ingress (${PUBLIC_URL})" "Endpoint responded with HTTP ${PUBLIC_STATUS} (Redirect)."
elif [ "${PUBLIC_STATUS}" = "000" ]; then
    # Strictly bounded diagnostic fallback with zero credential or header exposure
    CURL_ERR=$(curl -v --connect-timeout 5 -m 10 "${PUBLIC_URL}/login" 2>&1 | grep -iE "SSL|certificate|handshake|refused|timed out|could not resolve" | head -n 1 || echo "Connection failed")
    report_check "BLOCKER" "Public Ingress (${PUBLIC_URL})" "Failed to connect (Details: ${CURL_ERR})."
else
    report_check "BLOCKER" "Public Ingress (${PUBLIC_URL})" "Endpoint returned unexpected HTTP ${PUBLIC_STATUS}."
fi

# ------------------------------------------------------------------------------
# SECTION 7: STORAGE & DIRECTORY SIZING (INFORMATIONAL ONLY)
# ------------------------------------------------------------------------------
echo -e "\n--- 7. STORAGE & DIRECTORY SIZING (INFORMATIONAL ONLY) ---"
echo "  [INFO] Storage inspection is informational. Backup capacity will be approved separately."

STORAGE_METRICS_COMPLETE=true

# Root filesystem
ROOT_DEV=$(df -T / 2>/dev/null | awk 'NR==2 {print $1}')
ROOT_TYPE=$(df -T / 2>/dev/null | awk 'NR==2 {print $2}')
ROOT_AVAIL_MB=$(df -m / 2>/dev/null | awk 'NR==2 {print $4}')

if [ -n "${ROOT_AVAIL_MB}" ]; then
    echo "  Root Filesystem (/):"
    echo "    Device:          ${ROOT_DEV:-UNKNOWN}"
    echo "    Filesystem Type: ${ROOT_TYPE:-UNKNOWN}"
    echo "    Available Space: ${ROOT_AVAIL_MB} MB"
else
    echo "  Root Filesystem (/): NOT VERIFIED (unable to read available space)"
    STORAGE_METRICS_COMPLETE=false
fi

# Docker storage location
DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo "/var/lib/docker")
if [ -d "${DOCKER_ROOT}" ]; then
    DOCKER_DEV=$(df -T "${DOCKER_ROOT}" 2>/dev/null | awk 'NR==2 {print $1}')
    DOCKER_TYPE=$(df -T "${DOCKER_ROOT}" 2>/dev/null | awk 'NR==2 {print $2}')
    DOCKER_AVAIL_MB=$(df -m "${DOCKER_ROOT}" 2>/dev/null | awk 'NR==2 {print $4}')

    if [ -n "${DOCKER_AVAIL_MB}" ]; then
        echo "  Docker Root Directory (${DOCKER_ROOT}):"
        echo "    Device:          ${DOCKER_DEV:-UNKNOWN}"
        echo "    Filesystem Type: ${DOCKER_TYPE:-UNKNOWN}"
        echo "    Available Space: ${DOCKER_AVAIL_MB} MB"

        if [ -n "${ROOT_DEV}" ] && [ -n "${DOCKER_DEV}" ]; then
            if [ "${ROOT_DEV}" = "${DOCKER_DEV}" ]; then
                echo "    Mount Status:    / and ${DOCKER_ROOT} reside on the same filesystem device (${ROOT_DEV})."
            else
                echo "    Mount Status:    / and ${DOCKER_ROOT} report distinct filesystem devices (${ROOT_DEV} vs ${DOCKER_DEV})."
            fi
        fi
    else
        echo "  Docker Root Directory (${DOCKER_ROOT}): NOT VERIFIED (unable to read available space)"
        STORAGE_METRICS_COMPLETE=false
    fi
else
    echo "  Docker Root Directory (${DOCKER_ROOT}): NOT VERIFIED (directory path inaccessible)"
    STORAGE_METRICS_COMPLETE=false
fi

# Application directory sizes (public, private, backups) with finite 10-second timeout
if command -v docker &>/dev/null && docker inspect "${BACKEND_CONTAINER}" &>/dev/null; then
    if [ "${TIMEOUT_AVAILABLE}" != "true" ]; then
        echo "  Public Files Directory:  NOT VERIFIED (timeout utility unavailable)"
        echo "  Private Files Directory: NOT VERIFIED (timeout utility unavailable)"
        echo "  Backup Directory Size:   NOT VERIFIED (timeout utility unavailable)"
        STORAGE_METRICS_COMPLETE=false
    else
        PUB_SIZE=$(run_with_timeout 10 docker exec "${BACKEND_CONTAINER}" du -sh "/home/frappe/frappe-bench/sites/${SITE_NAME}/public/files" 2>/dev/null | awk '{print $1}')
        PRIV_SIZE=$(run_with_timeout 10 docker exec "${BACKEND_CONTAINER}" du -sh "/home/frappe/frappe-bench/sites/${SITE_NAME}/private/files" 2>/dev/null | awk '{print $1}')
        BACKUP_DIR_SIZE=$(run_with_timeout 10 docker exec "${BACKEND_CONTAINER}" du -sh "/home/frappe/frappe-bench/sites/${SITE_NAME}/private/backups" 2>/dev/null | awk '{print $1}')

        echo "  Public Files Directory:  ${PUB_SIZE:-NOT VERIFIED (timed out or unavailable)}"
        echo "  Private Files Directory: ${PRIV_SIZE:-NOT VERIFIED (timed out or unavailable)}"
        echo "  Backup Directory Size:   ${BACKUP_DIR_SIZE:-NOT VERIFIED (timed out or unavailable)}"

        if [ -z "${PUB_SIZE}" ] || [ -z "${PRIV_SIZE}" ] || [ -z "${BACKUP_DIR_SIZE}" ]; then
            STORAGE_METRICS_COMPLETE=false
        fi

        echo "  Recent Backup Files Inside Container:"
        run_with_timeout 5 docker exec "${BACKEND_CONTAINER}" sh -c "ls -lh /home/frappe/frappe-bench/sites/${SITE_NAME}/private/backups/ 2>/dev/null | tail -n 5" 2>/dev/null | sed 's/^/    /' || echo "    None found or inaccessible."
    fi
else
    echo "  Application directories: NOT VERIFIED (backend container not accessible)"
    STORAGE_METRICS_COMPLETE=false
fi

# Database directory size from target container with finite 10-second timeout
if [ -n "${MARIADB_TARGET}" ]; then
    if [ "${TIMEOUT_AVAILABLE}" != "true" ]; then
        echo "  Database Directory Size: NOT VERIFIED (timeout utility unavailable)"
        STORAGE_METRICS_COMPLETE=false
    else
        DB_SIZE=$(run_with_timeout 10 docker exec "${MARIADB_TARGET}" du -sh /var/lib/mysql 2>/dev/null | awk '{print $1}')
        echo "  Database Directory Size: ${DB_SIZE:-NOT VERIFIED (timed out or unavailable)}"
        if [ -z "${DB_SIZE}" ]; then
            STORAGE_METRICS_COMPLETE=false
        fi
    fi
else
    echo "  Database Directory Size: NOT VERIFIED (database container not identified)"
    STORAGE_METRICS_COMPLETE=false
fi

if [ "${STORAGE_METRICS_COMPLETE}" = "true" ]; then
    report_check "PASS" "Storage Diagnostics Collected" "All filesystem mount and sizing diagnostics gathered successfully."
else
    report_check "NOT VERIFIED" "Storage Diagnostics Collected" "One or more storage diagnostics could not be measured (see details above)."
fi

# ------------------------------------------------------------------------------
# SECTION 8: CONSOLIDATED SUMMARY & VERDICT
# ------------------------------------------------------------------------------
echo -e "\n=============================================================================="
echo "                         PHASE 1 DIAGNOSTIC SUMMARY                           "
echo "=============================================================================="
echo "  Total Checks:       $((PASS_COUNT + WARNING_COUNT + BLOCKER_COUNT + NOT_VERIFIED_COUNT))"
echo "  [PASS] Count:       ${PASS_COUNT}"
echo "  [WARNING] Count:    ${WARNING_COUNT}"
echo "  [BLOCKER] Count:    ${BLOCKER_COUNT}"
echo "  [NOT VERIFIED]:     ${NOT_VERIFIED_COUNT}"
echo "------------------------------------------------------------------------------"

if [ "${BLOCKER_COUNT}" -gt 0 ]; then
    echo ">>> FINAL VERDICT: RED (CRITICAL BLOCKERS DETECTED) <<<"
    echo "Deployment preparation must STOP. Address reported blockers before proceeding."
    echo ""
    echo "NOTICE: Phase 1 inspection does not authorize backup, migration, code deployment, or service restart."
    exit 1
elif [ "${WARNING_COUNT}" -gt 0 ] || [ "${NOT_VERIFIED_COUNT}" -gt 0 ]; then
    echo ">>> FINAL VERDICT: AMBER (WARNINGS OR UNVERIFIED CONDITIONS DETECTED) <<<"
    echo "Human review required for warnings and unverified items before deployment authorization."
    echo ""
    echo "NOTICE: Phase 1 inspection does not authorize backup, migration, code deployment, or service restart."
    exit 2
else
    echo ">>> FINAL VERDICT: GREEN (ALL READ-ONLY CHECKS PASSED) <<<"
    echo "No critical blockers detected. All diagnostic checks completed cleanly."
    echo ""
    echo "NOTICE: Phase 1 inspection does not authorize backup, migration, code deployment, or service restart."
    exit 0
fi
