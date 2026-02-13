#!/bin/bash
#
# RPS-WEB Complete Setup Script
# Instalasi lengkap dari awal: Node.js, Python, PM2, Certbot, Nginx, dan konfigurasi sistem
#
# Usage: ./setup.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DOMAIN="otomasi.app"
APP_DIR="/root/otomasi/rps-web"
PYTHON_DIR="$APP_DIR/python"
EMAIL="admin@otomasi.app"
GITHUB_REPO="https://github.com/otomasi-obe/rps-web.git"

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║    RPS-WEB Complete Setup Script       ║${NC}"
    echo -e "${BLUE}║      Systemd + Nginx + Python API      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Script harus dijalankan dengan sudo atau sebagai root"
        exit 1
    fi
    print_success "Running as root"
}

update_system() {
    print_step "Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq
    print_success "System packages updated"
}

install_dependencies() {
    print_step "Installing system dependencies..."
    
    apt-get install -y -qq \
        curl wget git build-essential \
        python3 python3-pip python3-venv \
        certbot python3-certbot-nginx \
        nginx \
        net-tools openssl
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_step "Installing Node.js and npm..."
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        print_info "Node.js already installed: $NODE_VER"
        return 0
    fi
    
    # Install NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install Node.js LTS
    nvm install --lts
    nvm use --lts
    
    # Update npm
    npm install -g npm@latest
    
    print_success "Node.js $(node -v) and npm $(npm -v) installed"
}

install_python_packages() {
    print_step "Installing Python packages..."
    
    if [ ! -d "$PYTHON_DIR/venv" ]; then
        python3 -m venv "$PYTHON_DIR/venv"
        print_success "Python venv created"
    fi
    
    source "$PYTHON_DIR/venv/bin/activate"
    
    pip install --upgrade pip -q
    pip install -q -r "$PYTHON_DIR/requirements.txt" 2>/dev/null || true
    
    # Install required packages if requirements.txt doesn't exist
    if [ ! -f "$PYTHON_DIR/requirements.txt" ]; then
        pip install -q openai python-docx pillow
        print_success "Default Python packages installed (openai, python-docx, pillow)"
    else
        print_success "Python packages from requirements.txt installed"
    fi
}

setup_nodejs_env() {
    print_step "Setting up Node.js environment..."
    
    cd "$APP_DIR"
    npm install -q
    
    print_success "npm dependencies installed"
}

create_env_file() {
    print_step "Creating .env.local file..."
    
    if [ -f "$APP_DIR/.env.local" ]; then
        print_info ".env.local already exists, skipping..."
        return 0
    fi
    
    read -p "Enter OpenAI API Key: " openai_key
    
    cat > "$APP_DIR/.env.local" << EOF
OPENAI_API_KEY=$openai_key
PYTHON_API_URL=http://127.0.0.1:5000
EOF
    
    chmod 600 "$APP_DIR/.env.local"
    print_success ".env.local created"
}

setup_systemd_services() {
    print_step "Setting up systemd services..."
    
    # Get Node.js path
    NODE_PATH=$(which node)
    NPM_PATH=$(which npm)
    
    # Create Next.js service
    cat > /etc/systemd/system/rps-nextjs.service << EOF
[Unit]
Description=RPS Next.js Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=PATH=$(dirname $NPM_PATH):/usr/local/bin:/usr/bin:/bin
ExecStart=$NPM_PATH run dev
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rps-nextjs

[Install]
WantedBy=multi-user.target
EOF
    
    print_success "rps-nextjs.service created"
    
    # Create Python API service
    cat > /etc/systemd/system/rps-python.service << EOF
[Unit]
Description=RPS Python API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PYTHON_DIR
Environment=PYTHONPATH=$PYTHON_DIR
ExecStart=/usr/bin/python3 $PYTHON_DIR/api_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rps-python

[Install]
WantedBy=multi-user.target
EOF
    
    print_success "rps-python.service created"
    
    # Reload systemd
    systemctl daemon-reload
    systemctl enable rps-nextjs rps-python
    
    print_success "Systemd services enabled"
}

