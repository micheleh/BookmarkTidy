const { chromium } = require('playwright');
const path = require('path');

async function addTestBookmarks() {
  console.log('Launching browser with extension...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-extensions-except=./src',
      `--load-extension=${path.resolve('.')}`
    ]
  });
  
  const context = browser.contexts()[0];
  const page = await context.newPage();
  
  try {
    console.log('Adding test bookmarks...');
    
    // Add test bookmarks including known dead URLs
    await page.evaluate(async () => {
      const bookmarksToAdd = [
        {
          title: 'Working Site - Google',
          url: 'https://www.google.com'
        },
        {
          title: 'Dead Site - Nonexistent Domain',
          url: 'http://example.thissitedoesnotexist.com'
        },
        {
          title: 'Another Dead Site',
          url: 'http://nonexistent.fakeurltest.com'
        },
        {
          title: 'Dead Site - 404',
          url: 'https://httpstat.us/404'
        },
        {
          title: 'Slow/Timeout URL',
          url: 'http://httpstat.us/200?sleep=10000'
        }
      ];
      
      return new Promise((resolve) => {
        let added = 0;
        
        bookmarksToAdd.forEach((bookmark, index) => {
          chrome.bookmarks.create(bookmark, () => {
            added++;
            console.log(`Added: ${bookmark.title} - ${bookmark.url}`);
            if (added === bookmarksToAdd.length) {
              resolve();
            }
          });
        });
      });
    });
    
    console.log('Test bookmarks added successfully!');
    console.log('\nNow you can:');
    console.log('1. Go to chrome://extensions/');
    console.log('2. Find the BookmarkTidy extension');
    console.log('3. Click "Options" to open the extension options page');
    console.log('4. Go to the "Dead Links" tab');
    console.log('5. Click "Check Dead Links" to test the functionality');
    console.log('\nThe browser will stay open for manual testing.');
    console.log('Press Ctrl+C when done to close.');
    
    // Keep the browser open for manual testing
    await new Promise(() => {}); // This will keep the process running
    
  } catch (error) {
    console.error('Error adding bookmarks:', error);
  }
}

addTestBookmarks().catch(console.error);
