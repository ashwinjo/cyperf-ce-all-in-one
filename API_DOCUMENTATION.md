# Cyperf CE REST API Documentation

## Overview

This FastAPI server provides REST endpoints to control Cyperf Community Edition for network performance testing. The API allows you to start servers, start clients, retrieve statistics, and manage test cleanup.

**Base URL**: `http://localhost:8000`
**API Prefix**: `/api`

## API Workflow

The typical workflow for using this API is:

1. **Start Server** → Get `test_id`
2. **Start Client** → Use the `test_id` from step 1
3. **Get Statistics** → Monitor performance using `test_id`
4. **Cleanup** → Stop server processes when done

---

## 1. Start Server

Starts a Cyperf server on a specified machine and returns a `test_id` for subsequent operations.

### Endpoint
```
POST /api/start_server
```

### Request Body
```json
{
  "server_ip": "string (required)",
  "params": {
    "cps": "boolean (optional, default: false)",
    "port": "integer (optional, default: 5202)",
    "length": "string (optional, default: '1k')",
    "csv_stats": "boolean (optional, default: true)"
  }
}
```

### Response
```json
{
  "test_id": "uuid-string",
  "status": "SERVER_RUNNING",
  "message": "Cyperf server started. Use test_id for all related operations.",
  "server_pid": "integer"
}
```

### Sample cURL Command
```bash
curl -X 'POST' \
  'http://localhost:8000/api/start_server' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
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

### Sample Response
```json
{
  "test_id": "b1a741a0-9837-455e-b7f0-59cae0bb358c",
  "status": "SERVER_RUNNING",
  "message": "Cyperf server started. Use test_id for all related operations.",
  "server_pid": 12345
}
```

---

## 2. Get Test ID

The `test_id` is automatically generated when you start a server (Step 1). Save this `test_id` as it's required for all subsequent operations:

- Starting the client
- Getting server/client statistics
- Linking client to the correct server

**Important**: Each server start generates a unique `test_id`. Use the same `test_id` for all related operations in a single test session.

---

## 3. Start Client

Starts a Cyperf client that connects to the server identified by `test_id`.

### Endpoint
```
POST /api/start_client
```

### Request Body
```json
{
  "test_id": "string (required)",
  "server_ip": "string (required)",
  "client_ip": "string (required)",
  "params": {
    "cps": "boolean (optional, default: false)",
    "port": "integer (optional, default: 5202)",
    "length": "string (optional, default: '1k')",
    "time": "integer (optional, default: 60)",
    "csv_stats": "boolean (optional, default: true)",
    "bitrate": "string (optional)",
    "parallel": "integer (optional, default: 1)",
    "reverse": "boolean (optional, default: false)",
    "bidi": "boolean (optional, default: false)",
    "interval": "integer (optional)"
  }
}
```

### Response
```json
{
  "test_id": "uuid-string",
  "status": "CLIENT_RUNNING",
  "message": "Cyperf client started and linked to server.",
  "client_pid": "integer"
}
```

### Sample cURL Command
```bash
curl -X 'POST' \
  'http://localhost:8000/api/start_client' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "test_id": "b1a741a0-9837-455e-b7f0-59cae0bb358c",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
      "cps": false,
      "port": 5202,
      "length": "1k",
      "time": 60,
      "csv_stats": true,
      "bitrate": "100M",
      "parallel": 4,
      "reverse": false,
      "bidi": false,
      "interval": 1
    }
  }'
```

### Sample Response
```json
{
  "test_id": "b1a741a0-9837-455e-b7f0-59cae0bb358c",
  "status": "CLIENT_RUNNING",
  "message": "Cyperf client started and linked to server.",
  "client_pid": 67890
}
```

---

## 4. Get Statistics

Retrieve performance statistics for both server and client using the `test_id`.

### 4.1 Get Server Statistics

#### Endpoint
```
GET /api/server/stats/{test_id}
```

#### Sample cURL Command
```bash
curl -X 'GET' \
  'http://localhost:8000/api/server/stats/b1a741a0-9837-455e-b7f0-59cae0bb358c' \
  -H 'accept: application/json'
```

#### Sample Response
```json
[
  {
    "Timestamp": "2024-01-15 10:30:01",
    "Throughput": "95.2 Mbps",
    "ThroughputTX": "95.2 Mbps",
    "ThroughputRX": "0.0 Mbps",
    "TCPDataThroughput": "94.8 Mbps",
    "ParallelClientSessions": "4",
    "ActiveConnections": "4",
    "ConnectionsSucceeded": "4",
    "ConnectionsFailed": "0",
    "ConnectionRate": "4.0/sec",
    "AverageConnectionLatency": "2.5 ms"
  }
]
```

### 4.2 Get Client Statistics

#### Endpoint
```
GET /api/client/stats/{test_id}
```

#### Sample cURL Command
```bash
curl -X 'GET' \
  'http://localhost:8000/api/client/stats/b1a741a0-9837-455e-b7f0-59cae0bb358c' \
  -H 'accept: application/json'
