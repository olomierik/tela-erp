#!/bin/bash

#############################################################################
# Tela ERP Installation Script for Linux/macOS
# 
# This script automates the installation and setup of Tela ERP
# Usage: ./install.sh [--docker] [--manual] [--dev]
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="${INSTALL_DIR:-.}"
INSTALL_METHOD="${1:---docker}"
NODE_VERSION="22"
POSTGRES_VERSION="16"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check OS
check_os() {
    print_header "Checking Operating System"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_success "macOS detected"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_warning "Node.js not found. Installing..."
        install_nodejs
    else
        NODE_INSTALLED=$(node -v)
        print_success "Node.js $NODE_INSTALLED found"
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Please install Node.js"
        exit 1
    else
        NPM_VERSION=$(npm -v)
        print_success "npm $NPM_VERSION found"
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_warning "Git not found. Installing..."
        if [ "$OS" = "linux" ]; then
            sudo apt-get update && sudo apt-get install -y git
        else
            brew install git
        fi
    else
        print_success "Git found"
    fi
}

# Install Node.js
install_nodejs() {
    if [ "$OS" = "linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        brew install node
    fi
    print_success "Node.js installed"
}

# Install PostgreSQL
install_postgresql() {
    print_header "Installing PostgreSQL"
    
    if [ "$OS" = "linux" ]; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    else
        brew install postgresql
    fi
    
    print_success "PostgreSQL installed"
}

# Install Docker
install_docker() {
    print_header "Installing Docker"
    
    if [ "$OS" = "linux" ]; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    else
        brew install docker
    fi
    
    print_success "Docker installed"
}

# Setup Tela ERP with Docker
setup_docker() {
    print_header "Setting Up Tela ERP with Docker"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found. Installing..."
        install_docker
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose not found. Please install Docker Desktop"
        exit 1
    fi
    
    print_info "Creating environment file..."
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please edit .env with your configuration"
    fi
    
    print_info "Building Docker images..."
    docker-compose build
    
    print_info "Starting services..."
    docker-compose up -d
    
    print_success "Tela ERP is running!"
    print_info "Frontend: http://localhost:3000"
    print_info "API: http://localhost:5000"
    print_info "pgAdmin: http://localhost:5050"
}

# Setup Tela ERP manually
setup_manual() {
    print_header "Setting Up Tela ERP Manually"
    
    # Install PostgreSQL if needed
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL not found. Installing..."
        install_postgresql
    fi
    
    print_info "Installing dependencies..."
    npm install
    
    print_info "Creating environment file..."
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please edit .env with your configuration"
    fi
    
    print_info "Building application..."
    npm run build
    
    print_success "Tela ERP is ready!"
    print_info "To start the application, run: npm start"
}

# Setup development environment
setup_dev() {
    print_header "Setting Up Development Environment"
    
    print_info "Installing dependencies..."
    npm install
    
    print_info "Creating environment file..."
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success ".env file created"
    fi
    
    print_info "Installing pre-commit hooks..."
    npm run prepare || true
    
    print_success "Development environment ready!"
    print_info "To start development server, run: npm run dev"
}

# Main installation flow
main() {
    print_header "Tela ERP Installation Script"
    
    check_os
    check_prerequisites
    
    case $INSTALL_METHOD in
        --docker)
            setup_docker
            ;;
        --manual)
            setup_manual
            ;;
        --dev)
            setup_dev
            ;;
        *)
            print_error "Unknown installation method: $INSTALL_METHOD"
            print_info "Usage: ./install.sh [--docker|--manual|--dev]"
            exit 1
            ;;
    esac
    
    print_header "Installation Complete!"
    print_success "Tela ERP has been successfully installed"
    print_info "For more information, see DEPLOYMENT_GUIDE.md"
}

# Run main function
main "$@"
