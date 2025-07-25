/**
 * BookmarkTidy Test Utilities - Bookmark Fixtures
 * Shared test data and bookmark creation utilities
 */

/**
 * Test bookmark sets for different scenarios
 */
const BOOKMARK_SETS = {
  basic: [
    { title: 'Google', url: 'https://www.google.com' },
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'Stack Overflow', url: 'https://stackoverflow.com' }
  ],

  withDuplicates: [
    { title: 'Google - First', url: 'https://www.google.com' },
    { title: 'Google - Duplicate', url: 'https://www.google.com' },
    { title: 'GitHub - Original', url: 'https://github.com' },
    { title: 'GitHub - Copy', url: 'https://github.com' },
    { title: 'Example Site', url: 'https://example.com' },
    { title: 'Example Duplicate', url: 'https://example.com' }
  ],

  deadLinksOnly: [
    { title: 'Non-existent Domain 1', url: 'https://this-domain-definitely-does-not-exist-12345.com' },
    { title: 'Non-existent Domain 2', url: 'https://completely-fake-website-xyz-999.net' },
    { title: 'Invalid TLD', url: 'https://invalid.invalidtld' },
    { title: '404 Test URL', url: 'https://httpstat.us/404' },
    { title: '500 Error Test', url: 'https://httpstat.us/500' }
  ],

  mixed: [
    // Working sites
    { title: 'Google (Working)', url: 'https://www.google.com' },
    { title: 'GitHub (Working)', url: 'https://github.com' },
    
    // CORS-restricted sites (should NOT be flagged as dead)
    { title: 'Twitter/X (CORS Restricted)', url: 'https://twitter.com' },
    { title: 'Facebook (CORS Restricted)', url: 'https://facebook.com' },
    
    // Dead sites
    { title: 'Dead Site 1', url: 'https://thissitedoesnotexist12345.com' },
    { title: 'Dead Site 2', url: 'https://anotherfakeurl9999.com' },
    
    // Duplicates
    { title: 'Google - Duplicate', url: 'https://www.google.com' },
    { title: 'GitHub - Duplicate', url: 'https://github.com' }
  ],

  reliability: [
    // Working sites (should NOT be flagged as dead)
    { title: 'Google (Working)', url: 'https://www.google.com' },
    { title: 'GitHub (Working)', url: 'https://github.com' },
    { title: 'Stack Overflow (Working)', url: 'https://stackoverflow.com' },
    { title: 'Wikipedia (Working)', url: 'https://wikipedia.org' },
    { title: 'Example.com (Working)', url: 'https://example.com' },
    
    // Sites with CORS restrictions (should NOT be flagged as dead)
    { title: 'Twitter/X (CORS Restricted)', url: 'https://twitter.com' },
    { title: 'Facebook (CORS Restricted)', url: 'https://facebook.com' },
    { title: 'LinkedIn (CORS Restricted)', url: 'https://linkedin.com' },
    
    // Sites that might block HEAD requests (should NOT be flagged)
    { title: 'Instagram (May Block HEAD)', url: 'https://instagram.com' },
    { title: 'Reddit (May Block HEAD)', url: 'https://reddit.com' },
    
    // Actually dead sites (SHOULD be flagged)
    { title: 'Non-existent Domain 1', url: 'https://this-domain-definitely-does-not-exist-12345.com' },
    { title: 'Non-existent Domain 2', url: 'https://completely-fake-website-xyz-999.net' }
  ]
};

/**
 * Add bookmarks to the browser using background script context
 * @param {Object} context - Browser context
 * @param {Array} bookmarks - Array of bookmark objects {title, url}
 * @param {Object} options - Options for bookmark creation
 */
