# CyPerf CE All-in-One Controller

A complete web-based controller for **Keysight CyPerf CE** network performance testing. Run high-throughput and CPS (Connections Per Second) tests with a modern UI, REST API, and AI assistant integration.

![Architecture](https://img.shields.io/badge/Architecture-Agent--Controller-blue) ![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20Flask-green) ![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)

---

## ⚡ Quick Start

### Prerequisites
- **Agent Hosts**: 2+ Ubuntu/Debian machines with CyPerf CE installed
- **Controller Host**: Linux machine with Docker
- **SSH Access**: Key-based or password authentication to agents

### 1️⃣ **Deploy Agents** (Client & Server Hosts)

On each agent machine:
```bash
git clone https://github.com/ashwinjo/cyperf-ce-all-in-one.git && cd cyperf-ce-all-in-one
sh deployment/userdata.sh
```

### 2️⃣ **Deploy Controller** (Control Machine)

```bash
git clone https://github.com/ashwinjo/cyperf-ce-all-in-one.git && cd cyperf-ce-all-in-one

# Configure authentication
nano .env  # Set SERVER_IP, CLIENT_IP, SSH credentials

# Deploy all services
sudo bash docker_resurrection.sh
```

### 3️⃣ **Access the Application**

- **Web GUI**: http://localhost:5000
- **REST API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🎯 Features

### Web Interface
- **Visual Test Configuration**: Select preset tests or customize parameters
- **Real-Time Monitoring**: Live statistics and performance charts
- **Test Results**: Detailed metrics for throughput and CPS tests
- **PDF Reports**: Export test results as professional reports

### Test Types
- **Throughput Tests**: Measure network bandwidth (Mbps/Gbps)
- **CPS Tests**: Measure connection rate (connections/second)
- **Bidirectional Traffic**: Client-to-server or server-to-client

### Performance Metrics

**For Throughput Tests:**
- Average & Peak Throughput (Mbps)
- Average Latency (ms)
- Bandwidth utilization

**For CPS Tests:**
- Average Connection Rate (conn/s)
- Total Connections Succeeded/Failed
- Highest Connection Latency (ms)

### REST API
- Complete programmatic control
- OpenAPI/Swagger documentation
- Postman collection included

### AI Integration (MCP)
- **Model Context Protocol** support
- Works with Claude Desktop, Cursor, and other MCP clients
- Natural language test execution

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Controller Layer                │
│  ┌──────────┐  ┌──────┐  ┌──────────┐  │
│  │ REST API │  │  GUI │  │   MCP    │  │
│  └────┬─────┘  └───┬──┘  └────┬─────┘  │
└───────┼────────────┼──────────┼─────────┘
        │            │          │
        └────────────┴──────────┘
                     │ SSH
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐       ┌────────▼───────┐
│  Agent Layer   │       │  Agent Layer   │
│                │       │                │
│ Client Agent   │◄─────►│ Server Agent   │
│                │ Test  │                │
└────────────────┘       └────────────────┘
```

**Controller Layer**: Orchestrates tests via SSH
**Agent Layer**: Executes CyPerf CE tests

---

## 🔧 Configuration

### Environment Variables (`.env` file)

```bash
# Agent SSH Configuration
SERVER_IP=192.168.1.10
CLIENT_IP=192.168.1.11
SSH_USERNAME=ubuntu

# Authentication (choose one):
SSH_KEY_PATH=/path/to/key.pem          # Key-based (recommended)
# SSH_PASSWORD=yourpassword            # Password-based

# Optional
FASTAPI_HOST=localhost
SECRET_KEY=your-secret-key
```

### Authentication Methods

**Key-Based** (Recommended):
```bash
SSH_KEY_PATH=/path/to/key.pem
SSH_KEY_HOST_PATH=/local/path/to/key.pem
```

**Password-Based**:
```bash
SSH_PASSWORD=yourpassword
```
> **Note**: If `SSH_PASSWORD` is set, it takes precedence over key-based auth.

---

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f docker-compose.mcp.yml up -d

# View logs
docker-compose -f docker-compose.mcp.yml logs -f

# Stop services
docker-compose -f docker-compose.mcp.yml down
```

**Services Started:**
- FastAPI Backend (Port 8000)
- Flask Frontend (Port 5000)
- MCP Server (for AI integration)
- SSE Server (Port 8001)

### Option 2: Individual Services

**Backend Only:**
```bash
docker build -t cyperf-api .
docker run -d -p 8000:8000 --env-file .env cyperf-api
```

**Frontend Only:**
```bash
cd cce_flask
docker build -t cyperf-gui .
docker run -d -p 5000:5000 -e CYPERF_API_BASE_URL=http://localhost:8000/api cyperf-gui
```

---

## 🧪 Running Tests

### Via Web Interface

1. Go to **http://localhost:5000**
2. Select a test type:
   - **High Throughput Test** (10 Gbps)
   - **High CPS Test** (10K CPS)
   - **Custom Configuration**
3. Click **RUN TEST**
4. Monitor real-time statistics
5. Export PDF report when complete

### Via REST API

```bash
# Start server
curl -X POST http://localhost:8000/api/start_server \
  -H "Content-Type: application/json" \
  -d '{
    "server_ip": "192.168.1.10",
    "server_params": {
      "port": 5202,
      "csv_stats": true
    }
  }'

# Start client
curl -X POST http://localhost:8000/api/start_client \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "test-123",
    "server_ip": "192.168.1.10",
    "client_ip": "192.168.1.11",
    "client_params": {
      "port": 5202,
      "time": 60,
      "bitrate": "10000M"
    }
  }'

# Get statistics
curl http://localhost:8000/api/server/stats/test-123
curl http://localhost:8000/api/client/stats/test-123
```

---

## 🤖 AI Assistant Integration (MCP)

Control tests using natural language via Claude Desktop, Cursor, or other MCP clients.

### Setup for Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cyperf-controller": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:8001/sse"
      }
    }
  }
}
```

### Example AI Commands

- "Run a throughput test between my client and server for 60 seconds"
- "Show me the current test statistics"
- "Start a CPS test with 10,000 connections per second"
- "Export the test results as a PDF"

---

## 📊 Test Results

The application provides comprehensive metrics:

### Throughput Test Results
- **Average Throughput**: Mean bandwidth across test duration
- **Peak Throughput**: Maximum bandwidth achieved
- **Average Latency**: Mean round-trip time
- **Traffic Pattern**: TX/RX analysis

### CPS Test Results
- **Average Connection Rate**: Mean connections/second
- **Total Connections Succeeded**: Cumulative successful connections
- **Total Connections Failed**: Sum of all failures
- **Highest Connection Latency**: Peak connection time

### Real-Time Charts
- Throughput over time
- Connections per second over time
- Error analysis

---

## 📁 Project Structure

```
cyperf-ce-mcp-rest/
├── app/                    # FastAPI backend
│   ├── api/               # API routes
│   ├── services/          # CyPerf service layer
│   └── core/              # Configuration
├── cce_flask/             # Flask frontend
│   ├── static/            # CSS, JS, images
│   ├── templates/         # HTML templates
│   └── utils/             # Helper utilities
├── deployment/            # Deployment scripts
├── docker-compose.mcp.yml # Docker Compose config
├── DEPLOYMENT_GUIDE.md    # Detailed deployment guide
└── REST_API_DOCUMENTATION.md  # API reference
```

---

## 🐛 Troubleshooting

### Services Not Starting
```bash
# Check Docker logs
docker-compose -f docker-compose.mcp.yml logs

