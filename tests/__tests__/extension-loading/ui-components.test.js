/**
 * BookmarkTidy UI Components Tests
 * Tests extension popup and options page UI elements
 */

const { launchExtensionBrowser, navigateToPopupPage, navigateToOptionsPage, captureFailureScreenshot } = require('../../test-utils/extension-helpers');
const { addBookmarks, cleanupAllTestBookmarks, getBookmarkSet } = require('../../test-utils/bookmark-fixtures');

async function testPopupComponents() {
  console.log('🚀 Testing popup components...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Navigate to popup page
    await navigateToPopupPage(page, context);
    console.log('✅ Navigated to popup page');

    // Test popup elements
    const popupTitle = await page.locator('h2.popup-title').textContent();
    console.log('✅ Popup title:', popupTitle);
    
    if (!popupTitle.includes('Bookmark Tidy')) {
      console.log('❌ Popup title incorrect');
      return false;
    }

    const popupDescription = await page.locator('p.popup-description').textContent();
    console.log('✅ Popup description:', popupDescription);

    const manageButton = page.locator('#openOptions');
    const isButtonVisible = await manageButton.isVisible();
    console.log('✅ Manage Bookmarks button visible:', isButtonVisible);
    
    if (!isButtonVisible) {
      console.log('❌ Manage Bookmarks button not visible');
      return false;
    }

    console.log('✅ Popup components test passed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'popup-components', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testOptionsPageLayout() {
  console.log('🚀 Testing options page layout...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Navigate to options page
    await navigateToOptionsPage(page, context);
    console.log('✅ Navigated to options page');

    // Test tab presence and visibility
    const duplicatesTab = page.locator('[data-tab="duplicates"]');
    const deadlinksTab = page.locator('[data-tab="deadlinks"]');
    const settingsTab = page.locator('[data-tab="settings"]');

    const tabsVisible = {
      duplicates: await duplicatesTab.isVisible(),
      deadlinks: await deadlinksTab.isVisible(),
      settings: await settingsTab.isVisible()
    };

    console.log('✅ Tab visibility:', tabsVisible);

    // Verify all tabs are visible
    if (!tabsVisible.duplicates || !tabsVisible.deadlinks || !tabsVisible.settings) {
      console.log('❌ Not all tabs are visible');
      return false;
    }

    // Test tab switching functionality
    console.log('🔍 Testing tab switching...');
    
    // Test each tab
    const tabs = [
      { name: 'Duplicates', selector: '[data-tab="duplicates"]', contentId: '#duplicates' },
      { name: 'Dead Links', selector: '[data-tab="deadlinks"]', contentId: '#deadlinks' },
      { name: 'Settings', selector: '[data-tab="settings"]', contentId: '#settings' }
    ];

    for (const tab of tabs) {
      await page.locator(tab.selector).click();
      await page.waitForTimeout(500);
      
      const isActive = await page.locator(tab.selector).evaluate(el => el.classList.contains('active'));
      const contentVisible = await page.locator(tab.contentId).isVisible();
      
      console.log(`✅ ${tab.name} tab - Active: ${isActive}, Content visible: ${contentVisible}`);
      
      if (!isActive || !contentVisible) {
        console.log(`❌ ${tab.name} tab not working properly`);
        return false;
      }
    }

    console.log('✅ Options page layout test passed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'options-page-layout', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testUIResponsiveness() {
  console.log('🚀 Testing UI responsiveness...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    await navigateToOptionsPage(page, context);

    // Test different viewport sizes
    const viewports = [
      { name: 'Mobile', width: 400, height: 600 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1280, height: 720 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Check if tabs are still functional
      const tabsContainer = page.locator('.tabs');
      const tabsVisible = await tabsContainer.isVisible();
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}) - Tabs visible: ${tabsVisible}`);
      
      if (!tabsVisible) {
        console.log(`❌ UI not responsive at ${viewport.name} size`);
        return false;
      }
    }

    console.log('✅ UI responsiveness test passed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'ui-responsiveness', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testUIButtonStates() {
  console.log('🚀 Testing UI button states...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add some test bookmarks first
    await page.goto('https://www.google.com');
    await addBookmarks(page, getBookmarkSet('withDuplicates'));
    
    await navigateToOptionsPage(page, context);

    // Test button states in different tabs
    const buttonTests = [
      {
        tab: '[data-tab="duplicates"]',
        button: '#findDuplicates',
        expectedText: 'Find Duplicates'
      },
      {
        tab: '[data-tab="deadlinks"]',
        button: '#checkDeadLinks', 
        expectedText: 'Check Dead Links'
      }
    ];

    for (const test of buttonTests) {
      await page.locator(test.tab).click();
      await page.waitForTimeout(500);
      
      const button = page.locator(test.button);
      const isVisible = await button.isVisible();
      const buttonText = await button.textContent();
      const isEnabled = await button.isEnabled();
      
      console.log(`✅ Button ${test.button} - Visible: ${isVisible}, Text: "${buttonText.trim()}", Enabled: ${isEnabled}`);
      
      if (!isVisible || !isEnabled) {
        console.log(`❌ Button ${test.button} not in correct state`);
        return false;
      }
    }

    // Clean up test bookmarks
    await cleanupAllTestBookmarks(page);
    
    console.log('✅ UI button states test passed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'ui-button-states', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

// Test runner
async function runUIComponentsTests() {
  console.log('🎯 Running UI Components Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Popup Components', fn: testPopupComponents },
    { name: 'Options Page Layout', fn: testOptionsPageLayout },
    { name: 'UI Responsiveness', fn: testUIResponsiveness },
    { name: 'UI Button States', fn: testUIButtonStates }
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
  
  console.log('\n📊 UI Components Tests Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 Total: ${tests.length}`);
  
  return { passed, failed, total: tests.length };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runUIComponentsTests().catch(console.error);
}

module.exports = {
  testPopupComponents,
  testOptionsPageLayout,
  testUIResponsiveness,
  testUIButtonStates,
  runUIComponentsTests
};
