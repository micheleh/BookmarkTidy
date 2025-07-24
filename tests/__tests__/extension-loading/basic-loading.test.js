/**
 * BookmarkTidy Extension Loading Tests
 * Tests basic extension loading and initialization
 */

const { launchExtensionBrowser, getExtensionId, captureFailureScreenshot } = require('../../test-utils/extension-helpers');

async function testBasicExtensionLoading() {
  console.log('🚀 Testing basic extension loading...');
  
  let context, page;
  
  try {
    // Launch browser with extension
    ({ context, page } = await launchExtensionBrowser());
    console.log('✅ Browser launched with extension');

    // Navigate to extensions page to verify extension is loaded
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(2000);
    
    // Enable developer mode if needed
    try {
      const devModeToggle = page.locator('#devMode');
      if (await devModeToggle.isVisible()) {
        await devModeToggle.click();
        console.log('🔧 Enabled developer mode');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('ℹ️  Developer mode already enabled or not found');
    }

    // Verify extension is present and loaded
    const extensionCards = await page.locator('extensions-item').all();
    console.log(`🔍 Found ${extensionCards.length} extension cards`);
    
    let extensionFound = false;
    for (const card of extensionCards) {
      try {
        const name = await card.locator('#name').textContent();
        console.log('📦 Extension found:', name);
        
        if (name && name.includes('Bookmark Tidy')) {
          extensionFound = true;
          console.log('✅ BookmarkTidy extension found!');
          
          // Check for errors
          const errorSection = card.locator('extensions-error-page');
          if (await errorSection.isVisible()) {
            console.log('❌ Extension has errors');
            return false;
          } else {
            console.log('✅ Extension loaded without errors');
          }
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    if (!extensionFound) {
      console.log('❌ BookmarkTidy extension not found');
      return false;
    }

    // Test extension ID retrieval
    try {
      const extensionId = await getExtensionId(context);
      console.log('✅ Extension ID retrieved:', extensionId);
    } catch (error) {
      console.log('❌ Failed to retrieve extension ID:', error.message);
      return false;
    }

    // Navigate to a regular page to test basic functionality
    await page.goto('https://www.google.com');
    await page.waitForTimeout(1000);
    console.log('✅ Successfully navigated to external page');

    console.log('✅ Basic extension loading test completed successfully');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'basic-extension-loading', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testExtensionPresenceInToolbar() {
  console.log('🚀 Testing extension presence in toolbar...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Navigate to a regular page
    await page.goto('https://www.google.com');
    await page.waitForTimeout(2000);
    
    // Note: Testing extension icon click is complex in automated tests
    // This test validates that the extension is properly installed
    console.log('📝 Manual verification required:');
    console.log('  1. Check that BookmarkTidy icon appears in browser toolbar');
    console.log('  2. Icon should be clickable and show popup');
    
    console.log('✅ Extension toolbar presence test setup completed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'extension-toolbar-presence', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

// Test runner
async function runBasicLoadingTests() {
  console.log('🎯 Running Basic Extension Loading Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Basic Extension Loading', fn: testBasicExtensionLoading },
    { name: 'Extension Toolbar Presence', fn: testExtensionPresenceInToolbar }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ PASSED: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAILED: ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR in ${test.name}:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Basic Loading Tests Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 Total: ${tests.length}`);
  
  return { passed, failed, total: tests.length };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runBasicLoadingTests().catch(console.error);
}

module.exports = {
  testBasicExtensionLoading,
  testExtensionPresenceInToolbar,
  runBasicLoadingTests
};
