# Cyperf CE Controller - Streamable HTTP Implementation Testing Guide

## Overview
This guide provides complete instructions for users to set up and test the Cyperf CE Controller with Streamable HTTP support. The MCP HTTP endpoint acts as a proxy to the main FastAPI application, allowing MCP clients to interact with your Cyperf infrastructure using standard HTTP POST requests with JSON-RPC 2.0 protocol.

## Architecture
```
MCP Client → MCP HTTP Endpoint (Port 8001) → FastAPI App (Port 8000) → SSH → Remote Cyperf Servers
```

## Prerequisites
- Docker and Docker Compose installed
- SSH access to your Cyperf server and client machines
- SSH key file or password for authentication
- Network connectivity to your remote Cyperf infrastructure

## Setup Instructions

### Step 1: Clone/Download the Project
```bash
git clone <your-repo-url>
cd cyperf-ce-rest
```

### Step 2: Create Environment Configuration

Create a `.env` file in the project root directory with your SSH credentials:

#### Option A: SSH Key Authentication (Recommended)
```bash
# .env file
SERVER_IP=100.25.44.178
CLIENT_IP=34.218.246.113
SSH_USERNAME=ubuntu
SSH_KEY_PATH=/home/ubuntu/vibecode.pem
SSH_KEY_HOST_PATH=/path/to/your/actual/vibecode.pem

# Note: SSH_KEY_HOST_PATH should point to the actual key file on your host machine
# SSH_KEY_PATH is where it will be mounted inside the container
```

#### Option B: Password Authentication
```bash
# .env file
SERVER_IP=100.25.44.178
CLIENT_IP=34.218.246.113
SSH_USERNAME=ubuntu
SSH_PASSWORD=yourpassword

# Note: When using password auth, don't set SSH_KEY_PATH or SSH_KEY_HOST_PATH
```

### Step 3: Start Services
```bash
# Start all services in detached mode
docker-compose -f docker-compose.mcp.yml up -d
```

This command starts:
- **FastAPI service** on `localhost:8000` (main application with your SSH credentials)
- **MCP HTTP service** on `localhost:8001` (proxy endpoint for MCP clients using Streamable HTTP)

### Step 4: Verify Services Are Running
```bash
# Check service status
docker-compose -f docker-compose.mcp.yml ps

# Expected output should show both services as "Up"
# cyperf-ce-rest-fastapi-1     /app/entrypoint.sh fastapi    Up      0.0.0.0:8000->8000/tcp
# cyperf-ce-rest-mcp-sse-server-1 /app/entrypoint.sh mcp-sse   Up      0.0.0.0:8001->8001/tcp
```

### Step 5: Test the Endpoints

#### Test FastAPI Documentation
```bash
curl http://localhost:8000/docs
# Should return FastAPI documentation page
```

#### Test MCP HTTP Endpoint Info
```bash
curl http://localhost:8001/mcp
# Should return MCP HTTP server information and available endpoints
```

#### Test MCP HTTP Protocol
```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
# Should return MCP initialize response with server capabilities
```

#### Test Browser Interface
Open your browser and visit: `http://localhost:8001/test`
This provides a web interface to test MCP HTTP connections interactively.

## MCP Client Configuration

### For Claude Desktop
Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cyperf-ce-controller": {
      "command": "/opt/homebrew/opt/node@22/bin/npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:8001/mcp",
        "--allow-http"
      ]
    }
  }
}
```

### For Other MCP Clients (Goose, etc.)
Configure your MCP client to connect to:
```
http://localhost:8001/mcp
```

### Using mcp-remote Bridge
Most MCP clients expect stdio transport, so use the `mcp-remote` bridge:
```bash
npx -y mcp-remote http://localhost:8001/mcp --allow-http
```

## Available Tools via MCP

Once connected, your MCP client will have access to these tools:

1. **start_cyperf_server** - Start a Cyperf CE server
2. **start_cyperf_client** - Start a Cyperf CE client
3. **get_server_stats** - Get server statistics
4. **get_client_stats** - Get client statistics
5. **get_server_stats_image** - Get server stats as visual image
6. **get_client_stats_image** - Get client stats as visual image
7. **get_server_logs** - Get server log files for debugging
8. **get_client_logs** - Get client log files for debugging
9. **stop_server** - Stop and cleanup all running servers

## Testing the Complete Workflow

### Example 1: Start Server via MCP
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_server",
    "arguments": {
      "server_ip": "100.25.44.178",
      "cps": false,
      "port": 5202,
      "length": "1k",
      "csv_stats": true
    }
  }
}
```

