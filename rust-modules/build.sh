#!/bin/bash
# Build script for Rust modules with Python bindings
# This script builds wheels for production deployment

set -e

echo "🦀 Building Rust modules for production..."

# Check dependencies
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo not found. Please install Rust: https://rustup.rs/"
    exit 1
fi

if ! command -v maturin &> /dev/null; then
    echo "📦 Installing maturin..."
    pip install maturin
fi

# Build workspace
echo "📦 Building Rust workspace..."
cd "$(dirname "$0")"
cargo build --release

# Build Python wheels for each module
echo ""
echo "🐍 Building Python wheels..."

# Build embedding-processor
echo ""
echo "📦 Building embedding-processor..."
cd embedding-processor
maturin build --release
EMBEDDING_WHEEL=$(ls -t target/wheels/*.whl | head -n1)
echo "✅ Built: $EMBEDDING_WHEEL"

# Build vector-search
echo ""
echo "📦 Building vector-search..."
cd ../vector-search
maturin build --release
VECTOR_WHEEL=$(ls -t target/wheels/*.whl | head -n1)
echo "✅ Built: $VECTOR_WHEEL"

cd ..

echo ""
echo "✅ All modules built successfully!"
echo ""
echo "📦 Wheels available in target/wheels/"
echo ""
echo "To install locally:"
echo "  pip install $EMBEDDING_WHEEL"
echo "  pip install $VECTOR_WHEEL"
echo ""
echo "To deploy to production:"
echo "  1. Copy wheels to ml-service/wheels/"
echo "  2. Update ml-service/requirements.txt"
echo "  3. Rebuild Docker image"
