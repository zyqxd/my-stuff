#!/bin/bash

# Update Lasso configuration in my-stuff repo
# Run this script whenever you change your Lasso settings and want to save them

echo "🪟 Updating Lasso configuration in my-stuff repo..."

# Check if Lasso preferences exist
if [ ! -f "$HOME/Library/Preferences/com.heavylightapps.lasso.plist" ]; then
    echo "❌ Lasso preferences not found. Make sure Lasso is installed and configured."
    exit 1
fi

# Create preferences directory if it doesn't exist
mkdir -p ~/Personal/my-stuff/preferences/lasso/Application\ Support

# Copy current Lasso preferences
echo "📋 Copying Lasso preferences..."
cp "$HOME/Library/Preferences/com.heavylightapps.lasso.plist" ~/Personal/my-stuff/preferences/lasso/

# Copy Lasso application support files
echo "📁 Copying Lasso application support files..."
cp -r "$HOME/Library/Application Support/Lasso/"* ~/Personal/my-stuff/preferences/lasso/Application\ Support/ 2>/dev/null || true

echo "✅ Lasso configuration updated in my-stuff repo!"
echo "💡 Don't forget to commit these changes to git if you want to save them."
