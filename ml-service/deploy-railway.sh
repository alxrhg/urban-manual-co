#!/bin/bash

# Deploy ML Service to Railway
# This script automates the Railway deployment process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     🚂 Railway ML Service Deployment Script           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗${NC} Railway CLI is not installed."
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install railway"
    echo "  Linux:   curl -fsSL https://railway.app/install.sh | sh"
    echo "  Windows: iwr https://railway.app/install.ps1 | iex"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Railway CLI is installed"

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} You're not logged in to Railway."
    echo -e "${BLUE}ℹ${NC} Opening browser for authentication..."
    railway login
fi

echo -e "${GREEN}✓${NC} Logged in to Railway"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠${NC} No .env file found in ml-service/"
    echo -e "${BLUE}ℹ${NC} Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env file"
        echo -e "${YELLOW}⚠${NC} Please edit ml-service/.env with your credentials before continuing."
        echo ""
        read -p "Press Enter when ready to continue..."
    else
        echo -e "${RED}✗${NC} No .env.example found"
        exit 1
    fi
fi

# Read environment variables from .env
echo -e "${BLUE}ℹ${NC} Reading environment variables from .env..."
source .env

# Check if project exists
if railway status &> /dev/null; then
    echo -e "${GREEN}✓${NC} Railway project found"
    echo ""
    read -p "Deploy to existing project? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ${NC} Creating new Railway project..."
        railway init
    fi
else
    echo -e "${BLUE}ℹ${NC} No Railway project found. Creating new one..."
    railway init
fi

echo ""
echo -e "${BLUE}ℹ${NC} Setting environment variables..."

# Set environment variables
railway variables set \
    ML_SERVICE_HOST="0.0.0.0" \
    ML_SERVICE_PORT="8000" \
    LOG_LEVEL="INFO" \
    LIGHTFM_EPOCHS="50" \
    LIGHTFM_THREADS="4" \
    PROPHET_SEASONALITY_MODE="multiplicative" \
    CACHE_TTL_HOURS="24" \
    MAX_REQUESTS_PER_MINUTE="60"

# Set secrets (if defined in .env)
if [ ! -z "$SUPABASE_URL" ]; then
    railway variables set SUPABASE_URL="$SUPABASE_URL"
fi

if [ ! -z "$SUPABASE_ANON_KEY" ]; then
    railway variables set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
fi

if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    railway variables set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
fi

if [ ! -z "$POSTGRES_URL" ]; then
    railway variables set POSTGRES_URL="$POSTGRES_URL"
fi

echo -e "${GREEN}✓${NC} Environment variables set"
echo ""

# Generate domain if not exists
echo -e "${BLUE}ℹ${NC} Generating public domain..."
railway domain 2>/dev/null || echo "Domain already exists"

# Deploy
echo ""
echo -e "${BLUE}ℹ${NC} Deploying to Railway..."
railway up

echo ""
echo -e "${GREEN}✓${NC} Deployment complete!"
echo ""

# Get the URL
RAILWAY_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$RAILWAY_URL" ]; then
    echo -e "${GREEN}✓${NC} Your ML Service is available at:"
    echo -e "  ${BLUE}$RAILWAY_URL${NC}"
    echo ""
    echo "Testing health endpoint..."
    sleep 5
    if curl -f "$RAILWAY_URL/health" &> /dev/null; then
        echo -e "${GREEN}✓${NC} ML Service is responding!"
        echo ""
        echo "📖 View API docs at: ${BLUE}$RAILWAY_URL/docs${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Copy this URL: $RAILWAY_URL"
        echo "2. Add to your main .env file:"
        echo "   ML_SERVICE_URL=$RAILWAY_URL"
        echo "3. Run: npm run dev"
        echo ""
    else
        echo -e "${YELLOW}⚠${NC} Service is still starting up. Try again in a minute:"
        echo "   curl $RAILWAY_URL/health"
    fi
else
    echo -e "${YELLOW}⚠${NC} Couldn't get Railway URL automatically."
    echo "Run: railway status"
    echo "Then copy the URL to your .env file"
fi

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
