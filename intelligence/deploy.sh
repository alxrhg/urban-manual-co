#!/bin/bash
set -e

echo "🚀 Deploying Urban Manual Intelligence to Modal..."

# Check if modal is installed
if ! command -v modal &> /dev/null; then
    echo "Installing Modal CLI..."
    pip3 install modal
fi

# Check if already authenticated
if ! modal token current &> /dev/null; then
    echo "Please run: modal setup"
    echo "Or set token manually: modal token set --token-id <id> --token-secret <secret>"
    exit 1
fi

# Create volume if it doesn't exist
echo "Creating model storage volume..."
modal volume create urban-manual-models 2>/dev/null || echo "Volume already exists"

# Check for secrets
echo "Checking secrets..."
if ! modal secret list | grep -q "urban-manual-secrets"; then
    echo ""
    echo "⚠️  Please create secrets first:"
    echo "modal secret create urban-manual-secrets \\"
    echo "  SUPABASE_URL=<your-supabase-url> \\"
    echo "  SUPABASE_SERVICE_ROLE_KEY=<your-service-key>"
    echo ""
    exit 1
fi

# Deploy
echo "Deploying..."
cd "$(dirname "$0")"
modal deploy api/endpoints.py

echo ""
echo "✅ Deployment complete!"
echo "Your endpoints are now live on Modal."
