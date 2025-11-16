#!/bin/bash

# Urban Manual - Development Environment Setup Script
# This script helps set up the development environment

set -e

echo "🏙️  Urban Manual - Development Setup"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js version is too old (found v$NODE_VERSION)${NC}"
    echo "Please upgrade to Node.js 20 or higher"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) is installed${NC}"

# Check if npm is installed
echo "📦 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v) is installed${NC}"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
npm install

# Check for .env.local file
echo ""
echo "🔐 Checking environment configuration..."
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local file not found${NC}"
    echo "Creating .env.local from .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✓ Created .env.local${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: You need to configure your environment variables in .env.local${NC}"
        echo "Required variables:"
        echo "  - NEXT_PUBLIC_SUPABASE_URL"
        echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "  - POSTGRES_URL"
        echo "  - PAYLOAD_SECRET"
        echo ""
        echo "See .env.example for all available options"
    else
        echo -e "${RED}❌ .env.example file not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env.local exists${NC}"
fi

# Check for required environment variables
echo ""
echo "🔍 Validating environment variables..."
source .env.local

MISSING_VARS=()

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_URL")
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
fi

if [ -z "$POSTGRES_URL" ]; then
    MISSING_VARS+=("POSTGRES_URL")
fi

if [ -z "$PAYLOAD_SECRET" ]; then
    MISSING_VARS+=("PAYLOAD_SECRET")
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please update .env.local with your Supabase credentials"
else
    echo -e "${GREEN}✓ Required environment variables are set${NC}"
fi

# Optional: Check for Docker (for ML service)
echo ""
echo "🐳 Checking Docker (optional)..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker is installed${NC}"
    echo "You can run the ML service with: cd ml-service && docker-compose up"
else
    echo -e "${YELLOW}⚠️  Docker not found (optional)${NC}"
    echo "Install Docker to run the ML service locally"
fi

# Summary
echo ""
echo "===================================="
echo "✨ Setup Complete!"
echo "===================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your environment variables in .env.local"
echo "   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, POSTGRES_URL, PAYLOAD_SECRET"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "4. (Optional) Run the ML service:"
echo "   cd ml-service && docker-compose up"
echo ""
echo "For more information, see:"
echo "  - README.md"
echo "  - INFRASTRUCTURE.md"
echo "  - .env.example"
echo ""