# Rebuild and restart
docker-compose -f docker-compose.mcp.yml up -d --build
```

### Cannot Connect to Agents
- Verify SSH credentials in `.env`
- Test manual SSH: `ssh -i key.pem user@agent-ip`
- Check firewall rules (port 22 must be open)
- Ensure agents are reachable from controller

### Web Interface Not Loading
```bash
# Check if Flask container is running
docker ps | grep flask-frontend

# View Flask logs
docker logs cyperf-ce-mcp-rest-flask-frontend-1

# Restart Flask
docker restart cyperf-ce-mcp-rest-flask-frontend-1
```

---

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)**: Complete setup instructions
- **[REST API Documentation](REST_API_DOCUMENTATION.md)**: Full API reference
- **[Postman Collection](postman_collection.json)**: Import into Postman for testing

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔗 Resources

- **GitHub Repository**: https://github.com/ashwinjo/cyperf-ce-all-in-one
- **CyPerf CE Documentation**: [Keysight CyPerf CE](https://www.keysight.com/us/en/products/network-test/protocol-load-test/cyperf.html)
- **FastAPI**: https://fastapi.tiangolo.com/
- **Flask**: https://flask.palletsprojects.com/

---

## 💡 Tips

- **Preset Tests**: Use "High Throughput Test" or "High CPS Test" for quick testing
- **Custom Tests**: Fine-tune bandwidth, packet size, duration, and more
- **Multiple Tests**: Run sequential tests to compare results
- **PDF Reports**: Share professional test reports with stakeholders
- **API Integration**: Automate testing in CI/CD pipelines

---

**Built with ❤️ for network performance testing**
