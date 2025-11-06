#!/bin/bash

# n8n Setup Script for The Urban Manual
# This script automates the initial setup process

set -e  # Exit on error

echo "🚀 Setting up n8n for The Urban Manual..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose is installed${NC}"
echo ""

# Create Docker network if it doesn't exist
echo "📡 Checking Docker network..."
if ! docker network inspect urban-manual-network &> /dev/null; then
    echo "Creating urban-manual-network..."
    docker network create urban-manual-network
    echo -e "${GREEN}✅ Network created${NC}"
else
    echo -e "${GREEN}✅ Network already exists${NC}"
fi
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env file with your credentials before starting n8n${NC}"
    echo ""
    echo "Required configuration:"
    echo "  - N8N_BASIC_AUTH_USER"
    echo "  - N8N_BASIC_AUTH_PASSWORD"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - POSTGRES_URL"
    echo "  - OPENAI_API_KEY"
    echo "  - GOOGLE_AI_API_KEY"
    echo "  - NEXT_PUBLIC_GOOGLE_API_KEY"
    echo ""

    read -p "Do you want to edit .env now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    else
        echo -e "${YELLOW}⚠️  Remember to edit .env before running 'docker-compose up'${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# Verify required environment variables
echo "🔍 Checking required environment variables..."
source .env

MISSING_VARS=()

if [ -z "$N8N_BASIC_AUTH_USER" ]; then
    MISSING_VARS+=("N8N_BASIC_AUTH_USER")
fi

if [ -z "$N8N_BASIC_AUTH_PASSWORD" ]; then
    MISSING_VARS+=("N8N_BASIC_AUTH_PASSWORD")
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" == "your_supabase_url" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_URL")
fi

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" == "sk-your-openai-api-key" ]; then
    MISSING_VARS+=("OPENAI_API_KEY")
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing or invalid required variables:${NC}"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please edit .env file and run this script again."
    exit 1
fi

echo -e "${GREEN}✅ All required variables configured${NC}"
echo ""

# Start n8n
echo "🐳 Starting n8n..."
docker-compose up -d

# Wait for n8n to be ready
echo "⏳ Waiting for n8n to start..."
sleep 5

# Check if n8n is running
if docker ps | grep -q urban-manual-n8n; then
    echo -e "${GREEN}✅ n8n is running!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 n8n setup complete!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📍 Access n8n at: http://localhost:5678"
    echo ""
    echo "🔐 Login credentials:"
    echo "   Username: $N8N_BASIC_AUTH_USER"
    echo "   Password: $N8N_BASIC_AUTH_PASSWORD"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Open http://localhost:5678 in your browser"
    echo "   2. Import workflows from workflows/ directory"
    echo "   3. Configure credentials (Supabase, Gmail, etc.)"
    echo "   4. Test workflows"
    echo ""
    echo "📖 Full documentation: n8n/README.md"
    echo ""
    echo "🔧 Useful commands:"
    echo "   View logs:    docker-compose logs -f"
    echo "   Stop n8n:     docker-compose down"
    echo "   Restart n8n:  docker-compose restart"
    echo ""
else
    echo -e "${RED}❌ n8n failed to start${NC}"
    echo "Check logs: docker-compose logs n8n"
    exit 1
fi
