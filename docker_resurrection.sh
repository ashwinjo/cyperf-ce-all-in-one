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

# Set default SSH_PASSWORD if not set
if [ -z "${SSH_PASSWORD}" ]; then
    export SSH_PASSWORD=""
fi

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

# Step 1: Create Docker network if it doesn't exist
echo "🌐 Step 1: Setting up Docker network..."
if ! docker network inspect cyperf-network >/dev/null 2>&1; then
    echo "   Creating cyperf-network..."
    if docker network create cyperf-network; then
        echo "   ✅ Network created successfully"
    else
        echo "   ❌ Failed to create network"
        exit 1
    fi
else
    echo "   ✅ Network already exists"
fi

# Step 2: Stop running containers
echo "📦 Step 2: Stopping existing containers..."
if docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml down; then
    echo "✅ Containers stopped successfully."
else
    echo "❌ Failed to stop containers. Exiting."
    exit 1
fi

# Step 3: Rebuild images with latest changes
echo "🔨 Step 3: Rebuilding Docker images..."
if docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml build; then
    echo "✅ Images rebuilt successfully."
else
    echo "❌ Failed to rebuild images. Exiting."
    exit 1
fi

# Step 4: Start containers with new images
echo "🚀 Step 4: Starting containers with new images..."
if docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml up -d; then
    echo "✅ Containers started successfully in detached mode."
else
    echo "❌ Failed to start containers. Exiting."
    exit 1
fi

# Step 5: Wait for services to be ready
echo "⏳ Step 5: Waiting for services to be ready..."
sleep 15

# Step 6: Verify container status
echo "🔍 Step 6: Verifying container status..."
if docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml ps; then
    echo "✅ Container status verified."
else
    echo "❌ Failed to verify container status."
    exit 1
fi

# Step 7: Health checks
echo "🏥 Step 7: Performing health checks..."

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

# Check n8n Server and copy workflow
echo "   Checking n8n service..."
if curl -f -s http://localhost:5678 >/dev/null 2>&1; then
    echo "   ✅ n8n service is healthy"
    # Wait a bit more for n8n to fully initialize
    sleep 5
    echo "   📄 Copying workflow file to n8n..."
    if docker cp CCE_Chat.json n8n:/home/node/.n8n/workflows/CCE_Chat.json; then
        echo "   ✅ Workflow file copied successfully"
        # Set proper permissions inside container
        docker exec n8n chown node:node /home/node/.n8n/workflows/CCE_Chat.json
    else
        echo "   ⚠️  Failed to copy workflow file"
    fi
else
    echo "   ⚠️  n8n service is not responding (may still be starting up)"
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
echo "🤖 n8n Server: http://localhost:5678"
echo "   - Login credentials:"
echo "   - Username: user"
echo "   - Password: password"
echo "   - Workflow imported: CCE_Chat.json"
echo ""
echo "🔌 MCP Server: Available via stdio for MCP clients"
echo "-------------------"
echo ""
echo "🔧 Management Commands:"
echo "   - View logs: docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml logs -f"
echo "   - View specific service logs: docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml logs -f [service-name]"
echo "   - Stop all: docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml down"
echo "   - Restart specific service: docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml restart [service-name]"
echo "   - Check status: docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml ps"
echo ""