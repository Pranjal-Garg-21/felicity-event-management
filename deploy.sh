#!/bin/bash

echo "🚀 Felicity Deployment Helper"
echo "=============================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Felicity Event Management System"
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Create a GitHub repository at: https://github.com/new"
echo "   Name it: felicity-event-management"
echo ""
echo "2. Run these commands to push:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/felicity-event-management.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Deploy Backend on Render:"
echo "   → Go to https://render.com"
echo "   → New + → Web Service"
echo "   → Connect your GitHub repo"
echo "   → Root Directory: backend"
echo "   → Build Command: npm install"
echo "   → Start Command: npm start"
echo "   → Add environment variables (see DEPLOYMENT_GUIDE.md)"
echo ""
echo "4. Deploy Frontend on Vercel:"
echo "   → Go to https://vercel.com"
echo "   → New Project → Import your GitHub repo"
echo "   → Root Directory: frontend"
echo "   → Add environment variable: REACT_APP_API_URL=<your-render-url>"
echo ""
echo "5. Update deployment.txt with your URLs"
echo ""
