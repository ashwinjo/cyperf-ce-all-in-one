# REST API Documentation
## CyPerf CE Controller REST API

**Version:** 1.0.0  
**Base URL:** `http://your-server-address:port`  
**API Specification:** OpenAPI 3.1.0

This REST API provides programmatic control over Keysight CyPerf CE (Community Edition) Client and Server performance tests.

---

## Table of Contents

1. [Server Operations](#server-operations)
   - [Start Server](#1-start-server)
   - [Stop Server](#2-stop-server)
   - [Get Server Statistics](#3-get-server-statistics)
   - [Get Server Statistics Image](#4-get-server-statistics-image)
   - [Get Server Logs](#5-get-server-logs)

2. [Client Operations](#client-operations)
   - [Start Client](#6-start-client)
   - [Get Client Statistics](#7-get-client-statistics)
   - [Get Client Statistics Image](#8-get-client-statistics-image)
   - [Get Client Logs](#9-get-client-logs)

3. [MCP Operations](#mcp-operations)
   - [MCP Endpoint](#10-mcp-endpoint)

4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

---

## Server Operations

### 1. Start Server

Start a CyPerf server instance on the specified IP address.

**Endpoint:** `POST /api/start_server`  
**Content-Type:** `application/json`

#### Request Body (ServerRequest)

```json
{
  "server_ip": "192.168.1.100",
  "params": {
    "cps": false,
    "port": 5202,
    "length": "1k",
    "csv_stats": true,
    "bidi": false,
    "reverse": false,
    "bind": ""
  }
}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `server_ip` | string | ✅ Yes | - | IP address of the server |
| `params.cps` | boolean | No | false | Enable CPS (Connections Per Second) mode |
| `params.port` | integer | No | 5202 | Server listening port |
| `params.length` | string | No | "1k" | Buffer length for tests |
| `params.csv_stats` | boolean | No | true | Export statistics to CSV |
| `params.bidi` | boolean | No | false | Enable bidirectional traffic |
| `params.reverse` | boolean | No | false | Enable reverse mode |
| `params.bind` | string | No | "" | Bind to specific IP address |

#### Response (200 OK)

```json
{
  "test_id": "test_20231028_123456",
  "status": "success",
  "message": "Server started successfully",
  "server_pid": 12345,
  "client_pid": null
}
```

#### cURL Example

```bash
curl -X POST "http://localhost:8000/api/start_server" \
  -H "Content-Type: application/json" \
  -d '{
    "server_ip": "192.168.1.100",
    "params": {
      "port": 5202,
      "csv_stats": true
    }
  }'
```

#### Python Example

```python
import requests

url = "http://localhost:8000/api/start_server"
payload = {
    "server_ip": "192.168.1.100",
    "params": {
        "port": 5202,
        "csv_stats": True
    }
}

response = requests.post(url, json=payload)
print(response.json())
```

---

### 2. Stop Server

Stop and cleanup all CyPerf server processes on the specified server IP.

**Endpoint:** `POST /api/stop_server`  
**Content-Type:** `application/json`

#### Request Body (StopServerRequest)

```json
{
  "server_ip": "192.168.1.100"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `server_ip` | string | ✅ Yes | IP address of the server to stop |

#### Response (200 OK)

```json
{
  "status": "success",
  "message": "Server stopped successfully",
  "server_ip": "192.168.1.100",
  "cleanup_results": {
    "processes_killed": 2,
    "files_cleaned": 5
  }
}
```

#### cURL Example

```bash
curl -X POST "http://localhost:8000/api/stop_server" \
  -H "Content-Type: application/json" \
  -d '{
    "server_ip": "192.168.1.100"
  }'
```

---

### 3. Get Server Statistics

Retrieve real-time statistics from a running server test.

**Endpoint:** `GET /api/server/stats/{test_id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string | ✅ Yes | Unique test identifier |

#### Response (200 OK)

```json
{
  "test_id": "test_20231028_123456",
  "statistics": {
    "timestamp": "2023-10-28T12:34:56Z",
    "throughput_mbps": 9850,
    "connections": 6500,
    "packets_sent": 1234567,
    "packets_received": 1234500,
    "errors": 0
  }
}
```

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/server/stats/test_20231028_123456"
```

#### Python Example

```python
import requests

test_id = "test_20231028_123456"
url = f"http://localhost:8000/api/server/stats/{test_id}"

response = requests.get(url)
stats = response.json()
print(f"Throughput: {stats['statistics']['throughput_mbps']} Mbps")
```

---

### 4. Get Server Statistics Image

Retrieve a graphical representation of server statistics.

**Endpoint:** `GET /api/server/stats_image/{test_id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string | ✅ Yes | Unique test identifier |

#### Response (200 OK)

Returns an image file (PNG/JPEG) with visualization of server statistics.

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/server/stats_image/test_20231028_123456" \
  --output server_stats.png
```

---

### 5. Get Server Logs

Get server log file contents for debugging and monitoring.

**Endpoint:** `GET /api/server/logs/{test_id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string | ✅ Yes | Unique test identifier |

#### Response (200 OK)

```json
{
  "test_id": "test_20231028_123456",
  "log_file": "test_20231028_123456_server.log",
  "logs": [
    "2023-10-28 12:34:56 - Server started on port 5202",
    "2023-10-28 12:35:00 - Client connected from 192.168.1.101",
    "2023-10-28 12:35:05 - Throughput: 9.85 Gbps"
  ]
}
```

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/server/logs/test_20231028_123456"
```

---

## Client Operations

### 6. Start Client

Start a CyPerf client instance to connect to a server and begin performance testing.

**Endpoint:** `POST /api/start_client`  
**Content-Type:** `application/json`

#### Request Body (ClientRequest)

```json
{
  "test_id": "test_20231028_123456",
  "server_ip": "192.168.1.100",
  "client_ip": "192.168.1.101",
  "params": {
    "cps": false,
    "cps_rate_limit": null,
    "port": 5202,
    "length": "1k",
    "time": 60,
    "csv_stats": true,
    "bitrate": "10G",
    "parallel": 6500,
    "reverse": false,
    "bidi": false,
    "interval": 5,
    "bind": ""
  }
}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `test_id` | string | ✅ Yes | - | Unique test identifier (must match server) |
| `server_ip` | string | ✅ Yes | - | IP address of the server to connect to |
| `client_ip` | string | ✅ Yes | - | IP address of the client |
| `params.cps` | boolean | No | false | Enable CPS (Connections Per Second) mode |
| `params.cps_rate_limit` | string | No | null | Rate limit for CPS mode (e.g., "10000") |
| `params.port` | integer | No | 5202 | Server port to connect to |
| `params.length` | string | No | "1k" | Buffer length for tests |
| `params.time` | integer | No | 60 | Test duration in seconds |
| `params.csv_stats` | boolean | No | true | Export statistics to CSV |
| `params.bitrate` | string | No | null | Target bitrate (e.g., "10G", "1000M") |
| `params.parallel` | integer | No | 1 | Number of parallel connections |
| `params.reverse` | boolean | No | false | Enable reverse mode (server sends) |
| `params.bidi` | boolean | No | false | Enable bidirectional traffic |
| `params.interval` | integer | No | null | Statistics reporting interval in seconds |
| `params.bind` | string | No | "" | Bind to specific IP address |

#### Response (200 OK)

```json
{
  "test_id": "test_20231028_123456",
  "status": "success",
  "message": "Client started successfully",
  "server_pid": null,
  "client_pid": 12346
}
```

#### cURL Example - High Throughput Test

```bash
curl -X POST "http://localhost:8000/api/start_client" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "test_20231028_123456",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
      "port": 5202,
      "time": 30,
      "bitrate": "10G",
      "parallel": 6500,
      "interval": 5
    }
  }'
```

#### cURL Example - CPS Test

```bash
curl -X POST "http://localhost:8000/api/start_client" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "test_cps_20231028_123456",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
      "cps": true,
      "cps_rate_limit": "10000",
      "parallel": 6400,
      "time": 30
    }
  }'
```

#### Python Example

```python
import requests

url = "http://localhost:8000/api/start_client"
payload = {
    "test_id": "test_20231028_123456",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
        "port": 5202,
        "time": 60,
        "bitrate": "10G",
        "parallel": 6500,
        "interval": 5,
        "csv_stats": True
    }
}

response = requests.post(url, json=payload)
result = response.json()
print(f"Test ID: {result['test_id']}")
print(f"Client PID: {result['client_pid']}")
```

---

### 7. Get Client Statistics

Retrieve real-time statistics from a running client test.

**Endpoint:** `GET /api/client/stats/{test_id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string | ✅ Yes | Unique test identifier |

#### Response (200 OK)

```json
{
  "test_id": "test_20231028_123456",
  "statistics": {
    "timestamp": "2023-10-28T12:34:56Z",
    "throughput_mbps": 9850,
    "active_connections": 6500,
    "total_bytes_sent": 12345678900,
    "cps": 10000,
    "retransmits": 15,
    "cpu_utilization": 85.5
  }
}
```

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/client/stats/test_20231028_123456"
```

---

### 8. Get Client Statistics Image

Retrieve a graphical representation of client statistics.

**Endpoint:** `GET /api/client/stats_image/{test_id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string | ✅ Yes | Unique test identifier |

#### Response (200 OK)

Returns an image file (PNG/JPEG) with visualization of client statistics.

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/client/stats_image/test_20231028_123456" \
  --output client_stats.png
```

---

### 9. Get Client Logs

Get client log file contents for debugging and monitoring.

**Endpoint:** `GET /api/client/logs/{test_id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_id` | string | ✅ Yes | Unique test identifier |

#### Response (200 OK)

```json
{
  "test_id": "test_20231028_123456",
  "log_file": "test_20231028_123456_client.log",
  "logs": [
    "2023-10-28 12:35:00 - Connecting to server 192.168.1.100:5202",
    "2023-10-28 12:35:01 - Connection established",
    "2023-10-28 12:35:05 - Throughput: 9.85 Gbps, 6500 parallel connections"
  ]
}
```

#### cURL Example

```bash
curl -X GET "http://localhost:8000/api/client/logs/test_20231028_123456"
```

---

## MCP Operations

### 10. MCP Endpoint

MCP (Model Context Protocol) HTTP endpoint for streamable HTTP communication. This endpoint is used for AI agent integration.

**Endpoint:** `POST /api/mcp`  
**Content-Type:** `application/json`

#### Response (200 OK)

Returns MCP protocol responses for AI agent integration.

#### cURL Example

```bash
curl -X POST "http://localhost:8000/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Data Models

### TestResponse

Standard response for test operations.

```json
{
  "test_id": "string",
  "status": "string",
  "message": "string",
  "server_pid": "integer | null",
  "client_pid": "integer | null"
}
```

### ServerParams

```json
{
  "cps": "boolean (default: false)",
  "port": "integer (default: 5202)",
  "length": "string (default: '1k')",
  "csv_stats": "boolean (default: true)",
  "bidi": "boolean (default: false)",
  "reverse": "boolean (default: false)",
  "bind": "string (default: '')"
}
```

### ClientParams

```json
{
  "cps": "boolean (default: false)",
  "cps_rate_limit": "string | null",
  "port": "integer (default: 5202)",
  "length": "string (default: '1k')",
  "time": "integer (default: 60)",
  "csv_stats": "boolean (default: true)",
  "bitrate": "string | null",
  "parallel": "integer (default: 1)",
  "reverse": "boolean (default: false)",
  "bidi": "boolean (default: false)",
  "interval": "integer | null",
  "bind": "string (default: '')"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 422 | Validation Error - Invalid request parameters |
| 500 | Internal Server Error |

### Error Response Format (422)

```json
{
  "detail": [
    {
      "loc": ["body", "server_ip"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Examples

### Example 1: Complete Throughput Test Workflow

```bash
# Step 1: Start the server
curl -X POST "http://localhost:8000/api/start_server" \
  -H "Content-Type: application/json" \
  -d '{
    "server_ip": "192.168.1.100",
    "params": {"port": 5202}
  }'

# Response: {"test_id": "test_20231028_123456", "status": "success", ...}

# Step 2: Start the client (use same test_id)
curl -X POST "http://localhost:8000/api/start_client" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "test_20231028_123456",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
      "time": 30,
      "bitrate": "10G",
      "parallel": 6500
    }
  }'

# Step 3: Monitor statistics
curl -X GET "http://localhost:8000/api/client/stats/test_20231028_123456"

# Step 4: Get logs after test completes
curl -X GET "http://localhost:8000/api/client/logs/test_20231028_123456"
curl -X GET "http://localhost:8000/api/server/logs/test_20231028_123456"

# Step 5: Stop the server
curl -X POST "http://localhost:8000/api/stop_server" \
  -H "Content-Type: application/json" \
  -d '{"server_ip": "192.168.1.100"}'
```

### Example 2: Python Script for Automated Testing

```python
import requests
import time
import json

BASE_URL = "http://localhost:8000"
SERVER_IP = "192.168.1.100"
CLIENT_IP = "192.168.1.101"
TEST_ID = f"test_{int(time.time())}"

def start_server():
    url = f"{BASE_URL}/api/start_server"
    payload = {
        "server_ip": SERVER_IP,
        "params": {
            "port": 5202,
            "csv_stats": True
        }
    }
    response = requests.post(url, json=payload)
    return response.json()

def start_client():
    url = f"{BASE_URL}/api/start_client"
    payload = {
        "test_id": TEST_ID,
        "server_ip": SERVER_IP,
        "client_ip": CLIENT_IP,
        "params": {
            "time": 30,
            "bitrate": "10G",
            "parallel": 6500,
            "interval": 5
        }
    }
    response = requests.post(url, json=payload)
    return response.json()

def get_stats():
    url = f"{BASE_URL}/api/client/stats/{TEST_ID}"
    response = requests.get(url)
    return response.json()

def stop_server():
    url = f"{BASE_URL}/api/stop_server"
    payload = {"server_ip": SERVER_IP}
    response = requests.post(url, json=payload)
    return response.json()

# Run the test
print("Starting server...")
server_result = start_server()
print(json.dumps(server_result, indent=2))

time.sleep(2)  # Wait for server to be ready

print("\nStarting client...")
client_result = start_client()
print(json.dumps(client_result, indent=2))

print("\nMonitoring test (30 seconds)...")
for i in range(6):
    time.sleep(5)
    stats = get_stats()
    print(f"Stats at {(i+1)*5}s: {stats.get('statistics', {})}")

print("\nStopping server...")
stop_result = stop_server()
print(json.dumps(stop_result, indent=2))

print("\nTest completed!")
```

### Example 3: CPS (Connections Per Second) Test

```bash
# Start server in CPS mode
curl -X POST "http://localhost:8000/api/start_server" \
  -H "Content-Type: application/json" \
  -d '{
    "server_ip": "192.168.1.100",
    "params": {
      "cps": true,
      "port": 5202
    }
  }'

# Start client in CPS mode
curl -X POST "http://localhost:8000/api/start_client" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "test_cps_20231028",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
      "cps": true,
      "cps_rate_limit": "10000",
      "parallel": 6400,
      "time": 30
    }
  }'
```

### Example 4: Bidirectional Traffic Test

```bash
# Start client with bidirectional traffic
curl -X POST "http://localhost:8000/api/start_client" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "test_bidi_20231028",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
      "bidi": true,
      "time": 60,
      "bitrate": "5G",
      "parallel": 3000
    }
  }'
```

---

## Best Practices

1. **Test ID Management**: Use unique, descriptive test IDs (e.g., include timestamp, test type)
2. **Server First**: Always start the server before starting the client
3. **Wait Time**: Allow 1-2 seconds between starting server and client
4. **Monitor Progress**: Poll statistics endpoints during test execution
5. **Cleanup**: Always stop the server after tests complete
6. **Error Handling**: Check response status codes and handle validation errors
7. **Timeout**: Set appropriate timeouts for long-running tests
8. **Parallel Tests**: Use different ports for concurrent tests

---

## Support & Documentation

- **OpenAPI Spec**: Available at `/openapi.json`
- **Interactive Docs**: Access Swagger UI at `/docs` (if enabled)
- **ReDoc**: Access ReDoc UI at `/redoc` (if enabled)

---

## Version History

- **v1.0.0** (Current) - Initial release with core server/client operations

---

**Note**: Replace `localhost:8000` with your actual server address and port in all examples.

