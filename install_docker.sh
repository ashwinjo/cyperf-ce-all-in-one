#!/bin/bash

# Universal Docker Installation Script for Linux
# Supports: Ubuntu, Debian, CentOS, RHEL, Fedora, Amazon Linux, Arch Linux, openSUSE

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
        VERSION=$(cat /etc/redhat-release | grep -oE '[0-9]+\.[0-9]+' | head -1)
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
        VERSION=$(cat /etc/debian_version)
    else
        log_error "Cannot detect Linux distribution"
        exit 1
    fi
    
    log_info "Detected distribution: $DISTRO $VERSION"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root. This is not recommended for security reasons."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check if Docker is already installed
check_docker_installed() {
    if command -v docker &> /dev/null; then
        log_warning "Docker is already installed: $(docker --version)"
        read -p "Do you want to reinstall/update Docker? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Docker installation skipped"
            exit 0
        fi
    fi
}

# Install Docker on Ubuntu/Debian
install_docker_debian() {
    log_info "Installing Docker on Ubuntu/Debian..."
    
    # Update package index
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index again
    sudo apt-get update
    
    # Install Docker Engine
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    log_success "Docker installed successfully on Ubuntu/Debian"
}

# Install Docker on CentOS/RHEL/Fedora
install_docker_redhat() {
    log_info "Installing Docker on CentOS/RHEL/Fedora..."
    
    # Install prerequisites
    if command -v dnf &> /dev/null; then
        sudo dnf install -y dnf-plugins-core
    else
        sudo yum install -y yum-utils
    fi
    
    # Add Docker repository
    if [ "$DISTRO" = "fedora" ]; then
        sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    else
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    fi
    
    # Install Docker Engine
    if command -v dnf &> /dev/null; then
        sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    else
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    
    log_success "Docker installed successfully on CentOS/RHEL/Fedora"
}

# Install Docker on Amazon Linux
install_docker_amazon() {
    log_info "Installing Docker on Amazon Linux..."
    
    # Update package index
    sudo yum update -y
    
    # Install Docker
    sudo yum install -y docker
    
    log_success "Docker installed successfully on Amazon Linux"
}

# Install Docker on Arch Linux
install_docker_arch() {
    log_info "Installing Docker on Arch Linux..."
    
    # Update package database
    sudo pacman -Sy
    
    # Install Docker
    sudo pacman -S --noconfirm docker docker-compose
    
    log_success "Docker installed successfully on Arch Linux"
}

# Install Docker on openSUSE
install_docker_opensuse() {
    log_info "Installing Docker on openSUSE..."
    
    # Add Docker repository
    sudo zypper addrepo https://download.docker.com/linux/sles/docker-ce.repo
    
    # Install Docker
    sudo zypper install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    log_success "Docker installed successfully on openSUSE"
}

# Start and enable Docker service
start_docker_service() {
    log_info "Starting Docker service..."
    
    # Start Docker service
    sudo systemctl start docker
    
    # Enable Docker to start on boot
    sudo systemctl enable docker
    
    # Add current user to docker group (if not root)
    if [ "$EUID" -ne 0 ]; then
        log_info "Adding current user to docker group..."
        sudo usermod -aG docker $USER
        log_warning "You need to log out and log back in for group changes to take effect"
    fi
    
    log_success "Docker service started and enabled"
}

# Verify Docker installation
verify_docker() {
    log_info "Verifying Docker installation..."
    
    # Check Docker version
    docker --version
    
    # Test Docker with hello-world
    log_info "Testing Docker with hello-world container..."
    sudo docker run --rm hello-world
    
    log_success "Docker installation verified successfully!"
}

# Install Docker Compose (standalone)
install_docker_compose() {
    log_info "Installing Docker Compose..."
    
    # Get latest version
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    # Download and install
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose installed: $(docker-compose --version)"
}

# Main installation function
install_docker() {
    case $DISTRO in
        ubuntu|debian)
            install_docker_debian
            ;;
        centos|rhel|fedora)
            install_docker_redhat
            ;;
        amzn)
            install_docker_amazon
            ;;
        arch)
            install_docker_arch
            ;;
        opensuse*|sles)
            install_docker_opensuse
            ;;
        *)
            log_error "Unsupported distribution: $DISTRO"
            log_info "Supported distributions: Ubuntu, Debian, CentOS, RHEL, Fedora, Amazon Linux, Arch Linux, openSUSE"
            exit 1
            ;;
    esac
}

# Main script execution
main() {
    echo "=========================================="
    echo "    Universal Docker Installation Script"
    echo "=========================================="
    echo
    
    # Pre-installation checks
    check_root
    detect_distro
    check_docker_installed
    
    # Install Docker
    install_docker
    
    # Start Docker service
    start_docker_service
    
    # Verify installation
    verify_docker
    
    # Install Docker Compose (optional)
    read -p "Do you want to install Docker Compose? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "Docker Compose installation skipped"
    else
        install_docker_compose
    fi
    
    echo
    echo "=========================================="
    log_success "Docker installation completed!"
    echo "=========================================="
    echo
    echo "Next steps:"
    echo "1. If you're not root, log out and log back in to use Docker without sudo"
    echo "2. Test Docker: docker run hello-world"
    echo "3. Test Docker Compose: docker-compose --version"
    echo
}

# Run main function
main "$@"
