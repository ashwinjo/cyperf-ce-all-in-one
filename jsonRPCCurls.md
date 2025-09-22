# JSON-RPC cURL Commands for MCP Endpoint

This document provides ready-to-use cURL commands for all JSON-RPC calls to the `/mcp` endpoint at `http://localhost:8001/mcp`.

## Table of Contents

1. [MCP Protocol Commands](#mcp-protocol-commands)
2. [Server Management Commands](#server-management-commands)
3. [Client Management Commands](#client-management-commands)
4. [Statistics Commands](#statistics-commands)
5. [Log Management Commands](#log-management-commands)
6. [Complete Workflow Scripts](#complete-workflow-scripts)
7. [Batch Testing Scripts](#batch-testing-scripts)

---

## MCP Protocol Commands

### Initialize Connection

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-client",
        "version": "1.0.0"
      }
    }
  }' | jq '.'
```

### List Available Tools

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }' | jq '.'
```

### List Tools (Names Only)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }' | jq '.result.tools[].name'
```

---

## Server Management Commands

### Start Cyperf Server (Basic)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "192.168.1.100"
      }
    }
  }' | jq '.'
```

### Start Cyperf Server (Full Parameters)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
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
  }' | jq '.'
```

### Start Cyperf Server (CPS Mode)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "192.168.1.100",
        "cps": true,
        "port": 5202,
        "length": "64k",
        "csv_stats": true
      }
    }
  }' | jq '.'
```

### Stop Server

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "stop_server",
      "arguments": {
        "server_ip": "192.168.1.100"
      }
    }
  }' | jq '.'
```

---

## Client Management Commands

### Start Cyperf Client (Basic)

```bash
# Replace TEST_ID with actual test ID from server start
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "TEST_ID",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200"
      }
    }
  }' | jq '.'
```

### Start Cyperf Client (Full Parameters)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "TEST_ID",
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
  }' | jq '.'
```

### Start Client (CPS Mode with Rate Limit)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "TEST_ID",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "cps": true,
        "cps_rate_limit": "1k/s",
        "time": 120,
        "parallel": 4
      }
    }
  }' | jq '.'
```

### Start Client (High CPS Rate)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "TEST_ID",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "cps": true,
        "cps_rate_limit": "10k/s",
        "time": 300,
        "parallel": 8
      }
    }
  }' | jq '.'
```

### Start Client (Bitrate Mode)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "TEST_ID",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "bitrate": "1G",
        "parallel": 4,
        "time": 180
      }
    }
  }' | jq '.'
```

### Start Client (Reverse Mode)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "TEST_ID",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "reverse": true,
        "bitrate": "500M",
        "time": 120
      }
    }
  }' | jq '.'
```

### Start Client (Bidirectional Mode)

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "TEST_ID",
        "server_ip": "192.168.1.100",
        "client_ip": "192.168.1.200",
        "bidi": true,
        "bitrate": "200M",
        "parallel": 2,
        "time": 60
      }
    }
  }' | jq '.'
```

---

## Statistics Commands

### Get Server Statistics

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "get_server_stats",
      "arguments": {
        "test_id": "TEST_ID"
      }
    }
  }' | jq '.'
```

### Get Client Statistics

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "get_client_stats",
      "arguments": {
        "test_id": "TEST_ID"
      }
    }
  }' | jq '.'
```

### Get Server Statistics Image

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "get_server_stats_image",
      "arguments": {
        "test_id": "TEST_ID"
      }
    }
  }' | jq '.'
```

### Get Client Statistics Image

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "get_client_stats_image",
      "arguments": {
        "test_id": "TEST_ID"
      }
    }
  }' | jq '.'
```

---

## Log Management Commands

### Get Server Logs

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/call",
    "params": {
      "name": "get_server_logs",
      "arguments": {
        "test_id": "TEST_ID"
      }
    }
  }' | jq '.'
```

### Get Client Logs

