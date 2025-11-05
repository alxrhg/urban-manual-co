#!/bin/bash

# Urban Manual iOS - Quick Setup Script
# This script helps set up the Xcode project

echo "🚀 Urban Manual iOS - Setup"
echo "======================================"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script must run on macOS"
    echo ""
    echo "Options:"
    echo "1. Use MacinCloud: https://www.macincloud.com"
    echo "2. Use MacStadium: https://www.macstadium.com"
    echo "3. Use GitHub Actions (see .github/workflows/ios.yml)"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode not installed"
    echo ""
    echo "Install from: https://apps.apple.com/app/xcode/id497799835"
    exit 1
fi

echo "✅ macOS detected"
echo "✅ Xcode installed: $(xcodebuild -version | head -n1)"
echo ""

# Check if in correct directory
if [[ ! -f "Package.swift" ]]; then
    echo "❌ Error: Not in UrbanManual-iOS directory"
    echo ""
    echo "Run: cd urban-manual/UrbanManual-iOS"
    exit 1
fi

echo "✅ In correct directory"
echo ""

# Ask for Supabase credentials
echo "📝 Supabase Configuration"
echo "======================================"
read -p "Enter Supabase URL: " SUPABASE_URL
read -p "Enter Supabase Anon Key: " SUPABASE_KEY
echo ""

# Update Configuration.swift
if [[ -f "Core/Configuration.swift" ]]; then
    echo "Updating Configuration.swift..."

    # Backup original
    cp Core/Configuration.swift Core/Configuration.swift.bak

    # Update values
    sed -i '' "s|https://your-project.supabase.co|$SUPABASE_URL|g" Core/Configuration.swift
    sed -i '' "s|your-anon-key|$SUPABASE_KEY|g" Core/Configuration.swift

    echo "✅ Configuration updated"
else
    echo "⚠️  Warning: Configuration.swift not found"
fi

echo ""
echo "🎉 Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Open project: open Package.swift"
echo "2. Wait for SPM to resolve dependencies"
echo "3. Select scheme: UrbanManual"
echo "4. Select device: iPhone 15 Pro (Simulator)"
echo "5. Press ⌘R to run"
echo ""
echo "Or manually open in Xcode and follow PROJECT_SETUP.md"
echo ""

# Ask if user wants to open Xcode
read -p "Open in Xcode now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening Xcode..."
    open Package.swift
    echo "✅ Xcode opened!"
else
    echo "Run 'open Package.swift' when ready"
fi

echo ""
echo "📚 Documentation:"
echo "- Setup Guide: SETUP_GUIDE.md"
echo "- Backend Integration: BACKEND_INTEGRATION.md"
echo "- Project Setup: PROJECT_SETUP.md"
echo ""
echo "Happy coding! 🚀"
