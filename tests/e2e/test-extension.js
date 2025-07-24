const { chromium } = require('playwright');
const path = require('path');

async function testExtension() {
  console.log('🚀 Starting Bookmark Tidy extension test...');
  console.log('📁 Extension path:', __dirname);
  
  // Launch browser with extension
  const extensionPath = path.join(__dirname);
  const context = await chromium.launchPersistentContext('', {
    headless: false, // We need to see the extension UI
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-default-apps',
      '--enable-logging',
      '--v=1'
    ]
  });

  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser console error:', msg.text());
    }
  });

  try {
    console.log('✅ Browser launched with extension');

    // Navigate to extensions page to verify extension is loaded
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(3000);
    
    // Enable developer mode first
    try {
      const devModeToggle = page.locator('#devMode');
      if (await devModeToggle.isVisible()) {
        await devModeToggle.click();
        console.log('🔧 Enabled developer mode');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('ℹ️  Developer mode toggle not found or already enabled');
    }

    // Look for our extension by different methods
    const extensionCards = await page.locator('extensions-item').all();
    console.log(`🔍 Found ${extensionCards.length} extension cards`);
    
    let extensionFound = false;
    for (const card of extensionCards) {
      const name = await card.locator('#name').textContent().catch(() => '');
      console.log('📦 Extension found:', name);
      if (name.includes('Bookmark Tidy')) {
        extensionFound = true;
        console.log('✅ Bookmark Tidy extension found!');
        
        // Check if there are any errors
        const errorSection = card.locator('extensions-error-page');
        if (await errorSection.isVisible()) {
          console.log('❌ Extension has errors');
        } else {
          console.log('✅ Extension loaded without errors');
        }
        break;
      }
    }
    
    if (!extensionFound) {
      console.log('❌ Bookmark Tidy extension not found');
      console.log('💡 Trying to manually load the extension...');
      
      // Try to load unpacked extension
      const loadUnpackedBtn = page.locator('text=Load unpacked');
      if (await loadUnpackedBtn.isVisible()) {
        console.log('🔄 Load unpacked button found, but automated file selection is not possible');
        console.log('📝 Manual step required: Click "Load unpacked" and select the BookmarkTidy folder');
      }
      return;
    }

    // Test popup
    console.log('🔍 Testing extension popup...');
    
    // Go to a regular page first (extensions page doesn't allow popup)
    await page.goto('https://www.google.com');
    await page.waitForTimeout(1000);

    // Try to find and click the extension icon
    // Note: Extension popup testing is limited in automated tests
    // The extension would need to be manually clicked in the browser toolbar

    console.log('✅ Basic extension loading test completed');
    console.log('');
    console.log('📝 Manual testing steps:');
    console.log('1. Look for the Bookmark Tidy icon in the browser toolbar');
    console.log('2. Click the icon to open the popup');
    console.log('3. Click "Manage Bookmarks" to open the options page');
    console.log('4. Test the duplicate finder and dead link checker tabs');
    console.log('5. Try the settings tab to toggle automatic sorting');

    // Keep browser open for manual testing
    console.log('');
    console.log('🔍 Browser will stay open for manual testing...');
    console.log('Press Ctrl+C to close when done testing');

    // Wait indefinitely for manual testing
    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await context.close();
  }
}

if (require.main === module) {
  testExtension().catch(console.error);
}

module.exports = { testExtension };
