#!/bin/bash

# Commit and Deploy script
# This script commits changes, pushes to GitHub, and deploys to server

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting commit and deploy process...${NC}"

# Check if commit message is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide a commit message${NC}"
    echo -e "${YELLOW}Usage: ./commit-and-deploy.sh \"Your commit message\"${NC}"
    exit 1
fi

COMMIT_MESSAGE="$1"

echo -e "${GREEN}📝 Commit message:${NC} $COMMIT_MESSAGE"

# Step 1: Add all files
echo -e "${YELLOW}📋 Adding files to git...${NC}"
git add .

# Step 2: Commit
echo -e "${YELLOW}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MESSAGE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Commit successful${NC}"
else
    echo -e "${RED}❌ Commit failed${NC}"
    exit 1
fi

# Step 3: Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Push successful${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    exit 1
fi

# Step 4: Deploy to server
echo -e "${YELLOW}🚀 Deploying to server...${NC}"
./deploy.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deploy successful${NC}"
else
    echo -e "${RED}❌ Deploy failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 All done! Commit, push, and deploy completed successfully!${NC}"
echo -e "${YELLOW}🔄 Please refresh your browser to see the changes.${NC}"
