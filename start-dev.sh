#!/bin/bash

# Urban Manual - Development Environment Launcher
# This script helps you quickly start the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check Docker
    if command -v docker &> /dev/null; then
        print_success "Docker is installed"
    else
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose is installed"
    else
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js $(node --version) is installed"
    else
        print_warning "Node.js is not installed. Some features may not work."
    fi

    echo ""
}

# Check environment files
check_env_files() {
    print_info "Checking environment files..."

    if [ ! -f ".env" ]; then
        print_warning ".env file not found"
        if [ -f ".env.example" ]; then
            print_info "Creating .env from .env.example..."
            cp .env.example .env
            print_success "Created .env file. Please edit it with your credentials."
        else
            print_error ".env.example not found"
        fi
    else
        print_success ".env file exists"
    fi

    if [ ! -f "ml-service/.env" ]; then
        print_warning "ml-service/.env file not found"
        if [ -f "ml-service/.env.example" ]; then
            print_info "Creating ml-service/.env from ml-service/.env.example..."
            cp ml-service/.env.example ml-service/.env
            print_success "Created ml-service/.env file. Please edit it with your credentials."
        else
            print_error "ml-service/.env.example not found"
        fi
    else
        print_success "ml-service/.env file exists"
    fi

    echo ""
}

# Menu
show_menu() {
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║     🚀 Urban Manual - Development Launcher             ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "Select an option:"
    echo ""
    echo "  1) 🐳 Start all services with Docker (Recommended)"
    echo "  2) 🌐 Start Next.js only (manual setup)"
    echo "  3) 🤖 Start ML Service only (Docker)"
    echo "  4) 🛑 Stop all services"
    echo "  5) 📊 View service logs"
    echo "  6) 🧹 Clean Docker containers and volumes"
    echo "  7) 📖 View API documentation"
    echo "  8) 🧪 Test services"
    echo "  9) 📚 Open LOCAL_SETUP.md guide"
    echo "  0) Exit"
    echo ""
}

# Start all services
start_all() {
    print_info "Starting all services with Docker..."
    echo ""
    docker-compose -f docker-compose.dev.yml up --build
}

# Start Next.js only
start_nextjs() {
    print_info "Starting Next.js development server..."
    echo ""

    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi

    npm run dev
}

# Start ML Service only
start_ml() {
    print_info "Starting ML Service with Docker..."
    echo ""
    cd ml-service
    docker-compose up --build
}

# Stop all services
stop_all() {
    print_info "Stopping all services..."
    docker-compose -f docker-compose.dev.yml down
    print_success "All services stopped"
}

# View logs
view_logs() {
    print_info "Streaming Docker logs (Ctrl+C to exit)..."
    echo ""
    docker-compose -f docker-compose.dev.yml logs -f
}

# Clean Docker
clean_docker() {
    print_warning "This will remove all containers and volumes. Are you sure? (y/N)"
    read -r response

    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning Docker containers and volumes..."
        docker-compose -f docker-compose.dev.yml down -v
        print_success "Docker cleanup complete"
    else
        print_info "Cleanup cancelled"
    fi
}

# View API docs
view_docs() {
    print_info "Opening API documentation..."

    # Check if ML service is running
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        if command -v open &> /dev/null; then
            open http://localhost:8000/docs
        elif command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:8000/docs
        else
            print_info "Please open http://localhost:8000/docs in your browser"
        fi
        print_success "API docs should open in your browser"
    else
        print_error "ML Service is not running. Start services first."
    fi
}

# Test services
test_services() {
    print_info "Testing services..."
    echo ""

    # Test ML Service
    print_info "Testing ML Service..."
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "ML Service is running (http://localhost:8000)"
    else
        print_error "ML Service is not responding (http://localhost:8000)"
    fi

    # Test Next.js
    print_info "Testing Next.js..."
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Next.js is running (http://localhost:3000)"
    else
        print_error "Next.js is not responding (http://localhost:3000)"
    fi

    echo ""
    print_info "Test complete"
}

# Open setup guide
open_guide() {
    if command -v open &> /dev/null; then
        open LOCAL_SETUP.md
    elif command -v xdg-open &> /dev/null; then
        xdg-open LOCAL_SETUP.md
    else
        cat LOCAL_SETUP.md
    fi
}

# Main loop
main() {
    check_prerequisites
    check_env_files

    while true; do
        show_menu
        read -p "Enter your choice [0-9]: " choice

        case $choice in
            1) start_all ;;
            2) start_nextjs ;;
            3) start_ml ;;
            4) stop_all ;;
            5) view_logs ;;
            6) clean_docker ;;
            7) view_docs ;;
            8) test_services ;;
            9) open_guide ;;
            0)
                print_info "Goodbye! 👋"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac

        if [ "$choice" != "5" ]; then
            echo ""
            read -p "Press Enter to continue..."
        fi
    done
}

# Run main function
main
