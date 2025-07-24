
/**
 * Bookmark Tidy - Background Service Worker
 * Handles automatic folder sorting and sort by use functionality
 */

// Default settings
const DEFAULT_SETTINGS = {
  autoFolderSorting: true,
  sortByUse: true
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Bookmark Tidy installed');
  
  // Set default settings
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set(settings);
});

// Get current settings
async function getSettings() {
  return await chrome.storage.sync.get(DEFAULT_SETTINGS);
}

// Check if a folder is the Bookmarks Bar (ID '1') or its direct child
function isBookmarksBarOrChild(parentId) {
  return parentId === '1';
}

// Get folder path for debugging
async function getFolderPath(bookmarkId) {
  const path = [];
  let current = bookmarkId;
  
  while (current && current !== '0') {
    try {
      const [bookmark] = await chrome.bookmarks.get(current);
      if (bookmark) {
        path.unshift(bookmark.title || 'Root');
        current = bookmark.parentId;
      } else {
        break;
      }
    } catch (error) {
      break;
    }
  }
  
  return path.join(' > ');
}

// Sort folder contents: subfolders first (alphabetically), then bookmarks
async function sortFolderContents(folderId) {
  const settings = await getSettings();
  if (!settings.autoFolderSorting) return;
  
  // Skip if this is the Bookmarks Bar
  if (isBookmarksBarOrChild(folderId)) {
    console.log('Skipping Bookmarks Bar sorting');
    return;
  }
  
  try {
    const children = await chrome.bookmarks.getChildren(folderId);
    if (children.length <= 1) return;
    
    // Separate folders and bookmarks
    const folders = children.filter(child => !child.url);
    const bookmarks = children.filter(child => child.url);
    
    // Sort folders alphabetically
    folders.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    
    // Move folders to top
    for (let i = 0; i < folders.length; i++) {
      await chrome.bookmarks.move(folders[i].id, {
        parentId: folderId,
        index: i
      });
    }
    
    // Move bookmarks after folders
    for (let i = 0; i < bookmarks.length; i++) {
      await chrome.bookmarks.move(bookmarks[i].id, {
        parentId: folderId,
        index: folders.length + i
      });
    }
    
    console.log(`Sorted folder: ${await getFolderPath(folderId)}`);
  } catch (error) {
    console.error('Error sorting folder:', error);
  }
}

// Move used bookmark to top (after folders)
async function moveBookmarkToTop(bookmarkId) {
  const settings = await getSettings();
  console.log('🔖 Settings:', settings);
  
  if (!settings.sortByUse) {
    console.log('🔖 sortByUse is disabled, skipping move');
    return;
  }
  
  try {
    const [bookmark] = await chrome.bookmarks.get(bookmarkId);
    console.log('🔖 Bookmark details:', bookmark);
    
    if (!bookmark || !bookmark.parentId) {
      console.log('🔖 No bookmark or parentId found');
      return;
    }
    
    console.log('🔖 Parent ID:', bookmark.parentId);
    
    // Skip if parent is Bookmarks Bar
    if (isBookmarksBarOrChild(bookmark.parentId)) {
      console.log('🔖 Skipping Bookmarks Bar bookmark move');
      return;
    }
    
    const siblings = await chrome.bookmarks.getChildren(bookmark.parentId);
    const folders = siblings.filter(child => !child.url);
    
    console.log('🔖 Siblings count:', siblings.length);
    console.log('🔖 Folders count:', folders.length);
    console.log('🔖 Current bookmark index:', siblings.findIndex(s => s.id === bookmarkId));
    console.log('🔖 Target index:', folders.length);
    
    // Only move if bookmark is not already at the target position
    const currentIndex = siblings.findIndex(s => s.id === bookmarkId);
    if (currentIndex === folders.length) {
      console.log('🔖 Bookmark already at correct position');
      return;
    }
    
    // Move bookmark to position right after folders
    await chrome.bookmarks.move(bookmarkId, {
      parentId: bookmark.parentId,
      index: folders.length
    });
    
    console.log(`🔖 Successfully moved bookmark to top: ${bookmark.title}`);
  } catch (error) {
    console.error('🔖 Error moving bookmark:', error);
  }
}

