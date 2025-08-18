#!/bin/bash

# Auto update script - commit, push and deploy automatically
# Usage: ./auto-update.sh "commit message"

echo "🚀 Starting auto update..."

# Check if commit message is provided
if [ -z "$1" ]; then
    echo "❌ Please provide a commit message"
    echo "Usage: ./auto-update.sh \"your commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📝 Commit message:${NC} $COMMIT_MESSAGE"

# Step 1: Add all changes
echo -e "${YELLOW}📋 Adding changes to git...${NC}"
git add .
echo -e "${GREEN}✅ Changes added${NC}"

# Step 2: Commit changes
echo -e "${YELLOW}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MESSAGE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Changes committed${NC}"
else
    echo -e "${RED}❌ Commit failed${NC}"
    exit 1
fi

# Step 3: Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Changes pushed to GitHub${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi

# Step 4: Deploy to server
echo -e "${YELLOW}🚀 Deploying to server...${NC}"
./deploy.sh

echo -e "${GREEN}🎉 Auto update completed successfully!${NC}"
echo -e "${YELLOW}🔄 Please refresh your browser to see the changes.${NC}"
