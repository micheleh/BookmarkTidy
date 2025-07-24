const { chromium } = require('playwright');
const path = require('path');

async function testDeadLinkDetection() {
  console.log('Starting dead link detection test...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${path.resolve('./src')}`,
      `--load-extension=${path.resolve('./src')}`
    ]
  });

  // Wait for the browser to fully load
  await new Promise(resolve => setTimeout(resolve, 2000));

  const context = browser.contexts()[0];
  const page = await context.newPage();

  try {
    // Navigate to Google first to ensure we have a working page
    await page.goto('https://www.google.com');
    console.log('Browser is working, adding test bookmarks...');

    // Add test bookmarks
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const bookmarks = [
          { title: 'Good Site', url: 'https://www.google.com' },
          { title: 'Dead Site 1', url: 'http://thissitedoesnotexist12345.com' },
          { title: 'Dead Site 2', url: 'http://anotherfakeurl9999.com' }
        ];

        let created = 0;
        bookmarks.forEach(bookmark => {
          chrome.bookmarks.create(bookmark, () => {
            created++;
            if (created === bookmarks.length) {
              resolve();
            }
          });
        });
      });
    });

    console.log('Test bookmarks created');

    // Get the extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => 
      target.type() === 'background_page' && target.url().includes('chrome-extension://')
    );

    if (!extensionTarget) {
      throw new Error('Extension not found');
    }

    const extensionId = extensionTarget.url().split('/')[2];
    console.log('Extension ID:', extensionId);

    // Navigate to the extension options page
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // Wait for the page to load
    await page.waitForSelector('.tab-button[data-tab="deadLinks"]');

    // Click on Dead Links tab
    await page.click('.tab-button[data-tab="deadLinks"]');

    // Wait for tab to be active
    await page.waitForTimeout(500);

    console.log('Clicking Check Dead Links button...');

    // Click the Check Dead Links button
    await page.click('#checkDeadLinks');

    console.log('Waiting for results...');

    // Wait for results with a longer timeout
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds
    let hasResults = false;

    while (attempts < maxAttempts && !hasResults) {
      await page.waitForTimeout(500);
      attempts++;

      // Check for any result elements
      const resultElements = await page.$$('.dead-link-item, .no-results, .error, .warning');
      const buttonText = await page.textContent('#checkDeadLinks').catch(() => '');

      if (resultElements.length > 0 || buttonText === 'Check Dead Links') {
        hasResults = true;
        break;
      }

      // Log progress every 10 attempts (5 seconds)
      if (attempts % 10 === 0) {
        const progressElement = await page.$('.progress-text');
        if (progressElement) {
          const progressText = await progressElement.textContent();
          console.log(`Progress (${attempts/2}s): ${progressText}`);
        }
      }
    }

    // Get results
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
          const title = item.querySelector('.bookmark-title')?.textContent || 'N/A';
          const url = item.querySelector('.bookmark-url')?.textContent || 'N/A';
          const error = item.querySelector('.error-info')?.textContent || 'N/A';
          deadLinks.push({ title, url, error });
        });
        return { type: 'dead-links', count: deadLinks.length, links: deadLinks };
      }

      return { type: 'unknown', message: container.innerHTML };
    });

    console.log('\n=== RESULTS ===');
    console.log('Type:', results.type);

    if (results.type === 'dead-links') {
      console.log(`Found ${results.count} dead links:`);
      results.links.forEach((link, i) => {
        console.log(`${i + 1}. ${link.title}`);
        console.log(`   URL: ${link.url}`);
        console.log(`   Error: ${link.error}`);
      });

      // Check if dead sites were detected
      const deadUrls = results.links.map(link => link.url);
      const shouldBeDead = ['http://thissitedoesnotexist12345.com', 'http://anotherfakeurl9999.com'];
      
      console.log('\nValidation:');
      shouldBeDead.forEach(url => {
        if (deadUrls.includes(url)) {
          console.log(`✓ Correctly detected: ${url}`);
        } else {
          console.log(`✗ Failed to detect: ${url}`);
        }
      });

      if (deadUrls.includes('https://www.google.com')) {
        console.log('✗ Incorrectly flagged Google as dead');
      } else {
        console.log('✓ Correctly left Google unflagged');
      }

    } else {
      console.log('Message:', results.message);
    }

    // Clean up
    console.log('\nCleaning up test bookmarks...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.bookmarks.search({}, (bookmarks) => {
          const testBookmarks = bookmarks.filter(b => 
            b.url && (
              b.url.includes('thissitedoesnotexist12345.com') ||
              b.url.includes('anotherfakeurl9999.com') ||
              (b.title && b.title === 'Good Site' && b.url === 'https://www.google.com')
            )
          );

          if (testBookmarks.length === 0) {
            resolve();
            return;
          }

          let removed = 0;
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

    console.log('Test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testDeadLinkDetection().catch(console.error);
