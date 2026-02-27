#!/bin/bash

###############################################################################
# MadMatch Deployment Script
# Deploys MadMatch to DEV and PROD environments with automated validation
###############################################################################

set -euo pipefail

# Configuration
REPO_DIR="/opt/madmatch"
DEV_PORT=8080
PROD_PORT=8081
BACKEND_DEV_PORT=4001
BACKEND_PROD_PORT=4002

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}INFO${NC}: $1"
}

log_success() {
    echo -e "${GREEN}SUCCESS${NC}: $1"
}

log_error() {
    echo -e "${RED}ERROR${NC}: $1"
}

log_warning() {
    echo -e "${YELLOW}WARNING${NC}: $1"
}

# Check if running as correct user
if [ "$(whoami)" != "moltbot" ]; then
    log_error "This script must be run as user 'moltbot'"
    exit 1
fi

# Parse arguments
ENVIRONMENT=${1:-"both"}
SKIP_VALIDATION=${2:-"false"}

if [[ ! "$ENVIRONMENT" =~ ^(dev|prod|both)$ ]]; then
    log_error "Invalid environment. Use: dev, prod, or both"
    echo "Usage: $0 [dev|prod|both] [skip-validation]"
    exit 1
fi

###############################################################################
# Deployment Functions
###############################################################################

deploy_backend() {
    local env=$1
    local port=$2
    local service="madmatch-${env}-backend"
    
    log_info "Deploying $env backend on port $port..."
    
    cd "$REPO_DIR/backend"
    
    # Install dependencies
    npm install --production
    
    # Create systemd service if it doesn't exist
    if ! systemctl list-unit-files | grep -q "$service"; then
        log_info "Creating systemd service: $service"
        sudo bash -c "cat > /etc/systemd/system/$service.service" <<EOF
[Unit]
Description=MadMatch $env Backend
After=network.target

[Service]
Type=simple
User=moltbot
WorkingDirectory=$REPO_DIR/backend
Environment="NODE_ENV=production"
Environment="PORT=$port"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable "$service"
    fi
    
    # Restart service
    sudo systemctl restart "$service"
    sleep 2
    
    # Check status
    if systemctl is-active --quiet "$service"; then
        log_success "$service is running"
    else
        log_error "$service failed to start"
        sudo systemctl status "$service" --no-pager
        exit 1
    fi
}

deploy_frontend() {
    local env=$1
    local service="madmatch-${env}-frontend"
    
    log_info "Deploying $env frontend..."
    
    cd "$REPO_DIR/frontend"
    
    # Install dependencies
    npm install
    
    # Build frontend
    log_info "Building frontend for $env..."
    npm run build
    
    # Create systemd service for serving build (using simple http-server)
    if ! command -v http-server &> /dev/null; then
        log_info "Installing http-server globally..."
        sudo npm install -g http-server
    fi
    
    if ! systemctl list-unit-files | grep -q "$service"; then
        log_info "Creating systemd service: $service"
        sudo bash -c "cat > /etc/systemd/system/$service.service" <<EOF
[Unit]
Description=MadMatch $env Frontend
After=network.target

[Service]
Type=simple
User=moltbot
WorkingDirectory=$REPO_DIR/frontend/build
ExecStart=/usr/bin/http-server -p 3000 --silent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable "$service"
    fi
    
    # Note: Frontend is served via nginx, service is backup
    log_success "Frontend build completed for $env"
}

configure_nginx() {
    log_info "Configuring nginx..."
    
    # Create nginx config for MadMatch
    sudo bash -c "cat > /etc/nginx/sites-available/madmatch" <<'EOF'
server {
    listen 8080;
    server_name _;
    
    # DEV Frontend
    location / {
        root /opt/madmatch/frontend/build;
        try_files $uri /index.html;
    }
    
    # DEV Backend API
    location /api/ {
        proxy_pass http://localhost:4001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 8081;
    server_name _;
    
    # PROD Frontend
    location / {
        root /opt/madmatch/frontend/build;
        try_files $uri /index.html;
    }
    
    # PROD Backend API
    location /api/ {
        proxy_pass http://localhost:4002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/madmatch /etc/nginx/sites-enabled/madmatch
    
    # Test nginx config
    sudo nginx -t
    
    # Reload nginx
    sudo systemctl reload nginx
    
    log_success "Nginx configured and reloaded"
}

###############################################################################
# Main Deployment Flow
###############################################################################

echo "=================================================="
echo "MadMatch Deployment Script"
echo "Environment: $ENVIRONMENT"
echo "Started: $(date)"
echo "=================================================="

# Update repository
log_info "Updating repository..."
cd "$REPO_DIR"
git fetch --tags
git pull

# Get current version
VERSION=$(git describe --tags --always)
log_info "Deploying version: $VERSION"

# Deploy based on environment
if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "both" ]; then
    log_info "Deploying DEV environment..."
    deploy_backend "dev" "$BACKEND_DEV_PORT"
    deploy_frontend "dev"
fi

if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "both" ]; then
    log_info "Deploying PROD environment..."
    deploy_backend "prod" "$BACKEND_PROD_PORT"
    deploy_frontend "prod"
fi

# Configure nginx (for both environments)
configure_nginx

# Wait for services to stabilize
log_info "Waiting for services to stabilize..."
sleep 5

# Run validation tests
if [ "$SKIP_VALIDATION" != "skip-validation" ]; then
    log_info "Running deployment validation tests..."
    
    if "$REPO_DIR/validate-deployment.sh"; then
        log_success "All validation tests passed!"
    else
        log_error "Validation tests failed!"
        log_warning "Deployment completed but validation failed - review errors above"
        exit 1
    fi
else
    log_warning "Skipping validation tests (not recommended)"
fi

echo ""
echo "=================================================="
log_success "Deployment completed successfully!"
echo "=================================================="
echo "Version: $VERSION"
echo "DEV: http://192.168.1.203:$DEV_PORT"
echo "PROD: http://192.168.1.203:$PROD_PORT"
echo "=================================================="
