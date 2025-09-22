# Server and Client IP Addresses as Request Parameters

## Overview

This document outlines the implementation changes that convert server and client IP addresses from environment variables to request parameters. This change provides greater flexibility for managing multiple Cyperf infrastructures and enables dynamic IP configuration without container restarts.

## Motivation

Previously, `SERVER_IP` and `CLIENT_IP` were hardcoded as environment variables, limiting the application to a single Cyperf infrastructure. The new implementation allows:

- **Dynamic IP Configuration**: Specify different server/client IPs per request
- **Multi-Environment Support**: Same deployment can manage multiple Cyperf infrastructures  
- **Flexible MCP Integration**: MCP clients can specify infrastructure details per operation
- **Backward Compatibility**: Environment variables still work as fallbacks

## Implementation Changes

### 1. Updated Data Models (`app/api/models.py`)

#### Before:
```python
class ServerRequest(BaseModel):
    params: ServerParams

class ClientRequest(BaseModel):
    test_id: str
    server_ip: str  # Only for connection target
    params: ClientParams
```

#### After:
```python
class ServerRequest(BaseModel):
    server_ip: str  # NEW: IP where server will run
    params: ServerParams

class ClientRequest(BaseModel):
    test_id: str
    server_ip: str     # IP to connect to
    client_ip: str     # NEW: IP where client will run
    params: ClientParams
```

### 2. Updated Service Layer (`app/services/cyperf_service.py`)

All service methods now accept optional IP parameters with fallback to environment variables:

```python
def start_server(self, test_id: str, params: Dict[str, Any], server_ip: str = None) -> Dict[str, Any]:
    # Uses server_ip parameter or falls back to settings.SERVER_IP
    ssh = self._connect_ssh(server_ip or settings.SERVER_IP)

def start_client(self, test_id: str, server_ip: str, params: Dict[str, Any], client_ip: str = None) -> Dict[str, Any]:
    # Uses client_ip parameter or falls back to settings.CLIENT_IP
    ssh = self._connect_ssh(client_ip or settings.CLIENT_IP)

def get_server_stats(self, test_id: str, server_ip: str = None):
    # Server stats retrieved from specified IP
    
def get_client_stats(self, test_id: str, client_ip: str = None):
    # Client stats retrieved from specified IP
    
def stop_server(self, server_ip: str = None) -> Dict[str, Any]:
    # Stop servers on specified IP
```

### 3. Updated API Routes (`app/api/routes.py`)

#### POST Endpoints (Request Body Parameters):
```python
@router.post("/start_server")
async def start_server(request: ServerRequest):
    result = cyperf_service.start_server(test_id, request.params.dict(), request.server_ip)

@router.post("/start_client") 
async def start_client(request: ClientRequest):
    result = cyperf_service.start_client(
        request.test_id,
        request.server_ip,
        request.params.dict(),
        request.client_ip
    )
```

#### GET/DELETE Endpoints (Query Parameters):
```python
@router.get("/server/stats/{test_id}")
async def get_server_stats(test_id: str, server_ip: str = None):
    stats = cyperf_service.get_server_stats(test_id, server_ip)

@router.get("/client/stats/{test_id}")
async def get_client_stats(test_id: str, client_ip: str = None):
    stats = cyperf_service.get_client_stats(test_id, client_ip)

@router.delete("/server/cleanup")
async def stop_server(server_ip: str = None):
    result = cyperf_service.stop_server(server_ip)
```

### 4. Updated MCP Tools (`app/api/mcp_helpers.py`)

All MCP tool schemas now include IP address parameters:

#### start_cyperf_server:
```json
{
  "name": "start_cyperf_server",
  "inputSchema": {
    "properties": {
      "server_ip": {
        "type": "string", 
        "description": "IP address of the machine where server will run"
      },
      "cps": {"type": "boolean", "default": false},
      "port": {"type": "integer", "default": 5202},
      "length": {"type": "string", "default": "1k"},
      "csv_stats": {"type": "boolean", "default": true}
    },
    "required": ["server_ip"]
  }
}
```

#### start_cyperf_client:
```json
{
  "name": "start_cyperf_client",
  "inputSchema": {
    "properties": {
      "test_id": {"type": "string"},
      "server_ip": {"type": "string", "description": "IP address of the Cyperf server to connect to"},
      "client_ip": {"type": "string", "description": "IP address of the machine where client will run"},
      "cps": {"type": "string"},
      "port": {"type": "integer", "default": 5202},
      "time": {"type": "integer", "default": 60}
    },
    "required": ["test_id", "server_ip", "client_ip"]
  }
}
```

