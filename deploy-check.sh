#!/bin/bash

# Felicity Deployment Helper Script
# This script helps prepare your application for deployment

echo "🚀 Felicity Deployment Helper"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected structure: /Dass_A1/backend and /Dass_A1/frontend"
    exit 1
fi

echo "✅ Project structure verified"
echo ""

# Backend checks
echo "📦 Checking Backend..."
cd backend

if [ ! -f "package.json" ]; then
    echo "❌ Error: backend/package.json not found"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: backend/.env not found"
    echo "   Copy .env.example to .env and configure it"
else
    echo "✅ Backend .env exists"
fi

if [ ! -f "render.yaml" ]; then
    echo "⚠️  Warning: render.yaml not found (optional for Render deployment)"
else
    echo "✅ render.yaml configured"
fi

# Check if axios is installed
if grep -q '"axios"' package.json; then
    echo "✅ axios installed"
else
    echo "⚠️  Warning: axios not found in package.json"
    echo "   Run: npm install axios"
fi

cd ..

# Frontend checks
echo ""
echo "🎨 Checking Frontend..."
cd frontend

if [ ! -f "package.json" ]; then
    echo "❌ Error: frontend/package.json not found"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: frontend/.env not found"
    echo "   Copy .env.example to .env and set REACT_APP_API_URL"
else
    echo "✅ Frontend .env exists"
    # Check if API URL is set
    if grep -q "REACT_APP_API_URL=http://localhost:5000" .env; then
        echo "   ℹ️  Currently set to localhost (update for production)"
    fi
fi

if [ ! -f "vercel.json" ]; then
    echo "⚠️  Warning: vercel.json not found"
else
    echo "✅ vercel.json configured"
fi

cd ..

# Git checks
echo ""
echo "📂 Checking Git..."

if [ ! -d ".git" ]; then
    echo "⚠️  Git not initialized"
    echo "   Run: git init"
    echo "   Then: git add ."
    echo "   Then: git commit -m 'Initial commit'"
else
    echo "✅ Git initialized"
    
    # Check for uncommitted changes
    if git diff-index --quiet HEAD --; then
        echo "✅ No uncommitted changes"
    else
        echo "⚠️  You have uncommitted changes"
        echo "   Run: git add . && git commit -m 'Update for deployment'"
    fi
fi

# Check for .gitignore
if [ ! -f ".gitignore" ]; then
    echo "⚠️  .gitignore not found"
    echo "   Creating default .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production

# Build outputs
frontend/build/
backend/dist/

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
logs/
*.log
EOF
    echo "✅ .gitignore created"
else
    echo "✅ .gitignore exists"
fi

echo ""
echo "========================================"
echo "📋 Deployment Checklist:"
echo ""
echo "Backend (Render):"
echo "  1. Push code to GitHub"
echo "  2. Create Web Service on Render"
echo "  3. Set environment variables (see DEPLOYMENT_GUIDE.md)"
echo "  4. Wait for deployment"
echo "  5. Run 'node seedAdmin.js' in Render shell"
echo ""
echo "Frontend (Vercel):"
echo "  1. Push code to GitHub (if separate repo)"
echo "  2. Import project on Vercel"
echo "  3. Set REACT_APP_API_URL to your Render URL"
echo "  4. Wait for deployment"
echo ""
echo "📖 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
echo ""
echo "✅ Pre-deployment checks complete!"
