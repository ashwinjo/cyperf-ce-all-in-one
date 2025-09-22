# JSON-RPC Calls for MCP Endpoint

This document provides a comprehensive list of all JSON-RPC calls you can make to the `/mcp` endpoint at `http://localhost:8001/mcp`.

## Table of Contents

1. [MCP Protocol Methods](#mcp-protocol-methods)
2. [Tool Execution Methods](#tool-execution-methods)
3. [Server Management Tools](#server-management-tools)
4. [Client Management Tools](#client-management-tools)
5. [Statistics and Monitoring Tools](#statistics-and-monitoring-tools)
6. [Log Management Tools](#log-management-tools)
7. [Complete Workflow Examples](#complete-workflow-examples)

---

## MCP Protocol Methods

### 1. Initialize Connection

**Purpose**: Initialize MCP connection with the server

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-mcp-client",
      "version": "1.0.0"
    }
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "logging": {}
    },
    "serverInfo": {
      "name": "cyperf-ce-controller",
      "version": "1.0.0"
    }
  }
}
```

### 2. List Available Tools

**Purpose**: Get list of all available tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "start_cyperf_server",
        "description": "Start a Cyperf CE server with specified parameters",
        "inputSchema": { ... }
      },
      {
        "name": "start_cyperf_client",
        "description": "Start a Cyperf CE client to connect to a running server",
        "inputSchema": { ... }
      }
      // ... more tools
    ]
  }
}
```

---

## Tool Execution Methods

All tool execution calls use the `tools/call` method with different tool names and arguments.

---

## Server Management Tools

### 3. Start Cyperf Server

**Purpose**: Start a Cyperf CE server on a specified machine

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_server",
    "arguments": {
      "server_ip": "192.168.1.100",
      "cps": false,
      "port": 5202,
      "length": "1k",
      "csv_stats": true
    }
  }
}
```

**Required Parameters**:
- `server_ip` (string): IP address of the server machine

**Optional Parameters**:
- `cps` (boolean): Enable connection per second mode (default: false)
- `port` (integer): Server port (default: 5202)
- `length` (string): Packet length, e.g., "1k", "64k" (default: "1k")
- `csv_stats` (boolean): Enable CSV statistics output (default: true)

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{
      "type": "text",
      "text": "Server started successfully!\nTest ID: abc123-def456-789ghi-012jkl\nServer PID: 1234\nStatus: SERVER_RUNNING\nMessage: Cyperf server started. Use test_id for all related operations."
    }]
  }
}
```

### 4. Stop Server

**Purpose**: Stop all Cyperf servers on a specific machine

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "stop_server",
    "arguments": {
      "server_ip": "192.168.1.100"
    }
  }
}
```

**Required Parameters**:
- `server_ip` (string): IP address of the server machine where Cyperf servers should be stopped

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [{
      "type": "text",
      "text": "Server cleanup completed successfully!\nServer IP: 192.168.1.100\nCyperf server PIDs killed: true"
    }]
  }
}
```

---

## Client Management Tools

### 5. Start Cyperf Client

**Purpose**: Start a Cyperf CE client to connect to a running server

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_client",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl",
      "server_ip": "192.168.1.100",
      "client_ip": "192.168.1.200",
      "cps": false,
      "port": 5202,
      "length": "1k",
      "time": 60,
      "csv_stats": true,
      "bitrate": "100M",
      "parallel": 1,
      "reverse": false,
      "bidi": false,
      "interval": 5
    }
  }
}
```

**Required Parameters**:
- `test_id` (string): Test ID from the server start operation
- `server_ip` (string): IP address of the Cyperf server
- `client_ip` (string): IP address of the client machine where Cyperf client will run

**Optional Parameters**:
- `cps` (boolean): Enable connection per second mode. Mutually exclusive with bitrate (default: false)
- `cps_rate_limit` (string): CPS rate limit (e.g., "1k/s", "100k/s"). Only used when cps=true
- `port` (integer): Server port to connect to (default: 5202)
- `length` (string): Packet length (e.g., "1k", "64k") (default: "1k")
- `time` (integer): Test duration in seconds (default: 60)
- `csv_stats` (boolean): Enable CSV statistics output (default: true)
- `bitrate` (string): Target bitrate (e.g., "1M", "100M"). Mutually exclusive with cps
- `parallel` (integer): Number of parallel connections (default: 1)
- `reverse` (boolean): Enable reverse mode (default: false)
- `bidi` (boolean): Enable bidirectional mode (default: false)
- `interval` (integer): Statistics reporting interval in seconds

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [{
      "type": "text",
      "text": "Client started successfully!\nTest ID: abc123-def456-789ghi-012jkl\nClient PID: 5678\nStatus: CLIENT_RUNNING\nMessage: Cyperf client connected to server."
    }]
  }
}
```

### 6. Start Client with CPS Rate Limit

**Purpose**: Start a client with specific CPS rate limiting

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "start_cyperf_client",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl",
      "server_ip": "192.168.1.100",
      "client_ip": "192.168.1.200",
      "cps": true,
      "cps_rate_limit": "1k/s",
      "time": 120
    }
  }
}
```

---

## Statistics and Monitoring Tools

### 7. Get Server Statistics

**Purpose**: Get statistics from a running Cyperf server

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "get_server_stats",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl"
    }
  }
}
```

