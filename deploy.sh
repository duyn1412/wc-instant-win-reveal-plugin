#!/bin/bash

# Deploy script for wc-instant-win-reveal-plugin
# This script uploads files to the server after git push

echo "🚀 Starting deployment..."

# Configuration
PLUGIN_DIR="/Users/duyn/Desktop/worksspace/wc-instant-win-reveal-plugin"
SERVER_DIR="/Users/duyn/Desktop/worksspace/dev-floridafun/wp-content/plugins/wc-instant-win-reveal-plugin"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}📁 Source directory:${NC} $PLUGIN_DIR"
echo -e "${GREEN}📁 Target directory:${NC} $SERVER_DIR"

# Check if source directory exists
if [ ! -d "$PLUGIN_DIR" ]; then
    echo -e "${RED}❌ Source directory not found: $PLUGIN_DIR${NC}"
    exit 1
fi

# Check if target directory exists
if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}❌ Target directory not found: $SERVER_DIR${NC}"
    exit 1
fi

# Copy files to server
echo -e "${YELLOW}📋 Copying files to server...${NC}"

# Copy JavaScript files
if [ -f "$PLUGIN_DIR/assets/js/instantwin.js" ]; then
    cp "$PLUGIN_DIR/assets/js/instantwin.js" "$SERVER_DIR/assets/js/instantwin.js"
    echo -e "${GREEN}✅ Copied: instantwin.js${NC}"
else
    echo -e "${RED}❌ Source file not found: instantwin.js${NC}"
fi

# Copy CSS files
if [ -f "$PLUGIN_DIR/assets/css/instantwin.css" ]; then
    cp "$PLUGIN_DIR/assets/css/instantwin.css" "$SERVER_DIR/assets/css/instantwin.css"
    echo -e "${GREEN}✅ Copied: instantwin.css${NC}"
else
    echo -e "${RED}❌ Source file not found: instantwin.css${NC}"
fi

# Copy PHP files
if [ -f "$PLUGIN_DIR/wc-instant-win-reveal.php" ]; then
    cp "$PLUGIN_DIR/wc-instant-win-reveal.php" "$SERVER_DIR/wc-instant-win-reveal.php"
    echo -e "${GREEN}✅ Copied: wc-instant-win-reveal.php${NC}"
else
    echo -e "${RED}❌ Source file not found: wc-instant-win-reveal.php${NC}"
fi

# Copy sound files if they exist
if [ -d "$PLUGIN_DIR/assets/sound" ]; then
    mkdir -p "$SERVER_DIR/assets/sound"
    cp -r "$PLUGIN_DIR/assets/sound/"* "$SERVER_DIR/assets/sound/" 2>/dev/null
    echo -e "${GREEN}✅ Copied: sound files${NC}"
fi

# Copy README files
if [ -f "$PLUGIN_DIR/README.md" ]; then
    cp "$PLUGIN_DIR/README.md" "$SERVER_DIR/README.md"
    echo -e "${GREEN}✅ Copied: README.md${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📝 Files have been uploaded to the server.${NC}"
echo -e "${YELLOW}🔄 Please refresh your browser to see the changes.${NC}"

# Auto open files in editor for manual save (if needed)
echo -e "${YELLOW}📝 Opening files in editor for manual save...${NC}"
if command -v code &> /dev/null; then
    code "$SERVER_DIR/assets/js/instantwin.js"
    code "$SERVER_DIR/assets/css/instantwin.css"
    code "$SERVER_DIR/wc-instant-win-reveal.php"
    echo -e "${GREEN}✅ Files opened in VS Code${NC}"
elif command -v subl &> /dev/null; then
    subl "$SERVER_DIR/assets/js/instantwin.js"
    subl "$SERVER_DIR/assets/css/instantwin.css"
    subl "$SERVER_DIR/wc-instant-win-reveal.php"
    echo -e "${GREEN}✅ Files opened in Sublime Text${NC}"
else
    echo -e "${YELLOW}⚠️  Please manually open and save files in your editor${NC}"
fi
