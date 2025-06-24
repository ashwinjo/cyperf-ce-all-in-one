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

## License

MIT
