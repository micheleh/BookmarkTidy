const { chromium } = require('playwright');
const path = require('path');

async function monitorExtension() {
  console.log('Launching Chrome with BookmarkTidy extension...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${path.resolve('.')}`,
      `--load-extension=${path.resolve('.')}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  // Wait for browser to fully initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  const contexts = browser.contexts();
  let context, page;
  
  if (contexts.length > 0) {
    context = contexts[0];
    const pages = context.pages();
    if (pages.length > 0) {
      page = pages[0];
    } else {
      page = await context.newPage();
    }
  } else {
    context = await browser.newContext();
    page = await context.newPage();
  }

  try {
    // Navigate to a working page first
    await page.goto('https://www.google.com');
    console.log('Browser loaded successfully');

    // Add some test bookmarks for demonstration
    console.log('Adding test bookmarks...');
    await page.evaluate(() => {
      const testBookmarks = [
        { title: 'Working Site', url: 'https://www.google.com' },
        { title: 'GitHub', url: 'https://github.com' },
        { title: 'Dead Site 1', url: 'http://thissitedoesnotexist12345.com' },
        { title: 'Dead Site 2', url: 'http://anotherfakeurl9999.com' },
        { title: 'Duplicate Site', url: 'https://www.google.com' }, // Duplicate for testing
      ];

      return new Promise((resolve) => {
        let created = 0;
        testBookmarks.forEach(bookmark => {
          chrome.bookmarks.create(bookmark, () => {
            created++;
            if (created === testBookmarks.length) {
              resolve();
            }
          });
        });
      });
    });

    console.log('Test bookmarks created');

    // Find the extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => 
      target.type() === 'background_page' && target.url().includes('chrome-extension://')
    );

    if (!extensionTarget) {
      console.log('Extension not found. Available targets:');
      targets.forEach(target => {
        console.log(`- ${target.type()}: ${target.url()}`);
      });
      throw new Error('Extension not found');
    }

    const extensionId = extensionTarget.url().split('/')[2];
    console.log(`Extension loaded with ID: ${extensionId}`);

    // Open the extension options page
    const optionsUrl = `chrome-extension://${extensionId}/options.html`;
    console.log(`Opening extension options at: ${optionsUrl}`);
    
    await page.goto(optionsUrl);

    // Wait for the page to load
    await page.waitForSelector('.tab-button', { timeout: 10000 });
    console.log('Extension options page loaded successfully');

    // Monitor the extension interface
    console.log('\n=== EXTENSION INTERFACE MONITORING ===');
    
    // Check available tabs
    const tabs = await page.$$eval('.tab-button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        tab: btn.dataset.tab
      }))
    );
    
    console.log('Available tabs:', tabs);

    // Function to monitor a specific tab
    async function monitorTab(tabId, tabName) {
      console.log(`\n--- Monitoring ${tabName} Tab ---`);
      
      // Click the tab
      await page.click(`[data-tab="${tabId}"]`);
      await page.waitForTimeout(500);
      
      // Check if tab is active
      const isActive = await page.$eval(`[data-tab="${tabId}"]`, btn => 
        btn.classList.contains('active')
      );
      console.log(`${tabName} tab active:`, isActive);
      
      // Get tab content
      const tabContent = await page.$eval(`#${tabId}`, tab => {
        const buttons = Array.from(tab.querySelectorAll('button')).map(btn => ({
          id: btn.id,
          text: btn.textContent.trim(),
          disabled: btn.disabled
        }));
        
        const containers = Array.from(tab.querySelectorAll('[id$="List"]')).map(container => ({
          id: container.id,
          hasContent: container.innerHTML.trim().length > 0,
          childrenCount: container.children.length
        }));
        
        return { buttons, containers };
      });
      
      console.log(`${tabName} buttons:`, tabContent.buttons);
      console.log(`${tabName} containers:`, tabContent.containers);
    }

    // Monitor each tab
    for (const tab of tabs) {
      await monitorTab(tab.tab, tab.text);
    }

    // Test the Dead Links functionality
    console.log('\n--- Testing Dead Links Functionality ---');
    await page.click('[data-tab="deadLinks"]');
    await page.waitForTimeout(500);

    console.log('Clicking "Check Dead Links" button...');
    await page.click('#checkDeadLinks');

    // Monitor the progress
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(500);
      attempts++;
      
      // Check button state
      const buttonText = await page.textContent('#checkDeadLinks').catch(() => 'N/A');
      
      // Check for progress
      const progressText = await page.textContent('.progress-text').catch(() => null);
      
      // Check for results
      const hasResults = await page.$('.dead-link-item, .no-results, .error, .warning');
      
      if (attempts % 4 === 0) { // Log every 2 seconds
        console.log(`Progress (${attempts/2}s): Button="${buttonText}", Progress="${progressText || 'None'}", HasResults=${!!hasResults}`);
      }
      
      // Check if finished
      if (buttonText === 'Check Dead Links' || hasResults) {
        console.log('Dead link check completed!');
        break;
      }
    }

    // Get final results
    const results = await page.evaluate(() => {
      const container = document.getElementById('deadLinksList');
      const deadLinkItems = container.querySelectorAll('.dead-link-item');
      const noResults = container.querySelector('.no-results');
      const error = container.querySelector('.error');
      
      if (error) {
        return { type: 'error', message: error.textContent };
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
        return { type: 'results', count: deadLinks.length, links: deadLinks };
      }
      
      return { type: 'unknown', content: container.innerHTML };
    });

    console.log('\n=== FINAL RESULTS ===');
    console.log('Result type:', results.type);
    
    if (results.type === 'results') {
      console.log(`Found ${results.count} dead links:`);
      results.links.forEach((link, i) => {
        console.log(`${i + 1}. ${link.title} - ${link.url}`);
        console.log(`   Error: ${link.error}`);
      });
    } else {
      console.log('Message:', results.message || results.content);
    }

    console.log('\n=== MONITORING COMPLETE ===');
    console.log('Browser will remain open for manual testing.');
    console.log('Press Ctrl+C to close when done.');
    
    // Keep the browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('Error during monitoring:', error);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

monitorExtension().catch(console.error);
