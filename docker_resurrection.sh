#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if system is Ubuntu/Debian
check_debian_based() {
    if [ ! -f /etc/debian_version ] && [ ! -f /etc/lsb-release ]; then
        log_error "This script only supports Ubuntu/Debian systems"
        exit 1
    fi
    
    if [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        log_info "Detected Ubuntu: $DISTRIB_DESCRIPTION"
    else
        VERSION=$(cat /etc/debian_version)
        log_info "Detected Debian version: $VERSION"
    fi
}

# Check and install Docker on Ubuntu/Debian
check_and_install_docker() {
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Installing Docker..."
        
        # Install Docker
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]') $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        # Start and enable Docker service
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Add current user to docker group
        if [ "$EUID" -ne 0 ]; then
            sudo usermod -aG docker $USER
            log_warning "You may need to log out and log back in for Docker group changes to take effect"
        fi
        
        log_success "Docker installed successfully"
    else
        log_success "Docker is already installed: $(docker --version)"
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_warning "Docker Compose plugin not found. It should have been installed with Docker..."
        log_info "Installing Docker Compose plugin..."
        sudo apt-get update
        sudo apt-get install -y docker-compose-plugin
        log_success "Docker Compose installed: $(docker compose version)"
    else
        log_success "Docker Compose is already installed: $(docker compose version)"
    fi
}

log_info "🚀 Starting Docker Resurrection Script..."

# Check for Ubuntu/Debian and install Docker if needed
check_debian_based
check_and_install_docker

# Check if .env file exists
if [ ! -f .env ]; then
    log_warning ".env file not found. Creating from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        log_info "📝 Please edit .env file with your configuration before running again."
        exit 1
    else
        log_error ".env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("SERVER_IP" "CLIENT_IP" "SSH_USERNAME")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set in .env file"
        exit 1
    fi
done

log_info "🔧 Configuration loaded:"
log_info "   - Server IP: $SERVER_IP"
log_info "   - Client IP: $CLIENT_IP"
log_info "   - SSH Username: $SSH_USERNAME"

# Step 1: Stop running containers
log_info "📦 Step 1: Stopping existing containers..."
if docker-compose -f docker-compose.mcp.yml down; then
    log_success "Containers stopped successfully."
else
    log_error "Failed to stop containers. Exiting."
    exit 1
fi

# Step 2: Rebuild images with latest changes
log_info "🔨 Step 2: Rebuilding Docker images..."
if docker-compose -f docker-compose.mcp.yml build; then
    log_success "Images rebuilt successfully."
else
    log_error "Failed to rebuild images. Exiting."
    exit 1
fi

# Step 3: Start containers with new images
log_info "🚀 Step 3: Starting containers with new images..."
if docker-compose -f docker-compose.mcp.yml up -d; then
    log_success "Containers started successfully in detached mode."
else
    log_error "Failed to start containers. Exiting."
    exit 1
fi

# Step 4: Wait for services to be ready
log_info "⏳ Step 4: Waiting for services to be ready..."
sleep 15

# Step 5: Verify container status
log_info "🔍 Step 5: Verifying container status..."
if docker-compose -f docker-compose.mcp.yml ps; then
    log_success "Container status verified."
else
    log_error "Failed to verify container status."
    exit 1
fi

# Step 6: Health checks
log_info "🏥 Step 6: Performing health checks..."

# Check FastAPI
log_info "   Checking FastAPI service..."
if curl -f -s http://localhost:8000/health >/dev/null 2>&1; then
    log_success "   FastAPI service is healthy"
else
    log_warning "   FastAPI service is not responding (may still be starting up)"
fi

# Check Flask Frontend (if it exists in docker-compose)
log_info "   Checking Flask Frontend service..."
if docker-compose -f docker-compose.mcp.yml ps | grep -q flask-frontend; then
    if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
        log_success "   Flask Frontend is healthy"
    else
        log_warning "   Flask Frontend is not responding (may still be starting up)"
    fi
else
    log_info "   Flask Frontend service not found in docker-compose.mcp.yml"
fi

# Check MCP SSE Server
log_info "   Checking MCP SSE Server..."
if curl -f -s http://localhost:8001/health >/dev/null 2>&1; then
    log_success "   MCP SSE Server is healthy"
else
    log_warning "   MCP SSE Server is not responding (may still be starting up)"
fi

echo ""
log_success "🎉 Docker Resurrection Complete! Your services are now running with the latest changes."
echo ""
log_info "📊 Available Services:"
log_info "-------------------"
log_info "🌐 Flask Frontend: http://localhost:5000"
log_info "   - Web UI for CyPerf CE testing"
echo ""
log_info "🔧 FastAPI REST API: http://localhost:8000"
log_info "   - API documentation: http://localhost:8000/docs"
log_info "   - Health check: http://localhost:8000/health"
echo ""
log_info "📡 MCP Server: http://localhost:8001"
log_info "   - MCP Server endpoint: http://localhost:8001/mcp"
echo ""
log_info "🔌 MCP Server: Available via stdio for MCP clients"
log_info "-------------------"
echo ""
log_info "🔧 Management Commands:"
log_info "   - View logs: docker-compose -f docker-compose.mcp.yml logs -f"
log_info "   - View specific service logs: docker-compose -f docker-compose.mcp.yml logs -f [service-name]"
log_info "   - Stop all: docker-compose -f docker-compose.mcp.yml down"
log_info "   - Restart specific service: docker-compose -f docker-compose.mcp.yml restart [service-name]"
log_info "   - Check status: docker-compose -f docker-compose.mcp.yml ps"
echo ""