#### Statistics and Management Tools:
```json
{
  "name": "get_server_stats",
  "inputSchema": {
    "properties": {
      "test_id": {"type": "string"},
      "server_ip": {"type": "string", "description": "IP address of the server machine (optional if set in env)"}
    },
    "required": ["test_id"]
  }
}

{
  "name": "get_client_stats", 
  "inputSchema": {
    "properties": {
      "test_id": {"type": "string"},
      "client_ip": {"type": "string", "description": "IP address of the client machine (optional if set in env)"}
    },
    "required": ["test_id"]
  }
}

{
  "name": "get_server_logs",
  "inputSchema": {
    "properties": {
      "test_id": {"type": "string", "description": "Test ID of the server"}
    },
    "required": ["test_id"]
  }
}

{
  "name": "get_client_logs",
  "inputSchema": {
    "properties": {
      "test_id": {"type": "string", "description": "Test ID of the client"}
    },
    "required": ["test_id"]
  }
}

{
  "name": "stop_server",
  "inputSchema": {
    "properties": {
      "server_ip": {"type": "string", "description": "IP address of the server machine (optional if set in env)"}
    }
  }
}
```

### 5. Updated Configuration (`app/core/config.py`)

Environment variables are now optional with fallback behavior:

#### Before:
```python
class Settings(BaseSettings):
    SERVER_IP: str          # Required
    CLIENT_IP: str          # Required
    SSH_USERNAME: str
    SSH_KEY_PATH: str
    SSH_PASSWORD: Optional[str] = None
```

#### After:
```python
class Settings(BaseSettings):
    SERVER_IP: Optional[str] = None    # Optional fallback
    CLIENT_IP: Optional[str] = None    # Optional fallback
    SSH_USERNAME: str                  # Still required
    SSH_KEY_PATH: str                  # Still required
    SSH_PASSWORD: Optional[str] = None
```

## API Usage Examples

### 1. Starting a Server

#### Request:
```bash
curl -X POST http://localhost:8000/api/start_server \
  -H "Content-Type: application/json" \
  -d '{
    "server_ip": "192.168.1.100",
    "params": {
      "cps": false,
      "port": 5202,
      "length": "1k",
      "csv_stats": true
    }
  }'
```

#### Response:
```json
{
  "test_id": "550e8400-e29b-41d4-a716-446655440000",
  "server_pid": 12345,
  "status": "SERVER_RUNNING",
  "message": "Cyperf server started. Use test_id for all related operations."
}
```

### 2. Starting a Client

#### Request:
```bash
curl -X POST http://localhost:8000/api/start_client \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "550e8400-e29b-41d4-a716-446655440000",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101", 
    "params": {
      "cps": "50",
      "port": 5202,
      "time": 120,
      "parallel": 2
    }
  }'
```

#### Response:
```json
{
  "test_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_pid": 12346,
  "status": "CLIENT_RUNNING",
  "message": "Cyperf client started and linked to server."
}
```

### 3. Getting Statistics with Specific IPs

#### Server Stats:
```bash
curl "http://localhost:8000/api/server/stats/550e8400-e29b-41d4-a716-446655440000?server_ip=192.168.1.100"
```

#### Client Stats:
```bash
curl "http://localhost:8000/api/client/stats/550e8400-e29b-41d4-a716-446655440000?client_ip=192.168.1.101"
```

### 4. Stopping Servers

#### With Specific IP:
```bash
curl -X DELETE "http://localhost:8000/api/server/cleanup?server_ip=192.168.1.100"
```

#### Using Environment Variable (Fallback):
```bash
curl -X DELETE "http://localhost:8000/api/server/cleanup"
```

## MCP Usage Examples

### 1. Start Server via MCP

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_server",
    "arguments": {
      "server_ip": "192.168.1.100",
      "cps": false,
      "port": 5202,
      "length": "1k"
    }
  }
}
```

### 2. Start Client via MCP

```json
{
  "jsonrpc": "2.0", 
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_client",
    "arguments": {
      "test_id": "550e8400-e29b-41d4-a716-446655440000",
      "server_ip": "192.168.1.100",
      "client_ip": "192.168.1.101",
      "cps": "100",
      "time": 300
    }
  }
}
```

### 3. Get Statistics via MCP

```json
{
  "jsonrpc": "2.0",
  "id": 3, 
  "method": "tools/call",
  "params": {
    "name": "get_server_stats",
    "arguments": {
      "test_id": "550e8400-e29b-41d4-a716-446655440000",
      "server_ip": "192.168.1.100"
    }
  }
}
```

### 4. Get Server Logs via MCP

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_server_logs",
    "arguments": {
      "test_id": "a933502b-f30d-4d13-8486-ab5e380d9a4e"
    }
  }
}
```

#### Response:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Server Logs for Test ID: a933502b-f30d-4d13-8486-ab5e380d9a4e\n\nCyperf server started on 192.168.1.100:5202\nListening for connections...\nConnection established from 192.168.1.101\nTransferring data...\nTest completed successfully\n"
      }
    ]
  }
}
```

### 5. Get Client Logs via MCP

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_client_logs",
    "arguments": {
      "test_id": "a933502b-f30d-4d13-8486-ab5e380d9a4e"
    }
  }
}
```

