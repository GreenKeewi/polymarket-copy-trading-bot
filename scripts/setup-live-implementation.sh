#!/bin/bash

# Live Implementation Setup Script
# This script helps you set up the environment for live trading implementation

set -e

echo "═══════════════════════════════════════════════════"
echo "  Polymarket Bot - Live Implementation Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# Check if running in test mode
if [ -f .env ]; then
    if grep -q "TEST_MODE=false" .env; then
        echo "⚠️  WARNING: TEST_MODE is currently false!"
        echo "   For implementation setup, it should be true."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo "Step 1: Installing Polymarket dependencies..."
echo "─────────────────────────────────────────────────────"

# Check if package.json exists
if [ ! -f package.json ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Install dependencies
echo "Installing @polymarket/clob-client..."
npm install --save @polymarket/clob-client

echo "Installing ethers@^5.7.0..."
npm install --save ethers@^5.7.0

echo "Installing axios..."
npm install --save axios

echo "✅ Dependencies installed"
echo ""

echo "Step 2: Creating configuration files..."
echo "─────────────────────────────────────────────────────"

# Create token mappings config
if [ ! -f config/token-mappings.json ]; then
    mkdir -p config
    cp config/token-mappings.example.json config/token-mappings.json
    echo "✅ Created config/token-mappings.json"
else
    echo "ℹ️  config/token-mappings.json already exists"
fi

# Create live .env backup
if [ -f .env ]; then
    if [ ! -f .env.live.backup ]; then
        cp .env .env.live.backup
        echo "✅ Created .env.live.backup"
    else
        echo "ℹ️  .env.live.backup already exists"
    fi
fi

echo ""

echo "Step 3: Creating logs directory..."
echo "─────────────────────────────────────────────────────"
mkdir -p logs
echo "✅ logs/ directory ready"
echo ""

echo "Step 4: Building project..."
echo "─────────────────────────────────────────────────────"
npm run build
echo "✅ Build successful"
echo ""

echo "═══════════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. 📝 Edit src/services/polymarket/PolymarketClient.ts"
echo "   - Uncomment the import statements"
echo "   - Uncomment the implementation code"
echo "   - Remove the 'throw new Error' lines"
echo ""
echo "2. 🔍 Find Polymarket token IDs for your markets:"
echo "   - Visit https://polymarket.com"
echo "   - Find the markets you want to trade"
echo "   - Extract token IDs from the URLs or API"
echo ""
echo "3. 📝 Update config/token-mappings.json with real token IDs"
echo ""
echo "4. 🧪 Test your implementation:"
echo "   npm run build && npm run test-bot"
echo ""
echo "5. 📖 Follow the checklist:"
echo "   docs/IMPLEMENTATION_CHECKLIST.md"
echo ""
echo "⚠️  REMEMBER: Keep TEST_MODE=true until fully implemented!"
echo "═══════════════════════════════════════════════════"