```bash
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 11,
    "method": "tools/call",
    "params": {
      "name": "get_client_logs",
      "arguments": {
        "test_id": "TEST_ID"
      }
    }
  }' | jq '.'
```

---

## Complete Workflow Scripts

### Basic Performance Test Workflow

```bash
#!/bin/bash

# Set your IP addresses
SERVER_IP="192.168.1.100"
CLIENT_IP="192.168.1.200"
MCP_ENDPOINT="http://localhost:8001/mcp"

echo "🚀 Starting Cyperf Performance Test Workflow"

# 1. Initialize MCP connection
echo "📡 Initializing MCP connection..."
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "perf-test", "version": "1.0.0"}
    }
  }' | jq '.'

# 2. Start server
echo "🖥️  Starting Cyperf server..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'",
        "port": 5202,
        "csv_stats": true
      }
    }
  }')

echo $RESPONSE | jq '.'

# Extract test_id from response
TEST_ID=$(echo $RESPONSE | jq -r '.result.content[0].text' | grep -o 'Test ID: [^\\n]*' | cut -d' ' -f3)
echo "📝 Test ID: $TEST_ID"

# 3. Start client
echo "📱 Starting Cyperf client..."
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "'$TEST_ID'",
        "server_ip": "'$SERVER_IP'",
        "client_ip": "'$CLIENT_IP'",
        "time": 60,
        "bitrate": "100M"
      }
    }
  }' | jq '.'

# 4. Wait for test to run
echo "⏳ Waiting 30 seconds for test to run..."
sleep 30

# 5. Get statistics
echo "📊 Getting server statistics..."
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_server_stats",
      "arguments": {
        "test_id": "'$TEST_ID'"
      }
    }
  }' | jq '.'

echo "📊 Getting client statistics..."
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "get_client_stats",
      "arguments": {
        "test_id": "'$TEST_ID'"
      }
    }
  }' | jq '.'

# 6. Wait for test completion
echo "⏳ Waiting for test completion..."
sleep 35

# 7. Get final logs
echo "📜 Getting server logs..."
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "get_server_logs",
      "arguments": {
        "test_id": "'$TEST_ID'"
      }
    }
  }' | jq '.'

# 8. Cleanup
echo "🧹 Cleaning up..."
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "stop_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'"
      }
    }
  }' | jq '.'

echo "✅ Performance test completed!"
```

### CPS Performance Test Workflow

```bash
#!/bin/bash

# Set your IP addresses
SERVER_IP="192.168.1.100"
CLIENT_IP="192.168.1.200"
MCP_ENDPOINT="http://localhost:8001/mcp"

echo "🚀 Starting CPS Performance Test"

# 1. Start server in CPS mode
echo "🖥️  Starting Cyperf server (CPS mode)..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'",
        "cps": true,
        "port": 5202
      }
    }
  }')

TEST_ID=$(echo $RESPONSE | jq -r '.result.content[0].text' | grep -o 'Test ID: [^\\n]*' | cut -d' ' -f3)
echo "📝 Test ID: $TEST_ID"

# 2. Start client with CPS rate limit
echo "📱 Starting Cyperf client (CPS: 5k/s)..."
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "'$TEST_ID'",
        "server_ip": "'$SERVER_IP'",
        "client_ip": "'$CLIENT_IP'",
        "cps": true,
        "cps_rate_limit": "5k/s",
        "time": 120,
        "parallel": 4
      }
    }
  }' | jq '.'

# 3. Monitor progress
echo "⏳ Monitoring test progress..."
for i in {1..4}; do
  sleep 30
  echo "📊 Getting statistics (check $i/4)..."
  curl -s -X POST $MCP_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "id": '$((i+2))',
      "method": "tools/call",
      "params": {
        "name": "get_server_stats",
        "arguments": {
          "test_id": "'$TEST_ID'"
        }
      }
    }' | jq '.result.content[0].text'
done

# 4. Cleanup
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 99,
    "method": "tools/call",
    "params": {
      "name": "stop_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'"
      }
    }
  }' | jq '.'

echo "✅ CPS test completed!"
```

