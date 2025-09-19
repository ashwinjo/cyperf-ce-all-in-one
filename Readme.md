# REST Powered Cyperf CE Controller

A FastAPI-based web application to control Keysight Cyperf CE Client and Server Tests via SSH.

---

## Features

- Start/stop Cyperf server and client remotely via REST API
- SSH authentication via private key or username/password
- Dockerized for easy deployment
- Collects and returns test statistics

---

## Requirements

- Python 3.11+
- Docker (for containerized deployment)
- Access to remote machines with Cyperf installed

---

## Environment Variables

The application is configured via environment variables (or a `.env` file):

| Variable         | Description                                 | Example                        |
|------------------|---------------------------------------------|--------------------------------|
| SERVER_IP        | IP address of the Cyperf server             | `100.25.44.178`                |
| CLIENT_IP        | IP address of the Cyperf client             | `34.218.246.113`               |
| SSH_USERNAME     | SSH username for both server and client     | `ubuntu`                       |
| SSH_KEY_PATH     | Path to SSH private key (inside container)  | `/home/ubuntu/vibecode.pem`    |
| SSH_PASSWORD     | (Optional) SSH password for authentication  | `yourpassword`                 |

- If `SSH_PASSWORD` is set, the app uses username/password authentication.
- If not, it uses the SSH key at `SSH_KEY_PATH`.

---

## Local Development

1. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```

2. **Create a `.env` file:**
   ```
   SERVER_IP=100.25.44.178
   CLIENT_IP=34.218.246.113
   SSH_USERNAME=ubuntu
   SSH_KEY_PATH=/path/to/vibecode.pem
   # SSH_PASSWORD=yourpassword  # Uncomment to use password auth
   ```

3. **Run the app:**
   ```sh
   uvicorn main:app --reload
   ```

---

## Docker Usage

### **Build the image:**
```sh
docker build -t cyperf-app .
```

### **Run the container:**
```sh
docker run -d -p 8000:8000 \
  -e SERVER_IP=100.25.44.178 \
  -e CLIENT_IP=34.218.246.113 \
  -e SSH_USERNAME=ubuntu \
  -e SSH_KEY_PATH=/home/ubuntu/vibecode.pem \
  -v /path/to/vibecode.pem:/home/ubuntu/vibecode.pem:ro \
  cyperf-app
```
- To use password authentication, add `-e SSH_PASSWORD=yourpassword` and omit the `-v`/`SSH_KEY_PATH` options.

### **Using a `.env` file:**
```sh
docker run -d -p 8000:8000 --env-file .env \
  -v /path/to/vibecode.pem:/home/ubuntu/vibecode.pem:ro \
  cyperf-app
```

---

## API

- The API is served at: `http://localhost:8000/api/`
- Interactive docs: `http://localhost:8000/docs`

---

## SSH Authentication

- **Key-based:** Mount your private key into the container and set `SSH_KEY_PATH`.
- **Password-based:** Set `SSH_PASSWORD` (do not set `SSH_KEY_PATH`).

---

## MCP (Model Context Protocol) Support

This application now supports MCP (Model Context Protocol) for integration with MCP clients like Claude Desktop, Cursor, and other AI assistants.

### **MCP Server Setup**

The MCP server wraps the FastAPI endpoints and exposes them as tools that can be used by MCP clients.

#### **Available MCP Tools:**

1. **start_cyperf_server** - Start a Cyperf CE server
2. **start_cyperf_client** - Start a Cyperf CE client  
3. **get_server_stats** - Get server statistics
4. **get_client_stats** - Get client statistics
5. **get_server_stats_image** - Get server stats as image
6. **get_client_stats_image** - Get client stats as image
7. **stop_server** - Stop all servers

#### **Running with Docker Compose (MCP + FastAPI):**

1. **Create environment file:**
   ```bash
   # .env file
   SERVER_IP=100.25.44.178
   CLIENT_IP=34.218.246.113
   SSH_USERNAME=ubuntu
   SSH_KEY_PATH=/home/ubuntu/vibecode.pem
   SSH_KEY_HOST_PATH=/path/to/your/vibecode.pem
   # SSH_PASSWORD=yourpassword  # Optional: for password auth
   ```

2. **Start both services:**
   ```bash
   docker-compose -f docker-compose.mcp.yml up -d
   ```

   This starts:
   - FastAPI service on `http://localhost:8000`
   - MCP server ready for stdio connection

#### **Running MCP Server Standalone:**

```bash
# Build the image
docker build -f Dockerfile.mcp -t cyperf-mcp .

# Run MCP server
docker run -it --rm \
  -e SERVER_IP=100.25.44.178 \
  -e CLIENT_IP=34.218.246.113 \
  -e SSH_USERNAME=ubuntu \
  -e SSH_KEY_PATH=/home/ubuntu/vibecode.pem \
  -v /path/to/vibecode.pem:/home/ubuntu/vibecode.pem:ro \
  cyperf-mcp mcp
```

#### **Using with MCP Clients:**

##### **HTTP Streamable (Recommended):**

**Option 1: SSE (Server-Sent Events) Server**

The dedicated SSE server provides the most robust streaming experience:

```bash
# Start your main FastAPI app first
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Start the MCP SSE server
python mcp_sse_server.py --host 0.0.0.0 --port 8001
```

**Claude Desktop Configuration for SSE:**
```json
{
  "mcpServers": {
    "cyperf-ce-controller": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:8001/sse"
      }
    }
  }
}
```

**Option 2: Direct HTTP Endpoint**

Your FastAPI app includes a `/api/mcp` endpoint for simple HTTP-based MCP:

**Claude Desktop Configuration for HTTP:**
```json
{
  "mcpServers": {
    "cyperf-ce-controller": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:8000/api/mcp"
      }
    }
  }
}
```

##### **Direct stdio (Alternative):**

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cyperf-ce-controller": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--env-file", "/path/to/.env",
        "-v", "/path/to/vibecode.pem:/home/ubuntu/vibecode.pem:ro",
        "cyperf-mcp", "mcp"
      ]
    }
  }
}
```

##### **Direct Python Execution:**

```bash
# Make sure FastAPI is running first
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Run MCP server
python mcp_server.py
```

#### **MCP Usage Examples:**

Once connected to an MCP client, you can:

1. **Start a server test:**
   ```
   Use the start_cyperf_server tool with port 5202 and csv_stats enabled
   ```

2. **Connect a client:**
   ```
   Use start_cyperf_client with the test_id from server, server IP, and run for 120 seconds
   ```

3. **Get statistics:**
   ```
   Use get_server_stats or get_client_stats with the test_id
   ```

4. **Visualize data:**
   ```
   Use get_server_stats_image to get a visual table of the statistics
   ```

#### **Testing the MCP Endpoints:**

**Testing the SSE Server:**

```bash
# Test SSE server health
curl http://localhost:8001/health

# Test SSE endpoint (requires SSE client or tools like curl with --no-buffer)
curl -X POST http://localhost:8001/sse \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -N \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# If you get the "Not Acceptable" error, make sure to include the Accept header:
curl -X POST http://localhost:8001/sse \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -N \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Testing the Direct HTTP Endpoint:**

You can test the MCP endpoint directly with curl:

```bash
# Test MCP initialization
curl -X POST http://localhost:8000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# List available tools
curl -X POST http://localhost:8000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# Call a tool (start server)
curl -X POST http://localhost:8000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "start_cyperf_server",
      "arguments": {
        "port": 5202,
        "csv_stats": true
      }
    }
  }'
```

---

## License

MIT