// Normalize URL for better matching
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove common parameters that don't affect the content
    urlObj.searchParams.delete('utm_source');
    urlObj.searchParams.delete('utm_medium');
    urlObj.searchParams.delete('utm_campaign');
    urlObj.searchParams.delete('fbclid');
    urlObj.searchParams.delete('gclid');
    
    // Always use https if available, remove trailing slash
    return urlObj.toString().replace(/\/$/, '');
  } catch (e) {
    return url;
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

// Check if URL is a login/auth redirect with continue parameter
function extractContinueUrl(url) {
  try {
    const urlObj = new URL(url);
    const continueParam = urlObj.searchParams.get('continue');
    if (continueParam) {
      console.log('🔍 Found continue parameter:', continueParam);
      return decodeURIComponent(continueParam);
    }
    
    // Also check for 'redirect_uri', 'return_to', etc.
    const redirectParam = urlObj.searchParams.get('redirect_uri') || 
                         urlObj.searchParams.get('return_to') ||
                         urlObj.searchParams.get('returnUrl');
    if (redirectParam) {
      console.log('🔍 Found redirect parameter:', redirectParam);
      return decodeURIComponent(redirectParam);
    }
  } catch (e) {
    // Invalid URL
  }
  return null;
}

// Find bookmark by URL with better matching
async function findBookmarkByUrl(url) {
  try {
    console.log('🔍 Searching for bookmark with URL:', url);
    
    // First try exact match
    let bookmarks = await chrome.bookmarks.search({ url });
    if (bookmarks.length > 0) {
      console.log('🔍 Found exact match:', bookmarks[0].title);
      return bookmarks[0];
    }
    
    // Try normalized URL
    const normalizedUrl = normalizeUrl(url);
    if (normalizedUrl !== url) {
      console.log('🔍 Trying normalized URL:', normalizedUrl);
      bookmarks = await chrome.bookmarks.search({ url: normalizedUrl });
      if (bookmarks.length > 0) {
        console.log('🔍 Found normalized match:', bookmarks[0].title);
        return bookmarks[0];
      }
    }
    
    // Try without www
    const withoutWww = url.replace(/\/\/www\./g, '//');
    if (withoutWww !== url) {
      console.log('🔍 Trying without www:', withoutWww);
      bookmarks = await chrome.bookmarks.search({ url: withoutWww });
      if (bookmarks.length > 0) {
        console.log('🔍 Found without www match:', bookmarks[0].title);
        return bookmarks[0];
      }
    }
    
    // Try with www
    const withWww = url.replace(/\/\/([^.]+)/g, '//www.$1');
    if (withWww !== url && !url.includes('www.')) {
      console.log('🔍 Trying with www:', withWww);
      bookmarks = await chrome.bookmarks.search({ url: withWww });
      if (bookmarks.length > 0) {
        console.log('🔍 Found with www match:', bookmarks[0].title);
        return bookmarks[0];
      }
    }
    
    // Try http/https variants
    const httpVariant = url.replace('https://', 'http://');
    const httpsVariant = url.replace('http://', 'https://');
    
    if (httpVariant !== url) {
      console.log('🔍 Trying HTTP variant:', httpVariant);
      bookmarks = await chrome.bookmarks.search({ url: httpVariant });
      if (bookmarks.length > 0) {
        console.log('🔍 Found HTTP variant match:', bookmarks[0].title);
        return bookmarks[0];
      }
    }
    
    if (httpsVariant !== url) {
      console.log('🔍 Trying HTTPS variant:', httpsVariant);
      bookmarks = await chrome.bookmarks.search({ url: httpsVariant });
      if (bookmarks.length > 0) {
        console.log('🔍 Found HTTPS variant match:', bookmarks[0].title);
        return bookmarks[0];
      }
    }
    
    // Try extracting continue URL from auth/login redirects
    const continueUrl = extractContinueUrl(url);
    if (continueUrl) {
      console.log('🔍 Trying continue URL:', continueUrl);
      const continueBookmark = await findBookmarkByUrl(continueUrl);
      if (continueBookmark) {
        console.log('🔍 Found bookmark via continue URL:', continueBookmark.title);
        return continueBookmark;
      }
    }
    
    // Last resort: domain-based search for yad2.co.il specifically
    const domain = extractDomain(url);
    if (domain && (domain.includes('yad2.co.il') || domain.includes('auth.yad2.co.il'))) {
      console.log('🔍 Trying domain-based search for yad2.co.il bookmarks...');
      
      // Get all bookmarks and filter by domain
      const allBookmarks = await new Promise((resolve) => {
        chrome.bookmarks.getTree((tree) => {
          const bookmarks = [];
          const traverse = (nodes) => {
            nodes.forEach(node => {
              if (node.url) {
                const bookmarkDomain = extractDomain(node.url);
                if (bookmarkDomain && bookmarkDomain.includes('yad2.co.il')) {
                  bookmarks.push(node);
                }
              }
              if (node.children) {
                traverse(node.children);
              }
            });
          };
          traverse(tree);
          resolve(bookmarks);
        });
      });
      
      console.log('🔍 Found', allBookmarks.length, 'yad2.co.il bookmarks:', allBookmarks.map(b => b.url));
      
      // Return the first yad2.co.il bookmark found
      if (allBookmarks.length > 0) {
        console.log('🔍 Using domain fallback bookmark:', allBookmarks[0].title);
        return allBookmarks[0];
      }
    }
    
    console.log('🔍 No bookmark found for any URL variant');
    return null;
    
  } catch (error) {
    console.error('🔍 Error finding bookmark:', error);
    return null;
  }
}

// Event Listeners

// Handle bookmark creation
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (bookmark.parentId) {
    await sortFolderContents(bookmark.parentId);
  }
});

