# BookmarkTidy

A Chrome extension that automatically organizes your bookmarks with intelligent sorting and management features.

## Features

### 🗂️ Automatic Folder Sorting
- Automatically organizes folders alphabetically
- Keeps subfolders at the top, followed by bookmarks
- Maintains clean folder structure

### 📈 Sort by Use (Most Recent First)
- Moves recently visited bookmarks to the top of their folders
- Smart URL matching handles redirects and URL variations
- Works with login redirects and URL parameters

### 🔧 Bookmark Management Tools
- **Duplicate Finder**: Locate and remove duplicate bookmarks
- **Dead Link Checker**: Find and remove broken/dead links
- Batch operations for efficient cleanup

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd BookmarkTidy
   ```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the project folder
   - The extension should now appear in your extensions list

## How It Works

### Automatic Organization
The extension runs in the background and automatically:
- Sorts new bookmarks into organized folders
- Moves frequently used bookmarks to the top
- Maintains folder hierarchy with subfolders first

### Smart URL Matching
When you visit a webpage, the extension:
1. Captures the initial URL (before redirects)
2. Tracks the final URL after redirects
3. Attempts to match both URLs against your bookmarks
4. Uses domain-based fallback matching for complex redirects
5. Moves the matching bookmark to the top of its folder

### URL Variations Handled
- HTTP vs HTTPS protocols
- With/without www prefix
- URL parameters and tracking codes
- Login redirects with continue parameters
- Domain-based matching for complex redirects

## Settings

Access settings by clicking the extension icon and going to the Settings tab:

- **Automatic Folder Sorting**: Enable/disable automatic folder organization
- **Sort by Use**: Enable/disable moving recently used bookmarks to the top

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Privacy

This extension:
- Only accesses your bookmarks (no browsing history)
- Works entirely locally (no data sent to external servers)
- Only requires necessary permissions for bookmark management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the included test suite
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Sort by Use Not Working
- Check that the feature is enabled in Settings
- Ensure the service worker is active (reload extension if needed)
- Verify bookmark URLs match the pages you're visiting

### Bookmarks Not Sorting
- Check browser console for any errors
- Reload the extension
- Verify automatic folder sorting is enabled

For more issues, check the browser's extension console:
1. Go to `chrome://extensions/`
2. Find BookmarkTidy
3. Click "Inspect views: service worker"
4. Check console for error messages
