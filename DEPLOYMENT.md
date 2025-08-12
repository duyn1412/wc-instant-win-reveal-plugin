# Deployment Guide

## Automatic Deployment Setup

This plugin now includes automatic deployment scripts that upload files to the server after git push.

## Available Scripts

### 1. Manual Deploy
```bash
./deploy.sh
```
- Copies files from development to server
- Shows progress with colored output
- Handles errors gracefully

### 2. Commit and Deploy
```bash
./commit-and-deploy.sh "Your commit message"
```
- Adds all files to git
- Commits with your message
- Pushes to GitHub
- Deploys to server
- All in one command!

### 3. Git Hook (Automatic)
- Automatically runs after `git push`
- No manual intervention needed
- Deploys to server automatically

## File Structure

```
wc-instant-win-reveal-plugin/
├── deploy.sh                    # Manual deployment script
├── commit-and-deploy.sh         # Commit + push + deploy script
├── .git/hooks/post-push         # Automatic deployment hook
├── assets/
│   ├── js/instantwin.js         # Main JavaScript file
│   ├── css/instantwin.css       # Main CSS file
│   └── sound/                   # Audio files
└── wc-instant-win-reveal.php    # Main plugin file
```

## Usage Examples

### Quick Development Workflow
```bash
# Make your changes to files
# Then run:
./commit-and-deploy.sh "Added new feature"

# This will:
# 1. Add all files to git
# 2. Commit with message "Added new feature"
# 3. Push to GitHub
# 4. Deploy to server
# 5. Show success message
```

### Manual Deploy Only
```bash
# If you just want to deploy without committing:
./deploy.sh
```

### Traditional Git Workflow
```bash
# Traditional git commands still work:
git add .
git commit -m "Your message"
git push

# The post-push hook will automatically deploy
```

## Configuration

### Server Paths
The scripts are configured for these paths:
- **Source:** `/Users/duyn/Desktop/worksspace/wc-instant-win-reveal-plugin`
- **Target:** `/Users/duyn/Desktop/worksspace/dev-floridafun/wp-content/plugins/wc-instant-win-reveal-plugin`

### Files Deployed
- `assets/js/instantwin.js`
- `assets/css/instantwin.css`
- `wc-instant-win-reveal.php`
- `assets/sound/` (entire directory)
- `README.md`

## Troubleshooting

### Script Not Executable
```bash
chmod +x deploy.sh
chmod +x commit-and-deploy.sh
chmod +x .git/hooks/post-push
```

### Permission Denied
Make sure the target directory is writable:
```bash
ls -la /Users/duyn/Desktop/worksspace/dev-floridafun/wp-content/plugins/
```

### Git Hook Not Working
Check if the hook is executable:
```bash
ls -la .git/hooks/post-push
```

## Benefits

✅ **One-command deployment** - No more manual file copying  
✅ **Automatic after push** - Git hook handles deployment  
✅ **Error handling** - Graceful failure with clear messages  
✅ **Progress tracking** - Colored output shows what's happening  
✅ **Consistent workflow** - Same process every time  

## Notes

- Scripts use colored output for better visibility
- All operations are logged with timestamps
- Failed operations stop the process
- Server files are overwritten (backup if needed)
