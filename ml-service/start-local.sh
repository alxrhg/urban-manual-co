#!/bin/bash
# Quick start script for ML service local development

set -e

echo "🚀 Starting Urban Manual ML Service..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="3.11"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Python $REQUIRED_VERSION or higher is required. You have Python $PYTHON_VERSION"
    exit 1
fi

echo "✅ Python $PYTHON_VERSION detected"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo ""
echo "📥 Installing dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt

echo "✅ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  Please edit .env and add your DATABASE_URL (Supabase connection string)"
    echo ""
    read -p "Press enter to continue after editing .env, or Ctrl+C to exit..."
fi

# Start the service
echo "🎯 Starting ML service on http://localhost:8000..."
echo ""
echo "Available endpoints:"
echo "  - Health check: http://localhost:8000/health"
echo "  - API docs: http://localhost:8000/docs"
echo "  - Recommendations: http://localhost:8000/api/recommend/collaborative"
echo "  - Forecasting: http://localhost:8000/api/forecast/demand"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

# Start uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
