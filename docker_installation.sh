#!/bin/bash
set -e

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error_exit() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_prerequisites() {
    log "Checking system prerequisites..."
    
    # Check for sudo/root access
    if [ "$(id -u)" -ne 0 ] && ! command -v sudo &> /dev/null; then
        error_exit "This script requires either root access or sudo. Please install sudo or run as root."
    fi

    # Check for curl
    if ! command -v curl &> /dev/null; then
        log "Installing curl..."
        if command -v apt &> /dev/null; then
            sudo apt update && sudo apt install -y curl
        elif command -v yum &> /dev/null; then
            sudo yum install -y curl
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y curl
        elif command -v brew &> /dev/null; then
            brew install curl
        else
            error_exit "Could not install curl. Please install it manually."
        fi
    fi

    # Check for required system tools
    for tool in wget gpg; do
        if ! command -v $tool &> /dev/null; then
            log "Installing $tool..."
            if command -v apt &> /dev/null; then
                sudo apt update && sudo apt install -y $tool
            elif command -v yum &> /dev/null; then
                sudo yum install -y $tool
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y $tool
            elif command -v brew &> /dev/null; then
                brew install $tool
            else
                warn "$tool is not installed and could not be installed automatically."
            fi
        fi
    done
}

detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif command -v apt &> /dev/null; then
        echo "debian"
    elif command -v yum &> /dev/null; then
        echo "redhat"
    elif command -v dnf &> /dev/null; then
        echo "fedora"
    else
        echo "unknown"
    fi
}

install_docker_macos() {
    log "Installing Docker for macOS..."
    if ! command -v brew &> /dev/null; then
        error_exit "Homebrew is required for macOS installation. Please install it first: https://brew.sh"
    fi
    
    brew install --cask docker
    if [ ! -d "/Applications/Docker.app" ]; then
        error_exit "Docker installation failed. Please install manually from https://www.docker.com/products/docker-desktop"
    fi
    
    log "Starting Docker Desktop..."
    open -a Docker
    
    # Wait for Docker to start
    log "Waiting for Docker to start..."
    for i in {1..30}; do
        if docker info &>/dev/null; then
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
}

install_docker_debian() {
    log "Installing Docker for Debian/Ubuntu..."
    
    # Install prerequisites
    sudo apt-get update
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add the repository to Apt sources
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker_redhat() {
    log "Installing Docker for RHEL/CentOS..."
    
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker_fedora() {
    log "Installing Docker for Fedora..."
    
    sudo dnf -y install dnf-plugins-core
    sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

verify_docker_installation() {
    log "Verifying Docker installation..."
    
    # Check Docker version
    if ! docker --version; then
        error_exit "Docker installation verification failed"
    fi
    
    # Check Docker Compose version
    if ! docker compose version; then
        error_exit "Docker Compose installation verification failed"
    fi
    
    # Check Docker daemon
    if ! docker info &>/dev/null; then
        if [[ "$OS_TYPE" != "macos" ]]; then
            log "Starting Docker daemon..."
            sudo systemctl enable docker
            sudo systemctl start docker
        else
            warn "Please ensure Docker Desktop is running"
        fi
    fi
    
    # Verify Docker works
    log "Testing Docker functionality..."
    if ! docker run hello-world; then
        error_exit "Docker test failed. Please check the Docker daemon status."
    fi
}

setup_docker_permissions() {
    if [[ "$OS_TYPE" != "macos" ]]; then
        log "Setting up Docker permissions..."
        if ! groups | grep -q docker; then
            sudo groupadd -f docker
            sudo usermod -aG docker $USER
            warn "Please log out and back in for Docker group changes to take effect"
        fi
    fi
}

# Main installation process
log "Starting Docker installation script..."

# Detect OS
OS_TYPE=$(detect_os)
log "Detected OS type: $OS_TYPE"

# Check prerequisites
check_prerequisites

# Install Docker based on OS
case $OS_TYPE in
    "macos")
        install_docker_macos
        ;;
    "debian")
        install_docker_debian
        ;;
    "redhat")
        install_docker_redhat
        ;;
    "fedora")
        install_docker_fedora
        ;;
    *)
        error_exit "Unsupported operating system"
        ;;
esac

# Verify installation
verify_docker_installation

# Setup permissions
setup_docker_permissions

success "Docker and Docker Compose have been successfully installed!"
log "Docker version: $(docker --version)"
log "Docker Compose version: $(docker compose version)"

if [[ "$OS_TYPE" != "macos" ]]; then
    warn "You may need to log out and back in for Docker group changes to take effect"
fi

log "Installation complete! 🎉"