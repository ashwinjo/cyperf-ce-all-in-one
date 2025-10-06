#!/bin/bash
set -e

# Function to print messages
log() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

error_exit() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
    exit 1
}

log "Checking if Docker is installed..."

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    log "Docker is already installed."
    docker --version
else
    log "Docker not found. Installing Docker..."

    # Update the apt package index
    sudo apt-get update -y || error_exit "Failed to update package index."

    # Install required packages
    sudo apt-get install -y ca-certificates curl gnupg lsb-release || error_exit "Failed to install prerequisites."

    # Add Docker’s official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg || error_exit "Failed to download Docker GPG key."
    fi
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add the Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Update and install Docker Engine
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || error_exit "Failed to install Docker."

    log "Docker installation completed successfully."
    
    # Enable and start Docker
    sudo systemctl enable docker
    sudo systemctl start docker

    log "Verifying Docker installation..."
    docker --version || error_exit "Docker verification failed."

    log "Docker installed and running successfully."
fi