### Multi-Client Load Test

```bash
#!/bin/bash

SERVER_IP="192.168.1.100"
CLIENT_IPS=("192.168.1.200" "192.168.1.201" "192.168.1.202")
MCP_ENDPOINT="http://localhost:8001/mcp"

echo "🚀 Starting Multi-Client Load Test"

# 1. Start server
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'",
        "port": 5202
      }
    }
  }')

TEST_ID=$(echo $RESPONSE | jq -r '.result.content[0].text' | grep -o 'Test ID: [^\\n]*' | cut -d' ' -f3)
echo "📝 Test ID: $TEST_ID"

# 2. Start multiple clients
ID=2
for CLIENT_IP in "${CLIENT_IPS[@]}"; do
  echo "📱 Starting client on $CLIENT_IP..."
  curl -X POST $MCP_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "id": '$ID',
      "method": "tools/call",
      "params": {
        "name": "start_cyperf_client",
        "arguments": {
          "test_id": "'$TEST_ID'",
          "server_ip": "'$SERVER_IP'",
          "client_ip": "'$CLIENT_IP'",
          "bitrate": "50M",
          "time": 180,
          "parallel": 2
        }
      }
    }' &
  ((ID++))
  sleep 5
done

wait
echo "✅ All clients started!"

# 3. Monitor
sleep 60
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 99,
    "method": "tools/call",
    "params": {
      "name": "get_server_stats",
      "arguments": {
        "test_id": "'$TEST_ID'"
      }
    }
  }' | jq '.'

# 4. Cleanup
sleep 130
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 100,
    "method": "tools/call",
    "params": {
      "name": "stop_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'"
      }
    }
  }' | jq '.'
```

---

## Batch Testing Scripts

### Test All Tools

```bash
#!/bin/bash

MCP_ENDPOINT="http://localhost:8001/mcp"
SERVER_IP="192.168.1.100"
CLIENT_IP="192.168.1.200"

echo "🧪 Testing All MCP Tools"

# Test tools/list
echo "1️⃣ Testing tools/list..."
curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }' | jq '.result.tools[].name'

# Test start_server
echo "2️⃣ Testing start_cyperf_server..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'"
      }
    }
  }')

if echo $RESPONSE | jq -e '.result' > /dev/null; then
  echo "✅ start_cyperf_server: PASS"
  TEST_ID=$(echo $RESPONSE | jq -r '.result.content[0].text' | grep -o 'Test ID: [^\\n]*' | cut -d' ' -f3)
else
  echo "❌ start_cyperf_server: FAIL"
  exit 1
fi

# Test start_client
echo "3️⃣ Testing start_cyperf_client..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_client",
      "arguments": {
        "test_id": "'$TEST_ID'",
        "server_ip": "'$SERVER_IP'",
        "client_ip": "'$CLIENT_IP'",
        "time": 30
      }
    }
  }')

if echo $RESPONSE | jq -e '.result' > /dev/null; then
  echo "✅ start_cyperf_client: PASS"
else
  echo "❌ start_cyperf_client: FAIL"
fi

# Wait for some data
sleep 15

# Test statistics
echo "4️⃣ Testing get_server_stats..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_server_stats",
      "arguments": {
        "test_id": "'$TEST_ID'"
      }
    }
  }')

if echo $RESPONSE | jq -e '.result' > /dev/null; then
  echo "✅ get_server_stats: PASS"
else
  echo "❌ get_server_stats: FAIL"
fi

echo "5️⃣ Testing get_client_stats..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "get_client_stats",
      "arguments": {
        "test_id": "'$TEST_ID'"
      }
    }
  }')

if echo $RESPONSE | jq -e '.result' > /dev/null; then
  echo "✅ get_client_stats: PASS"
else
  echo "❌ get_client_stats: FAIL"
fi

# Test logs
echo "6️⃣ Testing get_server_logs..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "get_server_logs",
      "arguments": {
        "test_id": "'$TEST_ID'"
      }
    }
  }')

if echo $RESPONSE | jq -e '.result' > /dev/null; then
  echo "✅ get_server_logs: PASS"
else
  echo "❌ get_server_logs: FAIL"
fi

# Wait for test to complete
sleep 20

# Test cleanup
echo "7️⃣ Testing stop_server..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "stop_server",
      "arguments": {
        "server_ip": "'$SERVER_IP'"
      }
    }
  }')

if echo $RESPONSE | jq -e '.result' > /dev/null; then
  echo "✅ stop_server: PASS"
else
  echo "❌ stop_server: FAIL"
fi

echo "🎉 All tests completed!"
```