setup_nginx() {
    print_step "Setting up Nginx..."
    
    # Backup original nginx config
    if [ ! -f /etc/nginx/sites-available/default.bak ]; then
        cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
    fi
    
    # Create Nginx config
    cat > /etc/nginx/sites-available/default << 'EOF'
upstream nextjs {
    server 127.0.0.1:3000;
}

upstream python_api {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    listen [::]:80;
    server_name otomasi.app www.otomasi.app 43.134.63.240;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name otomasi.app www.otomasi.app 43.134.63.240;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/otomasi.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/otomasi.app/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;
    
    # Logging
    access_log /var/log/nginx/otomasi.app.access.log;
    error_log /var/log/nginx/otomasi.app.error.log;
    
    client_max_body_size 100M;
    
    # Next.js proxy
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Python API proxy
    location /api/generate {
        proxy_pass http://python_api/generate;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Long timeout untuk generate
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    location /api/export {
        proxy_pass http://python_api/export;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Long timeout untuk export
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF
    
    # Test nginx config
    if nginx -t 2>/dev/null; then
        systemctl restart nginx
        print_success "Nginx configured and restarted"
    else
        print_error "Nginx configuration failed"
        return 1
    fi
}

renew_ssl_certificate() {
    print_step "Setting up SSL certificate..."
    
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        print_info "SSL certificate already exists"
        return 0
    fi
    
    print_info "Certbot will now configure SSL certificate for $DOMAIN"
    print_info "Make sure domain is pointing to this server IP (43.134.63.240)"
    
    read -p "Continue with SSL setup? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot certonly --nginx \
            -d "$DOMAIN" \
            -d "www.$DOMAIN" \
            --non-interactive \
            --agree-tos \
            -m "$EMAIL" 2>&1 | grep -v "^$" || print_info "SSL certificate setup completed or already exists"
        
        print_success "SSL certificate configured"
        
        # Wait and recreate Nginx config to use certificates
        sleep 2
        setup_nginx
    else
        print_info "SSL setup skipped - you can run 'certbot certonly --nginx' manually later"
    fi
}

setup_cron_ssl_renewal() {
    print_step "Setting up SSL auto-renewal cron job..."
    
    # Add certbot renewal to crontab
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx") | crontab -
        print_success "SSL auto-renewal cron job added"
    else
        print_info "SSL auto-renewal cron job already exists"
    fi
}

build_nextjs() {
    print_step "Building Next.js application..."
    
    cd "$APP_DIR"
    npm run build
    
    print_success "Next.js build completed"
}

start_services() {
    print_step "Starting services..."
    
    systemctl start rps-nextjs
    sleep 3
    
    systemctl start rps-python
    sleep 3
    
    systemctl restart nginx
    
    print_success "All services started"
}

verify_installation() {
    print_step "Verifying installation..."
    echo ""
    
    # Check Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js: $(node -v)"
    else
        print_error "Node.js not found"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_success "npm: $(npm -v)"
    else
        print_error "npm not found"
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        print_success "Python: $(python3 --version)"
    else
        print_error "Python not found"
    fi
    
    # Check Nginx
    if command -v nginx &> /dev/null; then
        print_success "Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
    else
        print_error "Nginx not found"
    fi
    
    # Check Certbot
    if command -v certbot &> /dev/null; then
        print_success "Certbot installed"
    else
        print_error "Certbot not found"
    fi
    
    # Check systemd services
    echo ""
    if systemctl list-unit-files | grep -q rps-nextjs.service; then
        print_success "rps-nextjs.service registered"
    else
        print_error "rps-nextjs.service not found"
    fi
    
    if systemctl list-unit-files | grep -q rps-python.service; then
        print_success "rps-python.service registered"
    else
        print_error "rps-python.service not found"
    fi
    
    # Check ports
    echo ""
    sleep 2
    if ss -tlnp 2>/dev/null | grep -q ":3000"; then
        print_success "Port 3000 (Next.js) is listening"
    else
        print_info "Port 3000 (Next.js) not yet listening (may need more time)"
    fi
    
    if ss -tlnp 2>/dev/null | grep -q ":5000"; then
        print_success "Port 5000 (Python API) is listening"
    else
        print_info "Port 5000 (Python API) not yet listening (may need more time)"
    fi
    
    if ss -tlnp 2>/dev/null | grep -q ":80"; then
        print_success "Port 80 (Nginx) is listening"
    else
        print_error "Port 80 (Nginx) not listening"
    fi
    
    if ss -tlnp 2>/dev/null | grep -q ":443"; then
        print_success "Port 443 (HTTPS) is listening"
    else
        print_info "Port 443 (HTTPS) not yet listening"
    fi
}

print_next_steps() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Installation Complete!${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo "1. Check service status:"
    echo -e "   ${BLUE}./rps-manager.sh status${NC}"
    echo ""
    echo "2. View logs:"
    echo -e "   ${BLUE}sudo journalctl -u rps-nextjs -f${NC}"
    echo -e "   ${BLUE}sudo journalctl -u rps-python -f${NC}"
    echo ""
    echo "3. Access your application:"
    echo -e "   ${BLUE}https://$DOMAIN${NC}"
    echo ""
    echo "4. Manage services:"
    echo -e "   ${BLUE}./rps-manager.sh restart${NC}"
    echo -e "   ${BLUE}./rps-manager.sh stop${NC}"
    echo -e "   ${BLUE}./rps-manager.sh start${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "- If services fail to start, check logs with 'sudo journalctl -u <service> -n 50'"
    echo "- If SSL certificate is not configured, run: sudo certbot certonly --nginx"
    echo "- Update API URL in .env.local if Python API is on a different host"
    echo ""
}

# Main execution
main() {
    print_header
    
    print_info "This script will install and configure:"
    echo "  • Node.js & npm"
    echo "  • Python 3 & pip"
    echo "  • Nginx web server"
    echo "  • Certbot for SSL/TLS"
    echo "  • Systemd services"
    echo ""
    
    read -p "Continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled"
        exit 0
    fi
    
    check_root
    update_system
    install_dependencies
    install_nodejs
    
    # Check if app directory exists, if not create it
    if [ ! -d "$APP_DIR" ]; then
        print_step "Cloning repository..."
        mkdir -p "$(dirname $APP_DIR)"
        git clone "$GITHUB_REPO" "$APP_DIR"
        print_success "Repository cloned"
    else
        print_info "Application directory already exists at $APP_DIR"
    fi
    
    cd "$APP_DIR"
    
    setup_nodejs_env
    install_python_packages
    create_env_file
    build_nextjs
    setup_systemd_services
    setup_nginx
    renew_ssl_certificate
    setup_cron_ssl_renewal
    start_services
    
    sleep 5
    verify_installation
    print_next_steps
}

# Run main function
main