**Required Parameters**:
- `test_id` (string): Test ID of the server

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "content": [{
      "type": "text",
      "text": "Server Statistics for Test ID: abc123-def456-789ghi-012jkl\n\n{\n  \"timestamp\": \"2023-01-01T12:00:00Z\",\n  \"throughput_mbps\": 850.5,\n  \"connections\": 1000,\n  \"packets_sent\": 125000,\n  \"packets_received\": 124950\n}"
    }]
  }
}
```

### 8. Get Client Statistics

**Purpose**: Get statistics from a running Cyperf client

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "get_client_stats",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl"
    }
  }
}
```

**Required Parameters**:
- `test_id` (string): Test ID of the client

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "content": [{
      "type": "text",
      "text": "Client Statistics for Test ID: abc123-def456-789ghi-012jkl\n\n{\n  \"timestamp\": \"2023-01-01T12:00:00Z\",\n  \"throughput_mbps\": 845.2,\n  \"connections_established\": 1000,\n  \"packets_sent\": 124950,\n  \"packets_received\": 124900\n}"
    }]
  }
}
```

### 9. Get Server Statistics Image

**Purpose**: Get server statistics as a visual table image

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "get_server_stats_image",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl"
    }
  }
}
```

**Required Parameters**:
- `test_id` (string): Test ID of the server

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "content": [{
      "type": "image",
      "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "mimeType": "image/png"
    }]
  }
}
```

### 10. Get Client Statistics Image

**Purpose**: Get client statistics as a visual table image

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "get_client_stats_image",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl"
    }
  }
}
```

**Required Parameters**:
- `test_id` (string): Test ID of the client

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "content": [{
      "type": "image",
      "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "mimeType": "image/png"
    }]
  }
}
```

---

## Log Management Tools

### 11. Get Server Logs

**Purpose**: Get server log file contents for debugging

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "get_server_logs",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl"
    }
  }
}
```

**Required Parameters**:
- `test_id` (string): Test ID of the server

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "content": [{
      "type": "text",
      "text": "Server Logs for Test ID: abc123-def456-789ghi-012jkl\n\n2023-01-01 12:00:00 - Server started on port 5202\n2023-01-01 12:00:01 - Listening for connections\n2023-01-01 12:00:05 - Client connected from 192.168.1.200\n..."
    }]
  }
}
```

### 12. Get Client Logs

**Purpose**: Get client log file contents for debugging

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "get_client_logs",
    "arguments": {
      "test_id": "abc123-def456-789ghi-012jkl"
    }
  }
}
```

**Required Parameters**:
- `test_id` (string): Test ID of the client

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "content": [{
      "type": "text",
      "text": "Client Logs for Test ID: abc123-def456-789ghi-012jkl\n\n2023-01-01 12:00:05 - Connecting to server 192.168.1.100:5202\n2023-01-01 12:00:06 - Connection established\n2023-01-01 12:00:07 - Starting data transmission\n..."
    }]
  }
}
```

---

## Complete Workflow Examples

### Example 1: Basic Server-Client Test

```bash
# 1. Initialize MCP connection
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'

# 2. Start server
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "192.168.1.100"
      }
    }
  }'

# 3. Start client (use test_id from step 2)
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "abc123-def456-789ghi-012jkl",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "time": 60
      }
    }
  }'

# 4. Get server statistics
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_server_stats",
      "arguments": {
        "test_id": "abc123-def456-789ghi-012jkl"
      }
    }
  }'

# 5. Clean up
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "stop_server",
      "arguments": {
        "server_ip": "192.168.1.100"
      }
    }
  }'
```

### Example 2: High-Performance CPS Test

```bash
# Start server with CPS mode
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "192.168.1.100",
        "cps": true,
        "port": 5202
      }
    }
  }'

# Start client with specific CPS rate limit
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "abc123-def456-789ghi-012jkl",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "cps": true,
        "cps_rate_limit": "10k/s",
        "parallel": 8,
        "time": 300
      }
    }
  }'
```

### Example 3: Bitrate-Based Test

```bash
# Start server (normal mode)
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "192.168.1.100",
        "port": 5202,
        "length": "64k"
      }
    }
  }'

# Start client with bitrate limit
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "abc123-def456-789ghi-012jkl",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "bitrate": "1G",
        "parallel": 4,
        "time": 180
      }
    }
  }'
```

---

## Error Handling

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Server error description",
    "data": {
      "details": "Additional error information"
    }
  }
}
```

### Common Error Codes

- `-32700`: Parse error (Invalid JSON)
- `-32600`: Invalid Request (Invalid JSON-RPC)
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000`: Server error (Custom application errors)

---

## Notes

1. **Test ID Management**: Always save the `test_id` returned from `start_cyperf_server` - you'll need it for all subsequent operations.

2. **IP Address Requirements**: Ensure the specified `server_ip` and `client_ip` addresses are reachable and have Cyperf CE installed.

3. **SSH Access**: The system requires SSH access to both server and client machines with appropriate credentials configured.

4. **Mutual Exclusivity**: The `cps` and `bitrate` parameters are mutually exclusive - use one or the other, not both.

5. **File Paths**: Log files and CSV statistics are saved as:
   - Server: `{test_id}_server.log`, `{test_id}_server.csv`
   - Client: `{test_id}_client.log`, `{test_id}_client.csv`

6. **Port Availability**: Ensure the specified ports (default 5202) are available on the target machines.

7. **Test Duration**: For long-running tests, consider using appropriate `time` values and monitoring via statistics calls.