// Handle bookmark move
chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  // Sort both old and new parent folders
  if (moveInfo.oldParentId) {
    await sortFolderContents(moveInfo.oldParentId);
  }
  if (moveInfo.parentId && moveInfo.parentId !== moveInfo.oldParentId) {
    await sortFolderContents(moveInfo.parentId);
  }
});

// Handle folder reordering
chrome.bookmarks.onChildrenReordered.addListener(async (id, reorderInfo) => {
  await sortFolderContents(id);
});

// Track initial URLs before redirects
const tabInitialUrls = new Map();

// Handle tab updates for "Sort by Use" feature
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log('🔖 Tab update event:', {
    tabId,
    status: changeInfo.status,
    url: tab.url,
    changeInfo
  });
  
  // Track initial URL when loading starts
  if (changeInfo.status === 'loading' && tab.url) {
    // Skip chrome:// and extension URLs
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      if (!tabInitialUrls.has(tabId)) {
        console.log('🔖 Tracking initial URL for tab:', tabId, '->', tab.url);
        tabInitialUrls.set(tabId, tab.url);
      }
    }
  }
  
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('🔖 Processing completed tab:', tab.url);
    
    // Check settings first
    const settings = await getSettings();
    console.log('🔖 Current settings:', settings);
    
    if (!settings.sortByUse) {
      console.log('🔖 Sort by Use is disabled, skipping');
      return;
    }
    
    // Skip chrome:// and extension URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('🔖 Skipping chrome:// or extension URL');
      return;
    }
    
    // Get initial URL if available
    const initialUrl = tabInitialUrls.get(tabId);
    console.log('🔖 Initial URL was:', initialUrl);
    console.log('🔖 Final URL is:', tab.url);
    
    // Search for bookmark using both initial and final URLs
    let bookmark = null;
    
    // First try the initial URL (the one that might match the bookmark)
    if (initialUrl && initialUrl !== tab.url) {
      console.log('🔖 Searching for bookmark with initial URL...');
      bookmark = await findBookmarkByUrl(initialUrl);
      if (bookmark) {
        console.log('🔖 Found bookmark using initial URL:', bookmark.title);
      }
    }
    
    // If not found, try the final URL
    if (!bookmark) {
      console.log('🔖 Searching for bookmark with final URL...');
      bookmark = await findBookmarkByUrl(tab.url);
      if (bookmark) {
        console.log('🔖 Found bookmark using final URL:', bookmark.title);
      }
    }
    
    console.log('🔖 Search result:', bookmark ? `Found: ${bookmark.title}` : 'Not found');
    
    if (bookmark) {
      console.log('🔖 Attempting to move bookmark to top:', bookmark.title);
      await moveBookmarkToTop(bookmark.id);
      console.log('🔖 Move operation completed');
    } else {
      console.log('🔖 No matching bookmark found for either URL');
    }
    
    // Clean up tracked URL
    tabInitialUrls.delete(tabId);
  }
});