async function addBookmarks(context, bookmarks, options = {}) {
  const { folder = null } = options;
  
  // Wait for extension to load by checking for service worker
  let serviceWorker = null;
  let attempts = 0;
  while (!serviceWorker && attempts < 10) {
    console.log(`⏳ Waiting for extension service worker (attempt ${attempts + 1}/10)...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to get service worker from context
    const serviceWorkers = context.serviceWorkers();
    serviceWorker = serviceWorkers.find(sw => 
      sw.url().includes('chrome-extension://') && sw.url().includes('background.js')
    );
    
    // If no service worker yet, try to trigger it by navigating to extension page
    if (!serviceWorker && attempts === 3) {
      console.log('🔧 Attempting to wake up service worker...');
      const page = await context.newPage();
      const pages = context.pages();
      if (pages.length > 0) {
        const firstPage = pages[0];
        // Navigate to extension to wake up service worker
        try {
          await firstPage.goto('chrome://extensions/');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          // Ignore navigation errors
        }
      }
      await page.close();
    }
    
    attempts++;
  }
  
  if (!serviceWorker) {
    console.log('🔍 Available service workers in context:');
    const serviceWorkers = context.serviceWorkers();
    for (const sw of serviceWorkers) {
      console.log(`  - Service Worker: ${sw.url()}`);
    }
    console.log('🔍 Available pages in context:');
    const pages = context.pages();
    for (const page of pages) {
      console.log(`  - Page: ${page.url()}`);
    }
    throw new Error('No service worker found - extension may not be loaded properly');
  }
  
  console.log(`✅ Found service worker: ${serviceWorker.url()}`);
  const backgroundPage = serviceWorker;
  
  await backgroundPage.evaluate(async ({ bookmarks, folder }) => {
    return new Promise((resolve) => {
      let parentId = folder;
      let added = 0;

      // If folder name is provided, create it first
      if (typeof folder === 'string') {
        chrome.bookmarks.create({ title: folder }, (folderNode) => {
          parentId = folderNode.id;
          addBookmarksToFolder();
        });
      } else {
        addBookmarksToFolder();
      }

      function addBookmarksToFolder() {
        if (bookmarks.length === 0) {
          resolve();
          return;
        }

        bookmarks.forEach((bookmark, index) => {
          const bookmarkData = parentId ? 
            { ...bookmark, parentId } : 
            bookmark;

          chrome.bookmarks.create(bookmarkData, () => {
            added++;
            if (added === bookmarks.length) {
              resolve();
            }
          });
        });
      }
    });
  }, { bookmarks, folder });

  // Wait for bookmarks to be created
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Clean up test bookmarks
 * @param {Object} context - Browser context
 * @param {Array} bookmarkUrls - URLs of bookmarks to remove
 * @param {Array} bookmarkTitles - Titles of bookmarks to remove (optional)
 */
async function cleanupBookmarks(context, bookmarkUrls = [], bookmarkTitles = []) {
  // Try to get service worker for cleanup
  const serviceWorkers = context.serviceWorkers();
  const serviceWorker = serviceWorkers.find(sw => 
    sw.url().includes('chrome-extension://') && sw.url().includes('background.js')
  );
  
  if (!serviceWorker) {
    console.log('No service worker found for cleanup, skipping...');
    return;
  }
  
  const backgroundPage = serviceWorker;
  
  await backgroundPage.evaluate(async ({ urls, titles }) => {
    return new Promise((resolve) => {
      chrome.bookmarks.search({}, (bookmarks) => {
        const testItems = bookmarks.filter(bookmark => {
          // Match bookmarks by URL
          if (bookmark.url) {
            const urlMatch = urls.some(url => 
              bookmark.url.includes(url) || url.includes(bookmark.url)
            );
            if (urlMatch) return true;
          }
          
          // Match by title (both bookmarks and folders)
          const titleMatch = titles.some(title => 
            bookmark.title && bookmark.title.includes(title)
          );
          
          return titleMatch;
        });

        if (testItems.length === 0) {
          resolve();
          return;
        }

        let removed = 0;
        testItems.forEach(item => {
          // Use removeTree for folders to remove all children
          const removeFunction = item.url ? chrome.bookmarks.remove : chrome.bookmarks.removeTree;
          removeFunction(item.id, () => {
            removed++;
            if (removed === testItems.length) {
              resolve();
            }
          });
        });
      });
    });
  }, { urls: bookmarkUrls, titles: bookmarkTitles });
}

/**
 * Clean up all test bookmarks (removes any bookmark with test-related content)
 * @param {Object} context - Browser context
 */
async function cleanupAllTestBookmarks(context) {
  const testPatterns = [
    'test', 'dead', 'duplicate', 'fake', 'nonexistent', 'example',
    'thissitedoesnotexist', 'completely-fake', 'httpstat.us'
  ];

  await cleanupBookmarks(context, testPatterns, testPatterns);
}

/**
 * Get test bookmarks by set name
 * @param {string} setName - Name of the bookmark set
 * @returns {Array} Array of bookmark objects
 */
function getBookmarkSet(setName) {
  return BOOKMARK_SETS[setName] || [];
}

/**
 * Get all available bookmark set names
 * @returns {Array} Array of set names
 */
function getAvailableSetNames() {
  return Object.keys(BOOKMARK_SETS);
}

module.exports = {
  BOOKMARK_SETS,
  addBookmarks,
  cleanupBookmarks,
  cleanupAllTestBookmarks,
  getBookmarkSet,
  getAvailableSetNames
};