```

#### Sample Response
```json
[
  {
    "Timestamp": "2024-01-15 10:30:01",
    "Throughput": "95.2 Mbps",
    "ThroughputTX": "95.2 Mbps",
    "ThroughputRX": "0.0 Mbps",
    "TCPDataThroughput": "94.8 Mbps",
    "ParallelClientSessions": "4",
    "ActiveConnections": "4",
    "ConnectionsSucceeded": "4",
    "ConnectionsFailed": "0",
    "ConnectionRate": "4.0/sec",
    "AverageConnectionLatency": "2.5 ms"
  }
]
```

### 4.3 Get Server Statistics as Image

#### Endpoint
```
GET /api/server/stats_image/{test_id}
```

#### Sample cURL Command
```bash
curl -X 'GET' \
  'http://localhost:8000/api/server/stats_image/b1a741a0-9837-455e-b7f0-59cae0bb358c' \
  -H 'accept: image/png' \
  --output server_stats.png
```

### 4.4 Get Client Statistics as Image

#### Endpoint
```
GET /api/client/stats_image/{test_id}
```

#### Sample cURL Command
```bash
curl -X 'GET' \
  'http://localhost:8000/api/client/stats_image/b1a741a0-9837-455e-b7f0-59cae0bb358c' \
  -H 'accept: image/png' \
  --output client_stats.png
```

---

## 5. Cleanup Server

Stops all Cyperf server processes on the specified server machine.

### Endpoint
```
DELETE /api/server/cleanup
```

### Request Body
```json
{
  "server_ip": "string (required)"
}
```

### Response
```json
{
  "cyperf_server_pids_killed": "true",
  "server_ip": "192.168.1.100"
}
```

### Sample cURL Command
```bash
curl -X 'DELETE' \
  'http://localhost:8000/api/server/cleanup' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "server_ip": "192.168.1.100"
  }'
```

### Sample Response
```json
{
  "cyperf_server_pids_killed": "true",
  "server_ip": "192.168.1.100"
}
```

---

## Complete Workflow Example

Here's a complete example of running a performance test:

### Step 1: Start Server
```bash
# Start server and capture test_id
curl -X 'POST' \
  'http://localhost:8000/api/start_server' \
  -H 'Content-Type: application/json' \
  -d '{
    "server_ip": "192.168.1.100",
    "params": {
      "cps": false,
      "port": 5202,
      "length": "1k",
      "csv_stats": true
    }
  }'

# Response: {"test_id": "b1a741a0-9837-455e-b7f0-59cae0bb358c", ...}
```

### Step 2: Start Client
```bash
# Use the test_id from step 1
curl -X 'POST' \
  'http://localhost:8000/api/start_client' \
  -H 'Content-Type: application/json' \
  -d '{
    "test_id": "b1a741a0-9837-455e-b7f0-59cae0bb358c",
    "server_ip": "192.168.1.100",
    "client_ip": "192.168.1.101",
    "params": {
      "time": 120,
      "parallel": 4,
      "bitrate": "100M"
    }
  }'
```

### Step 3: Monitor Statistics
```bash
# Get server stats
curl -X 'GET' \
  'http://localhost:8000/api/server/stats/b1a741a0-9837-455e-b7f0-59cae0bb358c'

# Get client stats
curl -X 'GET' \
  'http://localhost:8000/api/client/stats/b1a741a0-9837-455e-b7f0-59cae0bb358c'
```

### Step 4: Cleanup
```bash
# Stop server processes
curl -X 'DELETE' \
  'http://localhost:8000/api/server/cleanup' \
  -H 'Content-Type: application/json' \
  -d '{
    "server_ip": "192.168.1.100"
  }'
```

---

## Parameter Reference

### Server Parameters
- **`cps`**: Boolean flag to enable connection-per-second mode
- **`port`**: Server listening port (default: 5202)
- **`length`**: Packet/buffer length (e.g., "1k", "64k")
- **`csv_stats`**: Enable CSV statistics output

### Client Parameters
- **`cps`**: Boolean flag to enable connection-per-second mode
- **`port`**: Server port to connect to (default: 5202)
- **`length`**: Packet/buffer length (e.g., "1k", "64k")
- **`time`**: Test duration in seconds (default: 60)
- **`csv_stats`**: Enable CSV statistics output
- **`bitrate`**: Target bitrate (e.g., "1M", "100M")
- **`parallel`**: Number of parallel connections (default: 1)
- **`reverse`**: Reverse direction test (server sends to client)
- **`bidi`**: Bidirectional test
- **`interval`**: Statistics reporting interval in seconds

---

## Error Responses

All endpoints return standard HTTP error responses:

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error message describing the issue"
}
```

### Common Errors
- **"Server not started for this test_id"**: Trying to start client before server
- **"Test not found"**: Using invalid or expired test_id
- **"SSH connection failed"**: Network connectivity issues
- **"Bad authentication type"**: SSH key/credential issues

---

## Interactive API Documentation

Once your server is running, visit these URLs for interactive documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

These provide an interactive interface to test all endpoints directly from your browser.

---

## Notes

1. **Test ID Lifecycle**: Each `test_id` is unique per server start. Use the same `test_id` for all related operations.

2. **SSH Requirements**: The API requires SSH access to both server and client machines with appropriate credentials configured.

3. **File Paths**: CSV statistics files are saved as `{test_id}.csv` on the respective machines.

4. **Process Management**: The cleanup endpoint stops all Cyperf processes on the specified server machine.

5. **Concurrent Tests**: You can run multiple tests simultaneously by using different server machines or different ports.
