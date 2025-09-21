#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting Docker Resurrection Script..."

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

# Step 4: Verify container status
echo "🔍 Step 4: Verifying container status..."
if docker-compose -f docker-compose.mcp.yml ps; then
    echo "✅ Container status verified."
else
    echo "❌ Failed to verify container status."
    exit 1
fi

echo ""
echo "🎉 Docker Resurrection Complete! Your services are now running with the latest changes."
echo ""
echo "Available Services:"
echo "-------------------"
echo "FastAPI REST API: http://localhost:8000"
echo "  - API documentation: http://localhost:8000/docs"
echo "MCP SSE Server: http://localhost:8001"
echo "  - SSE endpoint: http://localhost:8001/sse"
echo "  - Test page: http://localhost:8001/test"
echo "MCP Server: Available via stdio for MCP clients"
echo "-------------------"
