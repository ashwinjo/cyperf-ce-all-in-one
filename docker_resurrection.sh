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
required_vars=("SERVER_IP" "CLIENT_IP" "SSH_USERNAME" "FASTAPI_HOST")
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
echo "   - FastAPI Host: $FASTAPI_HOST"

# Step 0: Check and install docker-compose if needed
echo "🔍 Checking for docker-compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "   ⚠️  docker-compose not found. Installing..."
    if command -v apt &> /dev/null; then
        sudo apt update
        sudo apt install -y docker-compose
    elif command -v yum &> /dev/null; then
        sudo yum install -y docker-compose
    else
        echo "   ❌ Could not install docker-compose. Please install it manually."
        exit 1
    fi
    echo "   ✅ docker-compose installed successfully"
else
    echo "   ✅ docker-compose is already installed"
fi

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
if docker-compose -f docker-compose.mcp.yml -f docker-compose.n8n.yml build --pull; then
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

# Check n8n Server and import workflow
echo "   Checking n8n service..."
if curl -f -s http://localhost:5678 >/dev/null 2>&1; then
    echo "   ✅ n8n service is healthy"
    sleep 8  # Wait a bit more for n8n to fully initialize

    # Check if workflow file exists in the container
    if docker exec -i n8n test -f /home/node/.n8n/workflows/CCE_Chat.json; then
        echo "   📄 Found workflow file in container"
    else
        echo "   ⚠️  Workflow file not found in container, copying from host..."
        # Copy the workflow file into the container
        docker cp CCE_Chat.json n8n:/home/node/.n8n/workflows/
    fi

    echo "   📥 Importing workflow 'CCE_Chat.json'..."
    
    docker exec -i n8n sh -c "n8n import:workflow --input=/home/node/.n8n/workflows/CCE_Chat.json --no-color"
    echo "   ✅ Workflow import attempt completed."

    # Add a small delay after import
    sleep 5

    echo "   🔄 Listing workflows to get ID..."
    WORKFLOW_ID=$(docker exec -i n8n sh -c "n8n list:workflow --no-color" | grep -w 'CCE_Chat' | cut -d'|' -f3 | awk '{print $1}')

    if [ -n "$WORKFLOW_ID" ]; then
        echo "   ✅ Found workflow ID: $WORKFLOW_ID"
        echo "   🚀 Activating workflow..."
        
        # Stop n8n, update workflow, and restart
        echo "   🛑 Stopping n8n..."
        docker stop n8n >/dev/null 2>&1
        sleep 5

        echo "   📋 Executing command: n8n update:workflow --active=true --id=$WORKFLOW_ID --no-color"
        docker start n8n >/dev/null 2>&1
        sleep 3
        docker exec -i n8n sh -c "n8n update:workflow --active=true --id=$WORKFLOW_ID --no-color"
        
        echo "   🔄 Starting n8n..."
        docker start n8n >/dev/null 2>&1
        sleep 10  # Give n8n time to fully start
        
        # # Verify activation status
        # echo "   🔍 Verifying workflow activation..."
        # ACTIVE_STATUS=$(docker exec -i n8n sh -c "n8n list:workflow --no-color" | grep -w 'CCE_Chat' | grep -i 'active')
        # if [ -n "$ACTIVE_STATUS" ]; then
        #     echo "   ✅ Workflow 'CCE_Chat' activated successfully."
        # else
        #     echo "   ⚠️  Workflow may not be active. Please check n8n dashboard."
        # fi
    else
        echo "   ❌ Workflow 'CCE_Chat' not found after import. Check your JSON or container logs."
        # Display available workflows for debugging
        echo "   📋 Available workflows:"
        docker exec -i n8n sh -c "n8n list:workflow --no-color"
    fi

    echo "   🔄 Restarting n8n to ensure full refresh..."
    docker restart n8n >/dev/null 2>&1
    sleep 10  # Give more time for restart
    echo "   ✅ n8n restarted successfully"

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
echo "   - SSE endpoint: http://localhost:8001/mcp"
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