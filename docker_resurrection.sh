#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting Docker Resurrection Script..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Please edit .env file with your configuration before running again."
        exit 1
    else
        echo "❌ .env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("SERVER_IP" "CLIENT_IP" "SSH_USERNAME")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set in .env file"
        exit 1
    fi
done

echo "🔧 Configuration loaded:"
echo "   - Server IP: $SERVER_IP"
echo "   - Client IP: $CLIENT_IP"
echo "   - SSH Username: $SSH_USERNAME"

# Step 1: Stop running containers
echo "📦 Step 1: Stopping existing containers..."
if docker-compose -f docker-compose.mcp.yml down; then
    echo "✅ Containers stopped successfully."
else
    echo "❌ Failed to stop containers. Exiting."
    exit 1
fi

# Step 2: Rebuild images with latest changes
echo "🔨 Step 2: Rebuilding Docker images..."
if docker-compose -f docker-compose.mcp.yml build; then
    echo "✅ Images rebuilt successfully."
else
    echo "❌ Failed to rebuild images. Exiting."
    exit 1
fi

# Step 3: Start containers with new images
echo "🚀 Step 3: Starting containers with new images..."
if docker-compose -f docker-compose.mcp.yml up -d; then
    echo "✅ Containers started successfully in detached mode."
else
    echo "❌ Failed to start containers. Exiting."
    exit 1
fi

# Step 4: Wait for services to be ready
echo "⏳ Step 4: Waiting for services to be ready..."
sleep 15

# Step 5: Verify container status
echo "🔍 Step 5: Verifying container status..."
if docker-compose -f docker-compose.mcp.yml ps; then
    echo "✅ Container status verified."
else
    echo "❌ Failed to verify container status."
    exit 1
fi

# Step 6: Health checks
echo "🏥 Step 6: Performing health checks..."

# Check FastAPI
echo "   Checking FastAPI service..."
if curl -f -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "   ✅ FastAPI service is healthy"
else
    echo "   ⚠️  FastAPI service is not responding (may still be starting up)"
fi

# Check Flask Frontend (if it exists in docker-compose)
echo "   Checking Flask Frontend service..."
if docker-compose -f docker-compose.mcp.yml ps | grep -q flask-frontend; then
    if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
        echo "   ✅ Flask Frontend is healthy"
    else
        echo "   ⚠️  Flask Frontend is not responding (may still be starting up)"
    fi
else
    echo "   ℹ️  Flask Frontend service not found in docker-compose.mcp.yml"
fi

# Check MCP SSE Server
echo "   Checking MCP SSE Server..."
if curl -f -s http://localhost:8001/health >/dev/null 2>&1; then
    echo "   ✅ MCP SSE Server is healthy"
else
    echo "   ⚠️  MCP SSE Server is not responding (may still be starting up)"
fi

echo ""
echo "🎉 Docker Resurrection Complete! Your services are now running with the latest changes."
echo ""
echo "📊 Available Services:"
echo "-------------------"
echo "🌐 Flask Frontend: http://localhost:5000"
echo "   - Web UI for CyPerf CE testing"
echo ""
echo "🔧 FastAPI REST API: http://localhost:8000"
echo "   - API documentation: http://localhost:8000/docs"
echo "   - Health check: http://localhost:8000/health"
echo ""
echo "📡 MCP SSE Server: http://localhost:8001"
echo "   - SSE endpoint: http://localhost:8001/sse"
echo "   - Test page: http://localhost:8001/test"
echo "   - Health check: http://localhost:8001/health"
echo ""
echo "🔌 MCP Server: Available via stdio for MCP clients"
echo "-------------------"
echo ""
echo "🔧 Management Commands:"
echo "   - View logs: docker-compose -f docker-compose.mcp.yml logs -f"
echo "   - View specific service logs: docker-compose -f docker-compose.mcp.yml logs -f [service-name]"
echo "   - Stop all: docker-compose -f docker-compose.mcp.yml down"
echo "   - Restart specific service: docker-compose -f docker-compose.mcp.yml restart [service-name]"
echo "   - Check status: docker-compose -f docker-compose.mcp.yml ps"
echo ""