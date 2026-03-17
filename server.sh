#!/bin/bash
#
# RPS-WEB Server Manager (PM2)
# ─────────────────────────────────────────────
# 1 - Start Python Backend + Frontend
# 2 - Start Java Backend   + Frontend
# 3 - Stop Kill All
# 4 - Stop Graceful
# 5 - Status & Health Check
#
# Frontend  → port 2000  (PM2: rps-frontend)
# Backend   → port 2001  (PM2: rps-python | rps-java)
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$APP_DIR/frontend"
PYTHON_DIR="$APP_DIR/backendPython"
JAVA_DIR="$APP_DIR/backendJava"
JAVA_JAR="$JAVA_DIR/target/java-1.jar"

FRONTEND_PORT=2000
BACKEND_PORT=2001

# Load environment variables from .env
if [ -f "$APP_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$APP_DIR/.env"
    set +a
fi

NODEJS="$(command -v node | xargs dirname 2>/dev/null)/npm"
NODE_BIN="$(dirname $(command -v node 2>/dev/null))"

# ─────────────────────────────────────────────
print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          RPS-WEB Server Manager (PM2)        ║${NC}"
    echo -e "${BLUE}║   Frontend :2000  |  Backend :2001           ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

check_health_url() {
    local code
    code=$(timeout 3 curl -s -o /dev/null -w "%{http_code}" "$1" 2>/dev/null)
    [ "$code" = "200" ]
}

pm2_running() {
    pm2 list 2>/dev/null | grep -q "$1.*online"
}

# ─────────────────────────────────────────────
build_frontend_if_needed() {
    if [ ! -d "$FRONTEND_DIR/.next" ] || [ ! -f "$FRONTEND_DIR/.next/BUILD_ID" ]; then
        echo -e "   ${YELLOW}🔨 Building Next.js...${NC}"
        if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
            cd "$FRONTEND_DIR" && npm install --silent
        fi
        cd "$FRONTEND_DIR" && \
            BACKEND_API_URL="http://127.0.0.1:$BACKEND_PORT" \
            PORT=$FRONTEND_PORT \
            npm run build
    fi
}

start_frontend_pm2() {
    if pm2_running "rps-frontend"; then
        echo -e "   ${YELLOW}ℹ${NC}  rps-frontend sudah running"
        return 0
    fi
    build_frontend_if_needed
    echo -e "   ${CYAN}▶${NC} Starting rps-frontend (port $FRONTEND_PORT)..."
    cd "$FRONTEND_DIR" && \
        BACKEND_API_URL="http://127.0.0.1:$BACKEND_PORT" \
        PYTHON_API_URL="http://127.0.0.1:$BACKEND_PORT" \
        PORT=$FRONTEND_PORT \
        pm2 start npm \
            --name "rps-frontend" \
            --interpreter none \
            -- start -- --port $FRONTEND_PORT
    sleep 3
    if pm2_running "rps-frontend"; then
        echo -e "   ${GREEN}✓${NC} rps-frontend started"
    else
        echo -e "   ${RED}✗${NC} rps-frontend FAILED - check: pm2 logs rps-frontend"
        return 1
    fi
}

stop_frontend_pm2() {
    if pm2_running "rps-frontend"; then
        pm2 delete rps-frontend 2>/dev/null
        echo -e "   ${GREEN}✓${NC} rps-frontend stopped"
    else
        echo -e "   ${YELLOW}ℹ${NC}  rps-frontend tidak running"
    fi
}

start_python_pm2() {
    if pm2_running "rps-backend"; then
        echo -e "   ${YELLOW}ℹ${NC}  rps-backend sudah running"
        return 0
    fi
    echo -e "   ${CYAN}▶${NC} Starting rps-backend Python (port $BACKEND_PORT)..."

    local python_exec="python3"
    if [ -f "$PYTHON_DIR/venv/bin/python" ]; then
        python_exec="$PYTHON_DIR/venv/bin/python"
    elif [ -f "/home/ubuntu/.venv/bin/python3" ]; then
        python_exec="/home/ubuntu/.venv/bin/python3"
    fi

    OPENAI_API_KEY="$OPENAI_API_KEY" pm2 start "$python_exec" \
        --name "rps-backend" \
        --interpreter none \
        -- "$PYTHON_DIR/api_server.py" --port "$BACKEND_PORT"
    sleep 4
    if pm2_running "rps-backend"; then
        echo -e "   ${GREEN}✓${NC} rps-backend (Python) started"
    else
        echo -e "   ${RED}✗${NC} rps-backend FAILED - check: pm2 logs rps-backend"
        return 1
    fi
}

start_java_pm2() {
    if pm2_running "rps-backend"; then
        echo -e "   ${YELLOW}ℹ${NC}  rps-backend sudah running"
        return 0
    fi
    if [ ! -f "$JAVA_JAR" ]; then
        echo -e "   ${RED}✗${NC} Java JAR tidak ditemukan: $JAVA_JAR"
        echo -e "   Build dulu: cd $JAVA_DIR && mvn package -DskipTests"
        return 1
    fi
    echo -e "   ${CYAN}▶${NC} Starting rps-backend Java (port $BACKEND_PORT)..."
    OPENAI_API_KEY="$OPENAI_API_KEY" pm2 start java \
        --name "rps-backend" \
        --interpreter none \
        -- -jar "$JAVA_JAR" --server.port="$BACKEND_PORT"
    sleep 8
    if pm2_running "rps-backend"; then
        echo -e "   ${GREEN}✓${NC} rps-backend (Java) started"
    else
        echo -e "   ${RED}✗${NC} rps-backend FAILED - check: pm2 logs rps-backend"
        return 1
    fi
}

stop_backend_pm2() {
    if pm2_running "rps-backend"; then
        pm2 delete rps-backend 2>/dev/null
        echo -e "   ${GREEN}✓${NC} rps-backend stopped"
    else
        echo -e "   ${YELLOW}ℹ${NC}  rps-backend tidak running"
    fi
}

# ─────────────────────────────────────────────
check_health() {
    echo ""
    echo -e "${YELLOW}🌐 Health Check:${NC}"
    local ok=0

    if check_health_url "http://localhost:$FRONTEND_PORT"; then
        echo -e "   ${GREEN}✓${NC} Frontend   http://localhost:$FRONTEND_PORT"
    else
        echo -e "   ${RED}✗${NC} Frontend   http://localhost:$FRONTEND_PORT  (not responding)"
        ok=1
    fi

    if check_health_url "http://localhost:$BACKEND_PORT/health"; then
        local resp
        resp=$(timeout 3 curl -s "http://localhost:$BACKEND_PORT/health" 2>/dev/null)
        echo -e "   ${GREEN}✓${NC} Backend    http://localhost:$BACKEND_PORT/health → $resp"
    else
        echo -e "   ${RED}✗${NC} Backend    http://localhost:$BACKEND_PORT/health  (not responding)"
        ok=1
    fi

    if check_health_url "https://otomasi.app"; then
        echo -e "   ${GREEN}✓${NC} Public     https://otomasi.app"
    else
        echo -e "   ${RED}✗${NC} Public     https://otomasi.app  (not responding)"
    fi

    echo ""
    return $ok
}

check_status() {
    echo -e "${YELLOW}📊 Status PM2:${NC}"
    echo ""
    pm2 list 2>/dev/null | grep -E "rps-|Name|─|App"
    echo ""

    echo -e "${YELLOW}📡 Ports:${NC}"
    for port in $FRONTEND_PORT $BACKEND_PORT 80 443; do
        if ss -tlnp 2>/dev/null | grep -q ":$port "; then
            echo -e "   ${GREEN}✓${NC} :$port  LISTENING"
        else
            echo -e "   ${RED}✗${NC} :$port  NOT LISTENING"
        fi
    done

    check_health

    echo -e "${CYAN}🌍 URL Akses:${NC}"
    echo -e "   http://localhost:$FRONTEND_PORT"
    echo -e "   https://otomasi.app"
    echo ""
}

# ─────────────────────────────────────────────
do_start_python() {
    echo -e "${YELLOW}🚀 Opsi 1: Python Backend + Frontend${NC}"
    echo ""
    # Stop java backend if running
    pm2_running "rps-backend" && pm2 delete rps-backend 2>/dev/null
    start_python_pm2 && start_frontend_pm2
    pm2 save --force 2>/dev/null
    check_status
}

do_start_java() {
    echo -e "${YELLOW}🚀 Opsi 2: Java Backend + Frontend${NC}"
    echo ""
    # Stop python backend if running
    pm2_running "rps-backend" && pm2 delete rps-backend 2>/dev/null
    start_java_pm2 && start_frontend_pm2
    pm2 save --force 2>/dev/null
    check_status
}

do_kill_all() {
    echo -e "${YELLOW}⚡ Opsi 3: Kill All (Force)${NC}"
    echo ""
    pm2 delete rps-frontend rps-backend 2>/dev/null
    # Kill by port as fallback
    for port in $FRONTEND_PORT $BACKEND_PORT; do
        local pids
        pids=$(fuser "$port/tcp" 2>/dev/null)
        [ -n "$pids" ] && kill -9 $pids 2>/dev/null && echo -e "   ${GREEN}✓${NC} Port $port: killed"
    done
    pm2 save --force 2>/dev/null
    echo -e "${GREEN}✅ Semua proses RPS dihentikan.${NC}"
    echo ""
}

do_stop() {
    echo -e "${YELLOW}🛑 Opsi 4: Stop Graceful${NC}"
    echo ""
    stop_backend_pm2
    stop_frontend_pm2
    pm2 save --force 2>/dev/null
    echo -e "${GREEN}✅ Selesai.${NC}"
    echo ""
}

# ─────────────────────────────────────────────
show_menu() {
    print_header
    echo -e "${CYAN}Pilih opsi:${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}  Start Backend Python + Frontend  [:$FRONTEND_PORT / :$BACKEND_PORT]"
    echo -e "  ${GREEN}2${NC}  Start Backend Java   + Frontend  [:$FRONTEND_PORT / :$BACKEND_PORT]"
    echo -e "  ${RED}3${NC}  Stop Kill All (Force)"
    echo -e "  ${YELLOW}4${NC}  Stop Graceful"
    echo -e "  ${BLUE}5${NC}  Status & Health Check"
    echo -e "  ${BLUE}0${NC}  Keluar"
    echo ""
    read -rp "Pilihan [0-5]: " choice
    echo ""
    case "$choice" in
        1) do_start_python ;;
        2) do_start_java ;;
        3) do_kill_all ;;
        4) do_stop ;;
        5) check_status ;;
        0) exit 0 ;;
        *) echo -e "${RED}Pilihan tidak valid.${NC}" ;;
    esac
}

# ─────────────────────────────────────────────
case "${1:-}" in
    1|python)  print_header; do_start_python ;;
    2|java)    print_header; do_start_java ;;
    3|killall) print_header; do_kill_all ;;
    4|stop)    print_header; do_stop ;;
    5|status)  print_header; check_status ;;
    "")        show_menu ;;
    *)
        echo "Usage: $0 [1|2|3|4|5]"
        echo "  1 / python  - Start Python backend + Frontend (:$FRONTEND_PORT/:$BACKEND_PORT)"
        echo "  2 / java    - Start Java backend   + Frontend (:$FRONTEND_PORT/:$BACKEND_PORT)"
        echo "  3 / killall - Kill all (Force)"
        echo "  4 / stop    - Stop graceful"
        echo "  5 / status  - Status & health check"
        ;;
esac