### Quick Health Check

```bash
#!/bin/bash

MCP_ENDPOINT="http://localhost:8001/mcp"

echo "🏥 MCP Health Check"

# Check if server is running
echo "1️⃣ Checking server status..."
if curl -s http://localhost:8001/mcp > /dev/null; then
  echo "✅ Server is running"
else
  echo "❌ Server is not accessible"
  exit 1
fi

# Check MCP protocol
echo "2️⃣ Testing MCP protocol..."
RESPONSE=$(curl -s -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }')

TOOL_COUNT=$(echo $RESPONSE | jq '.result.tools | length')
if [ "$TOOL_COUNT" -gt 0 ]; then
  echo "✅ MCP protocol working ($TOOL_COUNT tools available)"
else
  echo "❌ MCP protocol issue"
  exit 1
fi

# List available tools
echo "3️⃣ Available tools:"
echo $RESPONSE | jq -r '.result.tools[].name' | sed 's/^/   - /'

echo "🎉 Health check passed!"
```

---

## Usage Notes

### Making Scripts Executable

```bash
chmod +x basic_test.sh
chmod +x cps_test.sh
chmod +x multi_client_test.sh
chmod +x test_all.sh
chmod +x health_check.sh
```

### Environment Variables

You can set these variables to avoid editing scripts:

```bash
export SERVER_IP="192.168.1.100"
export CLIENT_IP="192.168.1.200"
export MCP_ENDPOINT="http://localhost:8001/mcp"
```

### Error Handling

Add error checking to your scripts:

```bash
# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "❌ jq is required but not installed"
  exit 1
fi

# Check server response
if ! curl -s http://localhost:8001/mcp > /dev/null; then
  echo "❌ MCP server is not running"
  exit 1
fi
```

### Extracting Test IDs

```bash
# Extract test ID from server start response
TEST_ID=$(echo $RESPONSE | jq -r '.result.content[0].text' | grep -o 'Test ID: [^\\n]*' | cut -d' ' -f3)

# Alternative using sed
TEST_ID=$(echo $RESPONSE | jq -r '.result.content[0].text' | sed -n 's/.*Test ID: \([^\\n]*\).*/\1/p')
```

### Parallel Execution

```bash
# Run multiple clients in parallel
for CLIENT_IP in "${CLIENT_IPS[@]}"; do
  start_client_command &
done
wait  # Wait for all background jobs to complete
```

---

## Tips and Tricks

1. **Use `jq` for JSON parsing** - Makes extracting values much easier
2. **Save test IDs** - Always capture and reuse the test ID from server start
3. **Add timeouts** - Use `curl --max-time 30` for long-running operations
4. **Check responses** - Always verify the response contains expected data
5. **Clean up** - Always run stop_server after tests
6. **Use variables** - Set SERVER_IP and CLIENT_IP at the top of scripts
7. **Error handling** - Check curl exit codes and JSON response structure
8. **Logging** - Redirect output to files for later analysis: `script.sh > test.log 2>&1`
