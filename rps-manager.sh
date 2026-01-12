#!/bin/bash
#
# RPS-WEB Manager
# Script untuk mengelola RPS-WEB Server dengan PM2 & Nginx
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Paths
APP_DIR="/root/rps-web"
PYTHON_DIR="$APP_DIR/python"
PYTHON_LOG="/tmp/python_api.log"

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       RPS-WEB Server Manager           ║${NC}"
    echo -e "${BLUE}║     PM2 + Nginx + Python API           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
}

check_status() {
    echo -e "${YELLOW}📊 Checking Server Status...${NC}"
    echo ""
    
    # Check Nginx
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "   ${GREEN}✓${NC} Nginx:          ${GREEN}RUNNING${NC}"
    else
        echo -e "   ${RED}✗${NC} Nginx:          ${RED}STOPPED${NC}"
    fi
    
    # Check Next.js via PM2
    PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"rps-web"' | head -1)
    if [ -n "$PM2_STATUS" ]; then
        PM2_ONLINE=$(pm2 jlist 2>/dev/null | grep -o '"status":"online"' | head -1)
        if [ -n "$PM2_ONLINE" ]; then
            echo -e "   ${GREEN}✓${NC} Next.js (PM2):  ${GREEN}RUNNING${NC}"
        else
            echo -e "   ${RED}✗${NC} Next.js (PM2):  ${RED}STOPPED${NC}"
        fi
    else
        echo -e "   ${RED}✗${NC} Next.js (PM2):  ${RED}NOT CONFIGURED${NC}"
    fi
    
    # Check Python API
    PYTHON_PID=$(pgrep -f "api_server.py" 2>/dev/null)
    if [ -n "$PYTHON_PID" ]; then
        echo -e "   ${GREEN}✓${NC} Python API:     ${GREEN}RUNNING${NC} (PID: $PYTHON_PID)"
    else
        echo -e "   ${RED}✗${NC} Python API:     ${RED}STOPPED${NC}"
    fi
    
    # Check ports
    echo ""
    echo -e "${YELLOW}📡 Port Status:${NC}"
    if ss -tlnp 2>/dev/null | grep -q ":80 "; then
        echo -e "   ${GREEN}✓${NC} Port 80 (Nginx):    ${GREEN}LISTENING${NC}"
    else
        echo -e "   ${RED}✗${NC} Port 80 (Nginx):    ${RED}NOT LISTENING${NC}"
    fi
    
    if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo -e "   ${GREEN}✓${NC} Port 3000 (Next.js): ${GREEN}LISTENING${NC}"
    else
        echo -e "   ${RED}✗${NC} Port 3000 (Next.js): ${RED}NOT LISTENING${NC}"
    fi
    
    if ss -tlnp 2>/dev/null | grep -q ":5000 "; then
        echo -e "   ${GREEN}✓${NC} Port 5000 (Python):  ${GREEN}LISTENING${NC}"
    else
        echo -e "   ${RED}✗${NC} Port 5000 (Python):  ${RED}NOT LISTENING${NC}"
    fi
    
    if ss -tlnp 2>/dev/null | grep -q ":443 "; then
        echo -e "   ${GREEN}✓${NC} Port 443 (HTTPS):   ${GREEN}LISTENING${NC}"
    else
        echo -e "   ${YELLOW}!${NC} Port 443 (HTTPS):   ${YELLOW}NOT LISTENING${NC}"
    fi
    
    # Check Dependencies
    echo ""
    echo -e "${YELLOW}🔧 Dependencies:${NC}"
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        echo -e "   ${GREEN}✓${NC} Node.js: $NODE_VER"
    else
        echo -e "   ${RED}✗${NC} Node.js: Not installed"
    fi
    
    if command -v pm2 &> /dev/null; then
        PM2_VER=$(pm2 -v)
        echo -e "   ${GREEN}✓${NC} PM2: v$PM2_VER"
    else
        echo -e "   ${RED}✗${NC} PM2: Not installed"
    fi
    
    if command -v python3 &> /dev/null; then
        PYTHON_VER=$(python3 --version)
        echo -e "   ${GREEN}✓${NC} $PYTHON_VER"
    else
        echo -e "   ${RED}✗${NC} Python3: Not installed"
    fi
    
    # Check API health
    echo ""
    echo -e "${YELLOW}🌐 API Health:${NC}"
    
    WEB_STATUS=$(timeout 2 curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null)
    if [ "$WEB_STATUS" = "200" ]; then
        echo -e "   ${GREEN}✓${NC} Website (port 80): OK"
    else
        echo -e "   ${RED}✗${NC} Website (port 80): Error ($WEB_STATUS)"
    fi
    
    API_HEALTH=$(timeout 2 curl -s http://localhost:5000/health 2>/dev/null)
    if [ -n "$API_HEALTH" ]; then
        echo -e "   ${GREEN}✓${NC} Python API: $API_HEALTH"
    else
        echo -e "   ${RED}✗${NC} Python API: Not responding"
    fi
    
    # Check SSL
    echo ""
    echo -e "${YELLOW}🔒 SSL Status:${NC}"
    if [ -f "/etc/letsencrypt/live/otomasi.app/fullchain.pem" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/otomasi.app/fullchain.pem 2>/dev/null | cut -d= -f2)
        echo -e "   ${GREEN}✓${NC} SSL Certificate: Valid until $EXPIRY"
    else
        echo -e "   ${YELLOW}!${NC} SSL Certificate: Not found"
    fi
    
    echo ""
    echo -e "${CYAN}🌍 Access URLs:${NC}"
    echo -e "   https://otomasi.app"
    echo -e "   http://206.189.45.199"
    echo ""
}

start_services() {
    echo -e "${YELLOW}🚀 Starting Services...${NC}"
    
    # Start Nginx
    if ! systemctl is-active --quiet nginx 2>/dev/null; then
        sudo systemctl start nginx
        if systemctl is-active --quiet nginx; then
            echo -e "   ${GREEN}✓${NC} Nginx started"
        else
            echo -e "   ${RED}✗${NC} Failed to start Nginx"
        fi
    else
        echo -e "   ${YELLOW}!${NC} Nginx already running"
    fi
    
    # Start Next.js via PM2
    PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"rps-web"' | head -1)
    if [ -z "$PM2_STATUS" ]; then
        cd "$APP_DIR"
        PORT=3000 pm2 start "npm run start" --name "rps-web"
        sleep 2
        echo -e "   ${GREEN}✓${NC} Next.js started via PM2"
    else
        pm2 restart rps-web 2>/dev/null
        echo -e "   ${GREEN}✓${NC} Next.js restarted via PM2"
    fi
    
    # Start Python API
    PYTHON_PID=$(pgrep -f "api_server.py" 2>/dev/null)
    if [ -z "$PYTHON_PID" ]; then
        cd "$PYTHON_DIR"
        nohup python3 api_server.py > "$PYTHON_LOG" 2>&1 &
        sleep 2
        PYTHON_PID=$(pgrep -f "api_server.py" 2>/dev/null)
        if [ -n "$PYTHON_PID" ]; then
            echo -e "   ${GREEN}✓${NC} Python API started (PID: $PYTHON_PID)"
        else
            echo -e "   ${RED}✗${NC} Failed to start Python API. Check $PYTHON_LOG"
        fi
    else
        echo -e "   ${YELLOW}!${NC} Python API already running (PID: $PYTHON_PID)"
    fi
    
    pm2 save 2>/dev/null
    echo ""
}

stop_services() {
    echo -e "${YELLOW}🛑 Stopping Services...${NC}"
    
    pm2 stop rps-web 2>/dev/null
    echo -e "   ${GREEN}✓${NC} Next.js stopped"
    
    PYTHON_PID=$(pgrep -f "api_server.py" 2>/dev/null)
    if [ -n "$PYTHON_PID" ]; then
        pkill -f "api_server.py"
        echo -e "   ${GREEN}✓${NC} Python API stopped"
    else
        echo -e "   ${YELLOW}!${NC} Python API was not running"
    fi
    
    echo -e "   ${YELLOW}!${NC} Nginx left running (use 'sudo systemctl stop nginx' to stop)"
    echo ""
}

restart_services() {
    echo -e "${YELLOW}🔄 Restarting Services...${NC}"
    
    sudo systemctl reload nginx 2>/dev/null
    echo -e "   ${GREEN}✓${NC} Nginx reloaded"
    
    pm2 restart rps-web 2>/dev/null
    echo -e "   ${GREEN}✓${NC} Next.js restarted"
    
    pkill -f "api_server.py" 2>/dev/null
    sleep 1
    cd "$PYTHON_DIR"
    nohup python3 api_server.py > "$PYTHON_LOG" 2>&1 &
    sleep 2
    PYTHON_PID=$(pgrep -f "api_server.py" 2>/dev/null)
    if [ -n "$PYTHON_PID" ]; then
        echo -e "   ${GREEN}✓${NC} Python API restarted (PID: $PYTHON_PID)"
    else
        echo -e "   ${RED}✗${NC} Failed to restart Python API"
    fi
    echo ""
}

show_logs() {
    echo -e "${YELLOW}📋 Recent Logs:${NC}"
    echo ""
    echo -e "${BLUE}=== PM2 Logs (Next.js) ===${NC}"
    pm2 logs rps-web --lines 15 --nostream 2>/dev/null
    echo ""
    echo -e "${BLUE}=== Python API Log ===${NC}"
    if [ -f "$PYTHON_LOG" ]; then
        tail -15 "$PYTHON_LOG"
    else
        echo "No log file found"
    fi
    echo ""
    echo -e "${BLUE}=== Nginx Error Log ===${NC}"
    sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No access to nginx logs"
    echo ""
}

rebuild() {
    echo -e "${YELLOW}🔨 Rebuilding Application...${NC}"
    
    pm2 stop rps-web 2>/dev/null
    
    cd "$APP_DIR"
    echo -e "   Building Next.js..."
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✓${NC} Build successful"
    else
        echo -e "   ${RED}✗${NC} Build failed"
        return 1
    fi
    
    pm2 restart rps-web 2>/dev/null
    pm2 save 2>/dev/null
    echo -e "   ${GREEN}✓${NC} Application restarted"
    echo ""
}

renew_ssl() {
    echo -e "${YELLOW}🔒 Renewing SSL Certificate...${NC}"
    sudo certbot renew --nginx
    sudo systemctl reload nginx
    echo -e "   ${GREEN}✓${NC} SSL renewal complete"
    echo ""
}

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  status    - Check status of all services"
    echo "  logs      - Show recent logs"
    echo "  rebuild   - Rebuild and restart"
    echo "  renew-ssl - Renew SSL certificate"
    echo "  help      - Show this help message"
    echo ""
}

# Main
print_header

case "$1" in
    start) start_services ;;
    stop) stop_services ;;
    restart) restart_services ;;
    status) check_status ;;
    logs) show_logs ;;
    rebuild) rebuild ;;
    renew-ssl) renew_ssl ;;
    help|--help|-h) show_help ;;
    *)
        if [ -z "$1" ]; then
            echo "Select an option:"
            echo "  1) Start services"
            echo "  2) Stop services"
            echo "  3) Restart services"
            echo "  4) Check status"
            echo "  5) Show logs"
            echo "  6) Rebuild"
            echo "  7) Renew SSL"
            echo "  8) Exit"
            echo ""
            read -p "Enter choice [1-8]: " choice
            case $choice in
                1) start_services ;;
                2) stop_services ;;
                3) restart_services ;;
                4) check_status ;;
                5) show_logs ;;
                6) rebuild ;;
                7) renew_ssl ;;
                8) exit 0 ;;
                *) echo "Invalid choice" ;;
            esac
        else
            echo "Unknown command: $1"
            show_help
        fi
        ;;
esac