#### Response:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Client Logs for Test ID: a933502b-f30d-4d13-8486-ab5e380d9a4e\n\nConnecting to server 192.168.1.100:5202\nConnection established\nStarting data transfer\nTransfer rate: 95.2 Mbps\nTest completed in 60 seconds\n"
      }
    ]
  }
}
```

## Deployment Configuration

### Environment Variables (Optional Fallbacks)

Create a `.env` file with fallback values:

```bash
# Optional fallback IPs
SERVER_IP=192.168.1.100
CLIENT_IP=192.168.1.101

# Required SSH configuration
SSH_USERNAME=ubuntu
SSH_KEY_PATH=/home/ubuntu/vibecode.pem
SSH_KEY_HOST_PATH=/path/to/your/vibecode.pem

# Alternative: Password authentication
# SSH_PASSWORD=yourpassword
```

### Docker Compose Configuration

The `docker-compose.mcp.yml` can now work with or without IP environment variables:

```yaml
version: '3.8'

services:
  fastapi:
    build:
      context: .
      dockerfile: Dockerfile.mcp
    ports:
      - "8000:8000"
    environment:
      # These are now optional
      - SERVER_IP=${SERVER_IP:-}
      - CLIENT_IP=${CLIENT_IP:-}
      # These are still required
      - SSH_USERNAME=${SSH_USERNAME}
      - SSH_KEY_PATH=${SSH_KEY_PATH}
      - SSH_PASSWORD=${SSH_PASSWORD}
    volumes:
      - ${SSH_KEY_HOST_PATH}:${SSH_KEY_PATH}:ro
    command: ["fastapi"]

  mcp-sse-server:
    build:
      context: .
      dockerfile: Dockerfile.mcp
    ports:
      - "8001:8001"
    environment:
      - FASTAPI_BASE_URL=http://fastapi:8000
    command: ["mcp-sse"]
    depends_on:
      - fastapi
```

## Migration Guide

### For Existing Users

1. **No Immediate Changes Required**: Existing environment variable configurations continue to work
2. **Gradual Migration**: Start using IP parameters in requests while keeping environment variables as fallbacks
3. **Full Migration**: Remove IP environment variables once all requests include IP parameters

### API Client Updates

#### Before (Environment Variables Only):
```python
# Client only needed to specify connection target
response = requests.post("/api/start_client", json={
    "test_id": test_id,
    "server_ip": "192.168.1.100",  # Where to connect
    "params": {"cps": "50"}
})
```

#### After (Full Control):
```python
# Client specifies both connection target and execution location
response = requests.post("/api/start_client", json={
    "test_id": test_id,
    "server_ip": "192.168.1.100",   # Where to connect
    "client_ip": "192.168.1.101",   # Where to run client
    "params": {"cps": "50"}
})
```

## Benefits

### 1. **Operational Flexibility**
- Deploy once, manage multiple Cyperf infrastructures
- No container restarts needed to change target IPs
- Support for complex network topologies

### 2. **Development & Testing**
- Easy switching between development, staging, and production environments
- Support for parallel testing on different infrastructure sets
- Simplified CI/CD pipeline configuration

### 3. **MCP Integration**
- MCP clients can specify infrastructure details per operation
- Support for multi-tenant MCP deployments
- Enhanced automation capabilities

### 4. **Backward Compatibility**
- Existing deployments continue to work without changes
- Gradual migration path available
- Environment variables serve as sensible defaults

## Error Handling

### Missing Required IPs

When IP addresses are not provided in requests and not set in environment variables:

```json
{
  "detail": "server_ip is required when SERVER_IP environment variable is not set"
}
```

### Invalid IP Addresses

SSH connection failures due to invalid IPs result in appropriate error messages:

```json
{
  "detail": "Failed to connect to 192.168.1.999: Connection timeout"
}
```

## Security Considerations

1. **IP Validation**: Consider adding IP address validation to prevent connection attempts to invalid ranges
2. **Access Control**: Implement IP allowlisting if restricting which IPs can be targeted
3. **Audit Logging**: Log all IP addresses used in operations for security auditing
4. **Network Isolation**: Ensure proper network segmentation between management and test traffic

## Future Enhancements

1. **IP Pools**: Support for IP address pools with automatic selection
2. **Load Balancing**: Distribute operations across multiple IPs automatically  
3. **Health Checking**: Verify IP accessibility before attempting operations
4. **IP Discovery**: Automatic discovery of available Cyperf infrastructure
5. **Geographic Distribution**: Support for region-aware IP selection

---

This implementation provides a solid foundation for flexible, scalable Cyperf infrastructure management while maintaining backward compatibility and ease of use.
