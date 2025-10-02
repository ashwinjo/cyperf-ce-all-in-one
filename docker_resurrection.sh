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

# Check Docker installation
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        log_info "After installing Docker Desktop, restart your terminal and run this script again."
        exit 1
    else
        log_success "Docker is installed: $(docker --version)"
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please ensure Docker Desktop is properly installed."
        exit 1
    else
        log_success "Docker Compose is installed: $(docker compose version)"
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker Desktop and try again."
        exit 1
    else
        log_success "Docker daemon is running"
    fi
}

log_info "🚀 Starting Docker Resurrection Script..."

# Check Docker installation and status
check_docker

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

# Set default SSH username if not provided
if [ -z "$SSH_USERNAME" ]; then
    SSH_USERNAME=$(whoami)
    log_warning "SSH_USERNAME not set in .env file, using current user: $SSH_USERNAME"
fi

# Check SSH authentication method
if [ -z "$SSH_KEY_HOST_PATH" ] && [ -z "$SSH_PASSWORD" ]; then
    log_error "Either SSH_KEY_HOST_PATH or SSH_PASSWORD must be set in .env file"
    log_info "Please configure one of the following:"
    log_info "   - SSH_KEY_HOST_PATH: Path to your SSH private key"
    log_info "   - SSH_PASSWORD: SSH password for authentication"
    exit 1
fi

log_info "🔧 Configuration loaded:"
if [ ! -z "$SERVER_IP" ]; then
    log_info "   - Server IP: $SERVER_IP"
else
    log_warning "   - Server IP: Not configured (optional)"
fi

if [ ! -z "$CLIENT_IP" ]; then
    log_info "   - Client IP: $CLIENT_IP"
else
    log_warning "   - Client IP: Not configured (optional)"
fi

log_info "   - SSH Username: $SSH_USERNAME"
if [ ! -z "$SSH_KEY_HOST_PATH" ]; then
    if [ -f "$SSH_KEY_HOST_PATH" ]; then
        log_info "   - SSH Authentication: Using SSH key at $SSH_KEY_HOST_PATH"
    else
        log_error "SSH key file not found at $SSH_KEY_HOST_PATH"
        exit 1
    fi
else
    log_info "   - SSH Authentication: Using password authentication"
fi

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
