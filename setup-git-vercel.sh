#!/bin/bash
# setup-git-vercel.sh - Quick setup script for Git and Vercel

echo "🚀 Movement Vote - Git & Vercel Setup"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install Git first.${NC}"
    echo "Visit: https://git-scm.com/downloads"
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not found. Installing...${NC}"
    echo "Visit: https://cli.github.com/ to install gh CLI"
    echo "Or continue manually with GitHub website"
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Initialize git if not already initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
else
    echo -e "${YELLOW}ℹ️  Git already initialized${NC}"
fi

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/
.vercel

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Vercel
.vercel
EOF
    echo -e "${GREEN}✓ .gitignore created${NC}"
else
    echo -e "${YELLOW}ℹ️  .gitignore already exists${NC}"
fi

# Create .env.example if it doesn't exist
if [ ! -f .env.example ]; then
    echo "📝 Creating .env.example..."
    cat > .env.example << 'EOF'
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
DISCORD_GUILD_ID=your_server_id_here
DISCORD_REQUIRED_ROLE_IDS=role_id_1,role_id_2

# Tradeport API
TRADEPORT_API_KEY=your_api_key_here
TRADEPORT_BASE_URL=https://api.tradeport.xyz

# Admin
ADMIN_DISCORD_IDS=admin_discord_id_1,admin_discord_id_2

# Session
SESSION_SECRET=generate_random_secret_here

# Client URL
CLIENT_URL=https://your-app.vercel.app
EOF
    echo -e "${GREEN}✓ .env.example created${NC}"
else
    echo -e "${YELLOW}ℹ️  .env.example already exists${NC}"
fi

echo ""
echo "📋 Next steps:"
echo ""
echo "1. Install dependencies:"
echo "   ${YELLOW}npm install${NC}"
echo ""
echo "2. Create GitHub repository:"
echo "   ${YELLOW}gh repo create movement-vote --public --source=. --remote=origin${NC}"
echo "   Or visit: https://github.com/new"
echo ""
echo "3. Commit and push your code:"
echo "   ${YELLOW}git add .${NC}"
echo "   ${YELLOW}git commit -m \"Initial commit\"${NC}"
echo "   ${YELLOW}git push -u origin main${NC}"
echo ""
echo "4. Deploy to Vercel:"
echo "   • Go to https://vercel.com/new"
echo "   • Import your GitHub repository"
echo "   • Add environment variables"
echo "   • Deploy!"
echo ""
echo "5. Set up database:"
echo "   ${YELLOW}vercel postgres create${NC}"
echo "   ${YELLOW}psql \$DATABASE_URL < database/schema.sql${NC}"
echo ""
echo -e "${GREEN}Setup script complete!${NC}"
echo ""
echo "For detailed instructions, see: GIT_VERCEL_WORKFLOW.md"