// Clean up when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabInitialUrls.delete(tabId);
});

// Manual test function - call this from console
globalThis.testBookmarkSort = async function(url) {
  console.log('🧪 Testing bookmark sort for URL:', url);
  const bookmark = await findBookmarkByUrl(url);
  if (bookmark) {
    console.log('🧪 Found bookmark:', bookmark.title);
    await moveBookmarkToTop(bookmark.id);
    console.log('🧪 Test complete');
  } else {
    console.log('🧪 No bookmark found for URL');
  }
};

// Debug function to list all bookmarks
globalThis.listAllBookmarks = async function() {
  const bookmarks = await new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const allBookmarks = [];
      const traverse = (nodes) => {
        nodes.forEach(node => {
          if (node.url) {
            allBookmarks.push({
              title: node.title,
              url: node.url,
              id: node.id
            });
          }
          if (node.children) {
            traverse(node.children);
          }
        });
      };
      traverse(tree);
      resolve(allBookmarks);
    });
  });
  
  console.log('📚 All bookmarks:');
  bookmarks.forEach(b => console.log(`  ${b.title}: ${b.url}`));
  return bookmarks;
};

// Handle messages from options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    getSettings().then(sendResponse);
    return true;
  } else if (request.action === 'updateSettings') {
    chrome.storage.sync.set(request.settings).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'testBookmarkSort') {
    // Allow testing from options page
    findBookmarkByUrl(request.url).then(bookmark => {
      if (bookmark) {
        moveBookmarkToTop(bookmark.id).then(() => {
          sendResponse({ success: true, found: true, bookmark: bookmark.title });
        });
      } else {
        sendResponse({ success: true, found: false });
      }
    });
    return true;
  }
});

console.log('🚀 Bookmark Tidy background script loaded at:', new Date().toISOString());

// Keep service worker alive and show heartbeat
let heartbeatInterval;

function startHeartbeat() {
  // Clear any existing interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Start new heartbeat
  heartbeatInterval = setInterval(() => {
    console.log('💓 Background script heartbeat:', new Date().toLocaleTimeString());
    // Keep service worker alive by doing a simple chrome API call
    chrome.storage.local.set({heartbeat: Date.now()});
  }, 30000); // Every 30 seconds
}

// Start heartbeat immediately
startHeartbeat();

// Restart heartbeat when service worker wakes up
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Service worker restarted');
  startHeartbeat();
});

// Keep alive on any tab update
chrome.tabs.onUpdated.addListener(() => {
  // This helps keep the service worker active
});

// Add a simple test that we can call
globalThis.testBasic = function() {
  console.log('✅ Background script is responding!');
  console.log('✅ Current settings:', getSettings());
  return 'Background script is working!';
};