### Example 2: Start Client via MCP
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_client",
    "arguments": {
      "test_id": "your-test-id-from-server-start",
      "server_ip": "100.25.44.178",
      "client_ip": "34.218.246.113",
      "cps": false,
      "time": 60,
      "csv_stats": true
    }
  }
}
```

### Example 3: Get Statistics
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_server_stats",
    "arguments": {
      "test_id": "your-test-id"
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Container Won't Start - Volume Mount Error
```bash
# Error: invalid spec: :/path/to/key:ro: empty section between colons
# Solution: Ensure SSH_KEY_HOST_PATH is set in .env file
echo "SSH_KEY_HOST_PATH=/path/to/your/actual/key.pem" >> .env
```

#### 2. SSH Connection Failures
```bash
# Test SSH connection manually
docker-compose -f docker-compose.mcp.yml exec fastapi /bin/bash
ssh -i $SSH_KEY_PATH $SSH_USERNAME@$SERVER_IP "echo 'Connection successful'"
```

#### 3. Port Already in Use
```bash
# Check what's using the ports
lsof -i :8000
lsof -i :8001

# Stop conflicting services or change ports in docker-compose.mcp.yml
```

#### 4. Environment Variables Not Loading
```bash
# Verify .env file exists and has correct format
cat .env

# Check environment variables in container
docker-compose -f docker-compose.mcp.yml exec fastapi env | grep -E "(SERVER_IP|CLIENT_IP|SSH_)"
```

### Viewing Logs
```bash
# View all service logs
docker-compose -f docker-compose.mcp.yml logs

# View specific service logs
docker-compose -f docker-compose.mcp.yml logs fastapi
docker-compose -f docker-compose.mcp.yml logs mcp-sse-server

# Follow logs in real-time
docker-compose -f docker-compose.mcp.yml logs -f mcp-sse-server
```

### Accessing Container Shell
```bash
# Access FastAPI container
docker-compose -f docker-compose.mcp.yml exec fastapi /bin/bash

# Access MCP HTTP container
docker-compose -f docker-compose.mcp.yml exec mcp-sse-server /bin/bash
```

## Stopping Services

### Stop All Services
```bash
docker-compose -f docker-compose.mcp.yml down
```

### Stop and Remove Volumes
```bash
docker-compose -f docker-compose.mcp.yml down -v
```

### Force Rebuild
```bash
docker-compose -f docker-compose.mcp.yml down
docker-compose -f docker-compose.mcp.yml build --no-cache
docker-compose -f docker-compose.mcp.yml up -d
```

## Security Considerations

1. **SSH Keys**: Ensure SSH key files have proper permissions (600)
2. **Network Access**: The MCP HTTP endpoint is exposed on all interfaces (0.0.0.0)
3. **Environment Variables**: Keep sensitive data in .env file, not in version control
4. **Container Security**: Services run with default Docker security settings

## Performance Notes

- **HTTP POST Requests**: Uses standard HTTP POST requests with JSON-RPC 2.0 protocol
- **Resource Usage**: Each service runs in its own container with isolated resources
- **Network Latency**: Proxy adds minimal overhead between MCP client and FastAPI
- **SSH Connections**: New SSH connection per operation (consider connection pooling for high-frequency usage)
- **Protocol Compatibility**: Works with both direct HTTP clients and MCP clients via mcp-remote bridge

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review container logs for error messages
3. Verify SSH connectivity to your remote infrastructure
4. Ensure all prerequisites are met

## What's Next

After successful setup, you can:
- Use the MCP tools through your preferred MCP client (Goose, Claude Desktop, etc.)
- Monitor operations through the web interface at `http://localhost:8001/test`
- Access detailed API documentation at `http://localhost:8000/docs`
- Connect directly via HTTP POST requests to `http://localhost:8001/mcp`
- Extend functionality by modifying the source code and rebuilding containers

---

**Note**: This Streamable HTTP implementation provides a bridge between MCP clients and your existing FastAPI Cyperf controller, enabling seamless integration with AI assistants and other MCP-compatible tools using standard HTTP POST requests with JSON-RPC 2.0 protocol.
