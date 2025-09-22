# MCP Server ↔ FastAPI Request Flow Architecture

## 🏗️ **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER CONTAINERS                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐              ┌─────────────────────┐                  │
│  │   MCP SSE Server    │              │   FastAPI Server    │                  │
│  │   (Port 8001)       │              │   (Port 8000)       │                  │
│  │                     │              │                     │                  │
│  │  mcp_sse_server.py  │              │  main.py            │                  │
│  │  - MCP Protocol     │              │  - REST API         │                  │
│  │  - JSON-RPC Handler │              │  - Business Logic   │                  │
│  │  - Proxy Layer      │              │  - Cyperf Service   │                  │
│  └─────────────────────┘              └─────────────────────┘                  │
│           │                                      │                             │
│           │ HTTP Requests                        │                             │
│           │ (Internal Docker Network)            │                             │
│           └──────────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 **Request Flow Diagram**

```
┌─────────────────┐    JSON-RPC     ┌─────────────────┐    HTTP POST    ┌─────────────────┐
│   MCP Client    │ ──────────────→ │  MCP SSE Server │ ──────────────→ │  FastAPI Server │
│  (Goose/Claude) │                 │  :8001/mcp      │                 │  :8000/api/*    │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
         │                                   │                                   │
         │ 1. MCP Tool Call                  │ 2. Proxy to FastAPI              │ 3. Execute Business Logic
         │    {                              │    POST /api/start_server        │    CyperfService.start_server()
         │      "method": "tools/call",      │    POST /api/start_client        │    CyperfService.start_client()
         │      "params": {                  │    GET  /api/server/stats/{id}   │    CyperfService.get_server_stats()
         │        "name": "start_server",    │    GET  /api/client/stats/{id}   │    CyperfService.get_client_stats()
         │        "arguments": {...}         │    POST /api/stop_server         │    CyperfService.stop_server()
         │      }                            │    GET  /api/server/logs/{id}    │    CyperfService.read_server_logs()
         │    }                              │    GET  /api/client/logs/{id}    │    CyperfService.read_client_logs()
         │                                   │                                   │
         │                                   │                                   │
         │ 4. MCP Response                   │ 3. FastAPI Response              │
         │    {                              │    {                             │
         │      "jsonrpc": "2.0",            │      "test_id": "...",           │
         │      "result": {                  │      "status": "SUCCESS",         │
         │        "content": [...]           │      "message": "..."             │
         │      }                            │    }                             │
         │    }                              │                                   │
         │ ←───────────────────────────────── │ ←──────────────────────────────── │
```

## 🌐 **URL Mapping & Port Details**

### **External Access (from Host Machine)**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL ACCESS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  MCP Client → http://localhost:8001/mcp                                        │
│  FastAPI UI → http://localhost:8000/docs                                       │
│  FastAPI API → http://localhost:8000/api/*                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **Internal Docker Network Communication**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DOCKER INTERNAL NETWORK                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  MCP SSE Server → http://fastapi:8000/api/*                                    │
│  (Container: cyperf-ce-rest-mcp-sse-server-1)                                  │
│  (Internal Hostname: fastapi)                                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📡 **Detailed Request Proxying**

### **1. MCP Tool Call Flow**
```
MCP Client Request:
POST http://localhost:8001/mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_server",
    "arguments": {
      "server_ip": "192.168.1.100",
      "cps": false,
      "port": 5202
    }
  }
}
```

### **2. MCP Server Processing**
```
mcp_sse_server.py → _proxy_start_server():
- Extracts arguments from MCP request
- Makes HTTP POST to FastAPI
- Returns MCP-formatted response
```

### **3. FastAPI Request**
```
POST http://fastapi:8000/api/start_server
{
  "server_ip": "192.168.1.100",
  "params": {
    "cps": false,
    "port": 5202,
    "length": "1k",
    "csv_stats": true
  }
}
```

### **4. FastAPI Response**
```
{
  "test_id": "b1a741a0-9837-455e-b7f0-59cae0bb358c",
  "server_pid": 12345,
  "status": "SERVER_RUNNING",
  "message": "Cyperf server started. Use test_id for all related operations."
}
```

### **5. MCP Response to Client**
```
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Server started successfully!\nTest ID: b1a7410...\nServer IP: 192.168.1.100\n..."
      }
    ]
  }
}
```

## 🔧 **Environment Configuration**

### **Docker Compose Environment Variables**
```yaml
# docker-compose.mcp.yml
services:
  mcp-sse-server:
    environment:
      - FASTAPI_BASE_URL=http://fastapi:8000  # Internal Docker network
    ports:
      - "8001:8001"  # External access

  fastapi:
    ports:
      - "8000:8000"  # External access
```

### **Port Mapping Summary**
```
Host Machine          Docker Container         Service
────────────────────────────────────────────────────────
localhost:8001   →    mcp-sse-server:8001     MCP SSE Server
localhost:8000   →    fastapi:8000            FastAPI Server
fastapi:8000     →    fastapi:8000            Internal Docker Network
```

## 🎯 **Key Proxy Methods in mcp_sse_server.py**

```python
# Proxy methods that forward MCP calls to FastAPI
async def _proxy_start_server()     → POST /api/start_server
async def _proxy_start_client()     → POST /api/start_client  
async def _proxy_get_server_stats() → GET  /api/server/stats/{test_id}
async def _proxy_get_client_stats() → GET  /api/client/stats/{test_id}
async def _proxy_stop_server()      → POST /api/stop_server
async def _proxy_get_server_logs()  → GET  /api/server/logs/{test_id}
async def _proxy_get_client_logs()  → GET  /api/client/logs/{test_id}
```

## 🚀 **Benefits of This Architecture**

1. **Separation of Concerns**: MCP protocol handling vs business logic
2. **Dual Access**: Both MCP clients and direct HTTP clients can use the system
3. **Containerized**: Easy deployment and scaling
4. **Internal Network**: Secure communication between services
5. **Protocol Translation**: MCP JSON-RPC ↔ REST API conversion
6. **Single Source of Truth**: All business logic in FastAPI/CyperfService
