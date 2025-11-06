#!/bin/bash

# Production Deployment Script
# Deploys ML Service to Railway and Next.js to Vercel

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     🚀 Urban Manual - Production Deployment           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to print status
print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
print_step "Checking prerequisites..."

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not installed"
    echo ""
    echo "Install with:"
    echo "  macOS:   brew install railway"
    echo "  Linux:   curl -fsSL https://railway.app/install.sh | sh"
    echo ""
    exit 1
fi
print_success "Railway CLI installed"

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not installed"
    echo ""
    echo "Install with: npm i -g vercel"
    echo ""
    exit 1
fi
print_success "Vercel CLI installed"

# Check git
if ! command -v git &> /dev/null; then
    print_error "Git not installed"
    exit 1
fi
print_success "Git installed"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Deploy ML Service
print_step "Step 1: Deploy ML Service to Railway"
echo ""

read -p "Deploy ML Service? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Deploying ML Service..."
    cd ml-service

    if [ -f "deploy-railway.sh" ]; then
        ./deploy-railway.sh
    else
        print_warning "deploy-railway.sh not found, deploying manually..."
        railway up
    fi

    echo ""
    print_success "ML Service deployed!"
    echo ""
    print_warning "IMPORTANT: Copy your Railway URL!"
    echo "You'll need it for Vercel deployment."
    echo ""
    read -p "Press Enter when you've copied the URL..."

    cd ..
else
    print_warning "Skipping ML Service deployment"
    print_warning "Make sure ML_SERVICE_URL is set in Vercel!"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 2: Deploy to Vercel
print_step "Step 2: Deploy Next.js to Vercel"
echo ""

read -p "Deploy to Vercel? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if logged in
    if ! vercel whoami &> /dev/null; then
        print_step "Logging in to Vercel..."
        vercel login
    fi
    print_success "Logged in to Vercel"

    echo ""
    print_step "Deploying to Vercel..."
    vercel --prod

    echo ""
    print_success "Deployed to Vercel!"
else
    print_warning "Skipping Vercel deployment"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 3: Verification
print_step "Step 3: Verification Checklist"
echo ""

echo "Please verify the following:"
echo ""
echo "□ ML Service health check passes"
echo "□ Vercel deployment successful"
echo "□ Environment variables set in Vercel Dashboard"
echo "□ Homepage loads correctly"
echo "□ Google Trends section appears"
echo "□ Search functionality works"
echo "□ No console errors"
echo ""

read -p "Run automated verification? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_step "Running verification tests..."

    # Get Vercel URL
    VERCEL_URL=$(vercel inspect --prod 2>/dev/null | grep -o 'https://[^ ]*' | head -1)

    if [ ! -z "$VERCEL_URL" ]; then
        echo ""
        print_step "Testing Vercel deployment..."
        if curl -f -s -o /dev/null "$VERCEL_URL"; then
            print_success "Vercel deployment responding"
        else
            print_error "Vercel deployment not responding"
        fi

        print_step "Testing Google Trends API..."
        if curl -f -s -o /dev/null "$VERCEL_URL/api/trending/google?type=trending-searches"; then
            print_success "Google Trends API working"
        else
            print_warning "Google Trends API may need ML service configuration"
        fi
    else
        print_warning "Could not get Vercel URL automatically"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Summary
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                🎉 Deployment Complete!                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo "Next steps:"
echo ""
echo "1. Set environment variables in Vercel Dashboard:"
echo "   https://vercel.com/dashboard"
echo ""
echo "2. Verify deployment:"
echo "   - Check homepage loads"
echo "   - Test Google Trends section"
echo "   - Check browser console for errors"
echo ""
echo "3. Configure custom domain (optional):"
echo "   - Vercel Dashboard → Settings → Domains"
echo ""
echo "4. Enable monitoring:"
echo "   - Vercel Analytics"
echo "   - Uptime monitoring"
echo "   - Error tracking"
echo ""

echo "📚 Documentation:"
echo "   - Full guide: DEPLOY_PRODUCTION.md"
echo "   - ML deployment: DEPLOY_ML_SERVICE.md"
echo ""

echo -e "${GREEN}Happy launching! 🚀${NC}"
