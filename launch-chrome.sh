#!/bin/bash

# Launch Chrome with Bookmark Tidy extension
echo "🚀 Launching Chrome with Bookmark Tidy extension..."

EXTENSION_PATH="/Users/ehud/Desktop/projects/BookmarkTidy"

# Find Chrome executable
CHROME_PATH=""
if [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [ -f "/Applications/Chrome.app/Contents/MacOS/Google Chrome" ]; then
    CHROME_PATH="/Applications/Chrome.app/Contents/MacOS/Google Chrome"
else
    echo "❌ Chrome not found in Applications folder"
    echo "Please install Chrome or update the path in this script"
    exit 1
fi

echo "📂 Extension path: $EXTENSION_PATH"
echo "🌐 Chrome path: $CHROME_PATH"

# Launch Chrome with extension
"$CHROME_PATH" \
    --disable-extensions-except="$EXTENSION_PATH" \
    --load-extension="$EXTENSION_PATH" \
    --no-first-run \
    --disable-default-apps \
    --new-window \
    "chrome://extensions/" &

echo "✅ Chrome launched with extension!"
echo ""
echo "📝 Testing steps:"
echo "1. Check that 'Bookmark Tidy' appears in the extensions list"
echo "2. Look for the Bookmark Tidy icon in the browser toolbar"
echo "3. Click the icon to test the popup"
echo "4. Click 'Manage Bookmarks' to open the options page"
echo "5. Test the duplicate finder and dead link checker"
echo ""
