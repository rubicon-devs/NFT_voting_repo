#!/bin/bash
# deploy.sh - Automated deployment script for Movement Vote

echo "🚀 Movement Vote Deployment Script"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
echo "📁 Step 1: Checking project structure..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Project structure verified${NC}"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Check for Vercel CLI
echo "🔧 Step 3: Checking Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error: Failed to install Vercel CLI${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Vercel CLI ready${NC}"
echo ""

# Step 4: Build the project
echo "🔨 Step 4: Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 5: Check environment variables
echo "🔑 Step 5: Environment variables check..."
echo -e "${YELLOW}Make sure you have set these environment variables in Vercel:${NC}"
echo "  - VITE_API_URL (if using separate backend)"
echo "  - DATABASE_URL (if using Vercel serverless functions)"
echo "  - DISCORD_CLIENT_ID"
echo "  - DISCORD_CLIENT_SECRET"
echo "  - TRADEPORT_API_KEY"
echo "  - ADMIN_DISCORD_IDS"
echo ""
read -p "Have you set all required environment variables in Vercel? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please set environment variables before deploying${NC}"
    echo "Run: vercel env add <VARIABLE_NAME>"
    exit 1
fi
echo ""

# Step 6: Deploy to Vercel
echo "🚀 Step 6: Deploying to Vercel..."
echo -e "${YELLOW}Choose deployment type:${NC}"
echo "  1) Development (preview)"
echo "  2) Production"
read -p "Enter choice (1 or 2): " -n 1 -r
echo ""

if [[ $REPLY == "1" ]]; then
    vercel
elif [[ $REPLY == "2" ]]; then
    vercel --prod
else
    echo -e "${RED}❌ Invalid choice${NC}"
    exit 1
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Test your deployment"
echo "  2. Update Discord OAuth redirect URI with your Vercel URL"
echo "  3. Check Vercel logs for any issues"
echo ""
echo "🎉 Your Movement Vote app is now live!"
