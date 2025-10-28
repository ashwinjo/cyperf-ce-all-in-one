# CyPerf CE Deployment Guide

## Architecture Overview

The solution consists of two main layers:

1. **Agent Layer** - CyPerf CE Agents installed on Client and Server hosts
2. **Controller Layer** - REST API Server, GUI, and MCP components

```
┌─────────────────────────────────────────────────────────────┐
│                     Controller Layer                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  REST API  │  │    GUI     │  │    MCP     │           │
│  │   Server   │  │            │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Authentication
                            │ (Key-based or Password-based)
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼─────────┐                   ┌────────▼────────┐
│  Agent Layer    │                   │  Agent Layer    │
│                 │                   │                 │
│  Client Agent   │                   │  Server Agent   │
│                 │                   │                 │
└─────────────────┘                   └─────────────────┘
```

## Authentication Methods

The Controller communicates with Server and Client Agents using one of two authentication methods:

### 1. Key-Based Authentication
- SSH private key must be copied to the Controller host
- More secure and recommended for production environments
- No password required once key is configured

### 2. Username/Password Based Authentication
- Simple username and password authentication
- Easier to set up for testing environments
- **Note:** If SSH password is configured, it takes precedence over key-based authentication

---

## Deployment Steps

### Agent Layer: Installing CyPerf CE Agents

Deploy CyPerf CE Agents on both your Client and Server hosts.

#### Prerequisites
- Ubuntu or Debian-based host
- Internet connectivity
- Sudo privileges

#### Installation Steps

1. **Login to your Ubuntu/Debian host** that you want to use as an Agent (repeat for both Client and Server hosts)

2. **Clone the repository:**
   ```bash
   git clone https://github.com/ashwinjo/cyperf-ce-all-in-one.git && cd cyperf-ce-all-in-one
   ```

3. **Run the deployment script:**
   ```bash
   sh deployment/userdata.sh
   ```

4. **Repeat steps 1-3** for each Agent host (Client and Server)

---

### Controller Layer: Installing Controller Components

The Controller Layer includes:
- REST API Server
- Web GUI
- MCP (Model Context Protocol) Server

#### Prerequisites
- Linux host (can be one of the Agent hosts or a separate host)
- Docker and Docker Compose installed
- Internet connectivity
- Sudo privileges

#### Installation Steps

1. **Login to your Controller host**
   
   This is the Linux box from where you will run the tests. It can be one of the Agent hosts or a dedicated controller.

2. **Clone the repository:**
   ```bash
   git clone https://github.com/ashwinjo/cyperf-ce-all-in-one.git && cd cyperf-ce-all-in-one
   ```

3. **Configure authentication and environment variables:**
   
   Modify the `.env` file to configure:
   - Authentication method (Key-based or Password-based)
   - FASTAPI Host IP/DNS (Controller host IP or DNS name)
   
   View the example `.env` file: [https://github.com/ashwinjo/cyperf-ce-all-in-one/blob/main/.env](https://github.com/ashwinjo/cyperf-ce-all-in-one/blob/main/.env)
   
   **Important Configuration Options:**
   
   ```bash
   # Edit the .env file
   nano .env
   ```
   
   **For Key-Based Authentication:**
   ```env
   # Path to SSH private key
   SSH_KEY_PATH=/path/to/your/private/key
   
   # Controller/FastAPI Host
   FASTAPI_HOST=<your-controller-ip-or-dns>
   ```
   
   **For Password-Based Authentication:**
   ```env
   # SSH Password (takes precedence over key-based auth)
   SSH_PASSWORD=your-password
   
   # Controller/FastAPI Host
   FASTAPI_HOST=<your-controller-ip-or-dns>
   ```
   
   > **Note:** If you add `SSH_PASSWORD`, it takes precedence over key-based authentication.

4. **Deploy the Controller components:**
   ```bash
   sudo bash docker_resurrection.sh
   ```

   This script will:
   - Install/update Docker and Docker Compose if needed
   - Build and start all controller services
   - Set up the REST API Server
   - Deploy the Web GUI
   - Initialize the MCP server

---

## Post-Deployment Verification

### Verify Agent Installation

On each Agent host, verify the CyPerf CE agent is running:
```bash
docker ps
```

You should see CyPerf CE containers running.

### Verify Controller Installation

On the Controller host:

1. **Check all services are running:**
   ```bash
   docker ps
   ```

2. **Access the Web GUI:**
   
   Open your browser and navigate to:
   ```
   http://<controller-ip>:5000
   ```

3. **Test the REST API:**
   ```bash
   curl http://<controller-ip>:8000/docs
   ```

4. **Verify Agent connectivity:**
   
   From the Controller, test SSH connectivity to your Agents:
   
   **For Key-Based Auth:**
   ```bash
   ssh -i /path/to/key user@agent-host
   ```
   
   **For Password-Based Auth:**
   ```bash
   ssh user@agent-host
   ```

---

## Troubleshooting

### Agent Issues

**Problem:** Agent containers not running
```bash
# Check logs
docker logs <container-id>

# Restart the agent
sh deployment/userdata.sh
```

### Controller Issues

**Problem:** Services not starting
```bash
# Check Docker logs
docker-compose logs

# Restart services
sudo bash docker_resurrection.sh
```

**Problem:** Cannot connect to Agents
- Verify SSH credentials in `.env` file
- Check firewall rules allow SSH (port 22)
- Verify Agent hosts are reachable from Controller
- Test manual SSH connection

### Authentication Issues

**Problem:** Key-based authentication failing
- Ensure private key has correct permissions (600)
  ```bash
  chmod 600 /path/to/private/key
  ```
- Verify the corresponding public key is in `~/.ssh/authorized_keys` on Agent hosts
- Check SSH_KEY_PATH in `.env` points to the correct key

**Problem:** Password authentication failing
- Verify SSH_PASSWORD is correctly set in `.env`
- Ensure password authentication is enabled on Agent hosts (`/etc/ssh/sshd_config`)

---

## Network Requirements

### Ports Required

**Controller Host:**
- Port 8000: REST API Server
- Port 5000: Web GUI
- Port 22: SSH (outbound to Agents)

**Agent Hosts:**
- Port 22: SSH (inbound from Controller)
- Additional ports as required by CyPerf CE test scenarios

### Firewall Configuration

Ensure the following connectivity:
- Controller → Agents: SSH (port 22)
- Your workstation → Controller: Ports 8000, 5000
- Client Agent ↔ Server Agent: Test traffic ports

---

## Quick Start Summary

### For Agent Hosts (Client & Server):
```bash
git clone https://github.com/ashwinjo/cyperf-ce-all-in-one.git && cd cyperf-ce-all-in-one
sh deployment/userdata.sh
```

### For Controller Host:
```bash
git clone https://github.com/ashwinjo/cyperf-ce-all-in-one.git && cd cyperf-ce-all-in-one
# Edit .env file with your configuration
nano .env
# Deploy controller services
sudo bash docker_resurrection.sh
```

---

## Next Steps

After successful deployment:

1. Access the Web GUI at `http://<controller-ip>:5000`
2. Review the [REST API Documentation](REST_API_DOCUMENTATION.md)
3. Configure your test scenarios
4. Run your first CyPerf CE test

For more information, refer to the [README.md](Readme.md) file.

