const { chromium } = require('playwright');
const path = require('path');

async function testDeadLinkDetection() {
  console.log('🚀 Starting Dead Link Detection Test...');
  
  // Launch browser with extension
  const extensionPath = path.join(__dirname, '..', '..');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-default-apps'
    ]
  });

  // Wait for the extension to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  const backgroundPage = await context.backgroundPages()[0];
  if (!backgroundPage) {
    throw new Error("Extension background page not found.");
  }

  try {
    console.log('Adding test bookmarks via background page...');
    await backgroundPage.evaluate(async () => {
      const bookmarksToAdd = [
        { title: 'Working Site - Google', url: 'https://www.google.com' },
        { title: 'Dead Site Test', url: 'http://example.thissitedoesnotexist.com' },
        { title: 'Another Dead Site', url: 'http://nonexistent.fakeurltest.com' },
        { title: 'Slow/Timeout URL', url: 'http://httpstat.us/200?sleep=10000' }
      ];

      for (const bookmark of bookmarksToAdd) {
        await new Promise(resolve => chrome.bookmarks.create(bookmark, resolve));
      }
    });
    console.log('Test bookmarks added successfully');

    const page = await context.newPage();
    // ... rest of the test code
    
    // Wait a moment for bookmarks to be created
    await page.waitForTimeout(1000);
    
    // Get extension ID
    const extensionId = await getExtensionId(context);
    console.log('Extension ID found:', extensionId);
    
    await page.goto(`chrome-extension://${extensionId}/src/options.html`);
    
    console.log('Navigating to Dead Links tab...');
    
    // Click on the Dead Links tab
    await page.click('[data-tab="deadlinks"]');
    
    // Wait for tab to be active
    await page.waitForTimeout(500);
    
    console.log('Starting dead link check...');
    
    // Click the Check Dead Links button
    await page.click('#checkDeadLinks');
    
    // Wait for the check to complete (or at least start showing results)
    // We'll wait up to 30 seconds for results
    let checkComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds
    
    while (!checkComplete && attempts < maxAttempts) {
      await page.waitForTimeout(500);
      attempts++;
      
      // Check if we have results or if the button has changed back
      const buttonText = await page.textContent('#checkDeadLinks');
      const hasResults = await page.$('.dead-link-item, .no-results, .error, .warning');
      
      if (buttonText === 'Check Dead Links' || hasResults) {
        checkComplete = true;
      }
      
      // Show progress
      if (attempts % 4 === 0) {
        const progressText = await page.textContent('.progress-text');
        if (progressText) {
          console.log(`Progress: ${progressText}`);
        }
      }
    }
    
    if (!checkComplete) {
      console.log('Dead link check did not complete within timeout');
    }
    
    // Check the results
    const results = await page.evaluate(() => {
      const container = document.getElementById('deadLinksList');
      const deadLinkItems = container.querySelectorAll('.dead-link-item');
      const noResults = container.querySelector('.no-results');
      const error = container.querySelector('.error');
      const warning = container.querySelector('.warning');
      
      if (error) {
        return { type: 'error', message: error.textContent };
      }
      
      if (warning) {
        return { type: 'warning', message: warning.textContent };
      }
      
      if (noResults) {
        return { type: 'no-results', message: noResults.textContent };
      }
      
      if (deadLinkItems.length > 0) {
        const deadLinks = [];
        deadLinkItems.forEach(item => {
          const title = item.querySelector('.bookmark-title').textContent;
          const url = item.querySelector('.bookmark-url').textContent;
          const error = item.querySelector('.error-info').textContent;
          deadLinks.push({ title, url, error });
        });
        return { type: 'dead-links', count: deadLinks.length, links: deadLinks };
      }
      
      return { type: 'unknown', message: 'Unknown result state' };
    });
    
    console.log('\n=== DEAD LINK CHECK RESULTS ===');
    console.log('Result type:', results.type);
    
    if (results.type === 'dead-links') {
      console.log(`Found ${results.count} dead links:`);
      results.links.forEach((link, index) => {
        console.log(`${index + 1}. ${link.title}`);
        console.log(`   URL: ${link.url}`);
        console.log(`   Error: ${link.error}`);
        console.log('');
      });
      
      // Verify that our test dead URLs were detected
      const deadUrls = results.links.map(link => link.url);
      const expectedDeadUrls = [
        'http://example.thissitedoesnotexist.com',
        'http://nonexistent.fakeurltest.com'
      ];
      
      let correctDetections = 0;
      expectedDeadUrls.forEach(expectedUrl => {
        if (deadUrls.includes(expectedUrl)) {
          correctDetections++;
          console.log(`✓ Correctly detected dead URL: ${expectedUrl}`);
        } else {
          console.log(`✗ Failed to detect dead URL: ${expectedUrl}`);
        }
      });
      
      // Check if working URL was incorrectly flagged
      const workingUrl = 'https://www.google.com';
      if (deadUrls.includes(workingUrl)) {
        console.log(`✗ Incorrectly flagged working URL as dead: ${workingUrl}`);
      } else {
        console.log(`✓ Correctly left working URL unflagged: ${workingUrl}`);
      }
      
      console.log(`\nSummary: ${correctDetections}/${expectedDeadUrls.length} dead URLs correctly detected`);
      
    } else {
      console.log('Message:', results.message);
    }
    
    // Clean up test bookmarks
    console.log('\nCleaning up test bookmarks...');
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.bookmarks.search({}, (bookmarks) => {
          const testBookmarks = bookmarks.filter(b => 
            b.url && (
              b.url.includes('example.thissitedoesnotexist.com') ||
              b.url.includes('nonexistent.fakeurltest.com') ||
              b.url.includes('httpstat.us/200?sleep=10000') ||
              (b.title && b.title.includes('Working Site - Google'))
            )
          );
          
          let removed = 0;
          if (testBookmarks.length === 0) {
            resolve();
            return;
          }
          
          testBookmarks.forEach(bookmark => {
            chrome.bookmarks.remove(bookmark.id, () => {
              removed++;
              if (removed === testBookmarks.length) {
                resolve();
              }
            });
          });
        });
      });
    });
    
    console.log('Test bookmarks cleaned up');
    console.log('\n=== TEST COMPLETE ===');

    await context.close();
  } catch (error) {
    console.error('Test failed:', error);
    await context.close();
  }
}

async function getExtensionId(context) {
  // Get extension ID by navigating to chrome://extensions and finding it
  const page = await context.newPage();
  await page.goto('chrome://extensions/');
  await page.waitForTimeout(1000);
  
  try {
    // Enable developer mode first
    const devModeToggle = page.locator('#devMode');
    if (await devModeToggle.isVisible()) {
      await devModeToggle.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    // Developer mode might already be enabled
  }

  // Find the BookmarkTidy extension
  const extensionCards = await page.locator('extensions-item').all();
  for (const card of extensionCards) {
    try {
      const name = await card.locator('#name').textContent();
      if (name && name.includes('Bookmark Tidy')) {
        // Get the extension ID from the card's attributes or URL
        const cardId = await card.getAttribute('id');
        if (cardId) {
          await page.close();
          return cardId;
        }
      }
    } catch (e) {
      // Continue to next card
    }
  }
  
  await page.close();
  
  // Fallback: return a common pattern (extension IDs are usually 32 characters)
  // For now, we'll generate a dummy ID and handle errors gracefully
  return 'bookmark-tidy-extension';
}

// Run the test
testDeadLinkDetection().catch(console.error);
