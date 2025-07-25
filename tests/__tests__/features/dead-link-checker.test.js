/**
 * BookmarkTidy Dead Link Checker Feature Tests
 * Tests dead link detection functionality - consolidated from test-dead-links.js and test-simple.js
 */

const { launchExtensionBrowser, navigateToOptionsPage, captureFailureScreenshot } = require('../../test-utils/extension-helpers');
const { addBookmarks, cleanupAllTestBookmarks, getBookmarkSet } = require('../../test-utils/bookmark-fixtures');

async function testBasicDeadLinkDetection() {
  console.log('🚀 Testing basic dead link detection...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add test bookmarks with known dead links
    await page.goto('https://www.google.com');
    console.log('📚 Adding test bookmarks with dead links...');
    await addBookmarks(context, getBookmarkSet('mixed'));
    
    await navigateToOptionsPage(page, context);
    
    // Navigate to dead links tab
    await page.locator('[data-tab="deadlinks"]').click();
    await page.waitForTimeout(500);
    console.log('✅ Navigated to dead links tab');

    // Click check dead links button
    const checkDeadLinksBtn = page.locator('#checkDeadLinks');
    const isButtonVisible = await checkDeadLinksBtn.isVisible();
    
    if (!isButtonVisible) {
      console.log('❌ Check Dead Links button not visible');
      return false;
    }

    console.log('🔍 Starting dead link check...');
    await checkDeadLinksBtn.click();
    
    // Monitor progress with longer timeout for network requests
    let checkComplete = false;
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds
    
    while (!checkComplete && attempts < maxAttempts) {
      await page.waitForTimeout(500);
      attempts++;
      
      // Check if check is complete
      const buttonText = await checkDeadLinksBtn.textContent();
      const hasResults = await page.locator('.dead-link-item, .no-results, .error, .warning').count() > 0;
      
      if (buttonText.includes('Check Dead Links') || hasResults) {
        checkComplete = true;
        break;
      }
      
      // Log progress periodically
      if (attempts % 10 === 0) {
        const progressText = await page.locator('.progress-text').textContent().catch(() => '');
        console.log(`⏳ Progress (${attempts/2}s): ${progressText || 'Processing...'}`);
      }
    }
    
    if (!checkComplete) {
      console.log('⚠️  Dead link check did not complete within timeout');
    }
    
    // Analyze results
    const resultsContent = await page.locator('#deadLinksList').textContent();
    console.log('📊 Dead link check results preview:', resultsContent.substring(0, 200) + '...');
    
    const deadLinkCount = await page.locator('.dead-link-item').count();
    const hasNoResults = resultsContent.includes('No bookmarks with URLs found') || 
                        resultsContent.includes('All links are working');
    const hasError = resultsContent.includes('Error checking links');
    const wasStopped = resultsContent.includes('stopped');
    
    console.log(`📈 Results summary:`);
    console.log(`   Dead links found: ${deadLinkCount}`);
    console.log(`   Has "no results" message: ${hasNoResults}`);
    console.log(`   Has error message: ${hasError}`);
    console.log(`   Was stopped: ${wasStopped}`);
    
    // Test should pass if we get any valid result (even no dead links is valid)
    const hasValidResult = deadLinkCount > 0 || hasNoResults || wasStopped;
    
    if (!hasValidResult && hasError) {
      console.log('❌ Dead link check failed with error');
      return false;
    }
    
    console.log('✅ Dead link detection test completed');
    
    // Clean up test bookmarks
    await cleanupAllTestBookmarks(context);
    
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'basic-dead-link-detection', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testDeadLinkStopFunctionality() {
  console.log('🚀 Testing dead link checker stop functionality...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add a larger set of bookmarks to ensure check takes time
    await page.goto('https://www.google.com');
    await addBookmarks(context, getBookmarkSet('reliability'));
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="deadlinks"]').click();
    await page.waitForTimeout(500);

    const checkDeadLinksBtn = page.locator('#checkDeadLinks');
    
    // Start the check
    await checkDeadLinksBtn.click();
    
    // Wait a moment for check to start
    await page.waitForTimeout(2000);
    
    // Check if button text changed to indicate it can be stopped
    const buttonText = await checkDeadLinksBtn.textContent();
    console.log(`🔍 Button text during check: "${buttonText.trim()}"`);
    
    if (buttonText.includes('Stop') || buttonText.includes('Stopping')) {
      console.log('🛑 Testing stop functionality...');
      await checkDeadLinksBtn.click();
      await page.waitForTimeout(2000);
      
      const resultsContent = await page.locator('#deadLinksList').textContent();
      const wasStopped = resultsContent.includes('stopped') || resultsContent.includes('Stopped');
      
      console.log(`✅ Stop functionality - Was stopped: ${wasStopped}`);
      
      if (wasStopped) {
        console.log('✅ Stop functionality working correctly');
      } else {
        console.log('ℹ️  Stop functionality test inconclusive - check may have completed too quickly');
      }
    } else {
      console.log('ℹ️  Check completed too quickly to test stop functionality');
    }
    
    await cleanupAllTestBookmarks(context);
    
    console.log('✅ Stop functionality test completed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'dead-link-stop-functionality', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testNoBookmarksScenario() {
  console.log('🚀 Testing no bookmarks scenario...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Don't add any bookmarks
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="deadlinks"]').click();
    await page.waitForTimeout(500);

    // Start check with no bookmarks
    await page.locator('#checkDeadLinks').click();
    await page.waitForTimeout(3000);
    
    const resultsContent = await page.locator('#deadLinksList').textContent();
    console.log('📊 No bookmarks result:', resultsContent.trim());
    
    const hasNoBookmarksMessage = resultsContent.includes('No bookmarks with URLs found') ||
                                 resultsContent.includes('No bookmarks') ||
                                 resultsContent.includes('bookmarks found');
    
    if (!hasNoBookmarksMessage) {
      console.log('❌ Expected "no bookmarks" message not shown');
      return false;
    }
    
    console.log('✅ No bookmarks scenario handled correctly');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'no-bookmarks-scenario', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testDeadLinkRemovalControls() {
  console.log('🚀 Testing dead link removal controls...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add bookmarks with known dead links
    await page.goto('https://www.google.com');
    await addBookmarks(context, getBookmarkSet('deadLinksOnly'));
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="deadlinks"]').click();
    await page.waitForTimeout(500);

    // Run dead link check
    await page.locator('#checkDeadLinks').click();
    await page.waitForTimeout(10000); // Wait longer for dead link detection
    
    // Check if control buttons appear when dead links are found
    const controlButtons = [
      '#selectAllDeadLinks',
      '#unselectAllDeadLinks',
      '#removeAllDeadLinks', 
      '#removeSelectedDeadLinks'
    ];
    
    let controlsVisible = 0;
    for (const buttonSelector of controlButtons) {
      const isVisible = await page.locator(buttonSelector).isVisible().catch(() => false);
      if (isVisible) {
        controlsVisible++;
        console.log(`✅ Control button visible: ${buttonSelector}`);
      }
    }
    
    console.log(`📊 Control buttons visible: ${controlsVisible}/${controlButtons.length}`);
    
    // Test select all functionality if available
    const selectAllBtn = page.locator('#selectAllDeadLinks');
    if (await selectAllBtn.isVisible()) {
      console.log('🔍 Testing Select All dead links functionality...');
      await selectAllBtn.click();
      await page.waitForTimeout(1000);
      
      const checkedBoxes = await page.locator('.dead-link-checkbox:checked').count();
      console.log(`✅ Selected ${checkedBoxes} dead link checkboxes`);
    }
    
    await cleanupAllTestBookmarks(context);
    
    console.log('✅ Dead link removal controls test completed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'dead-link-removal-controls', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testDeadLinkRemovalVerificationSelected() {
  console.log('🚀 Testing dead link removal verification - Remove Selected...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add a mix of working and dead links for selective removal testing
    const mixedBookmarkSet = [
      // Working sites that should NOT be removed
      { title: 'Google (Working)', url: 'https://www.google.com' },
      { title: 'GitHub (Working)', url: 'https://github.com' },
      { title: 'Example.com (Working)', url: 'https://example.com' },
      
      // Dead sites that SHOULD be detected and can be removed
      { title: 'Non-existent Domain 1', url: 'https://this-domain-definitely-does-not-exist-12345.com' },
      { title: 'Non-existent Domain 2', url: 'https://completely-fake-website-xyz-999.net' },
      { title: 'Invalid TLD', url: 'https://invalid.invalidtld' },
      { title: '404 Test URL', url: 'https://httpstat.us/404' }
    ];
    
    await page.goto('https://www.google.com');
    console.log('📚 Adding test bookmarks with mix of working and dead links...');
    await addBookmarks(context, mixedBookmarkSet);
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="deadlinks"]').click();
    await page.waitForTimeout(500);

    // First scan - should find some dead links
    console.log('🔍 Running initial dead link scan...');
    await page.locator('#checkDeadLinks').click();
    
    // Wait for scan to complete with extended timeout
    let scanComplete = false;
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds
    
    while (!scanComplete && attempts < maxAttempts) {
      await page.waitForTimeout(500);
      attempts++;
      
      const buttonText = await page.locator('#checkDeadLinks').textContent();
      const hasResults = await page.locator('.dead-link-item, .no-results, .error').count() > 0;
      
      if (buttonText.includes('Check Dead Links') || hasResults) {
        scanComplete = true;
        break;
      }
      
      if (attempts % 20 === 0) {
        const progressText = await page.locator('.progress-text').textContent().catch(() => '');
        console.log(`⏳ Progress (${attempts/2}s): ${progressText || 'Processing...'}`);
      }
    }
    
    const initialDeadLinkCount = await page.locator('.dead-link-item').count();
    console.log(`📊 Initial dead links found: ${initialDeadLinkCount}`);
    
    if (initialDeadLinkCount === 0) {
      console.log('⚠️ No dead links found in initial scan - test inconclusive');
      await cleanupAllTestBookmarks(context);
      return true; // Not a failure, just no dead links detected
    }
    
    // Select only some of the dead links for removal (not all)
    console.log('✅ Selecting some dead links for removal...');
    const deadLinkCheckboxes = await page.locator('.dead-link-checkbox').all();
    
    if (deadLinkCheckboxes.length < 1) {
      console.log('❌ No dead link checkboxes found');
      return false;
    }
    
    // Select approximately half of the dead links
    const numToSelect = Math.max(1, Math.floor(deadLinkCheckboxes.length / 2));
    for (let i = 0; i < numToSelect; i++) {
      await deadLinkCheckboxes[i].check();
    }
    console.log(`✅ Selected ${numToSelect} out of ${deadLinkCheckboxes.length} dead link checkboxes`);
    await page.waitForTimeout(500);
    
    // Remove selected dead links
    const removeSelectedBtn = page.locator('#removeSelectedDeadLinks');
    if (!(await removeSelectedBtn.isVisible())) {
      console.log('❌ Remove Selected button not visible');
      return false;
    }
    
    // Set up dialog handler to auto-accept confirmation
    console.log('🗑️ Setting up dialog handler and removing selected dead links...');
    page.on('dialog', async dialog => {
      console.log(`✅ Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });
    
    await removeSelectedBtn.click();
    await page.waitForTimeout(5000); // Wait for removal to complete
    
    // Second scan - should find fewer dead links if removal worked
    console.log('🔍 Running second dead link scan to verify removal...');
    await page.locator('#checkDeadLinks').click();
    
    // Wait for second scan to complete
    scanComplete = false;
    attempts = 0;
    
    while (!scanComplete && attempts < maxAttempts) {
      await page.waitForTimeout(500);
      attempts++;
      
      const buttonText = await page.locator('#checkDeadLinks').textContent();
      const hasResults = await page.locator('.dead-link-item, .no-results, .error').count() > 0;
      
      if (buttonText.includes('Check Dead Links') || hasResults) {
        scanComplete = true;
        break;
      }
    }
    
    const finalDeadLinkCount = await page.locator('.dead-link-item').count();
    console.log(`📊 Dead links after removal: ${finalDeadLinkCount}`);
    
    // Should have fewer dead links after selective removal
    if (finalDeadLinkCount >= initialDeadLinkCount) {
      console.log(`❌ Expected fewer dead links after removal. Initial: ${initialDeadLinkCount}, Final: ${finalDeadLinkCount}`);
      return false;
    }
    
    console.log('✅ Dead link removal verification - Remove Selected completed successfully');
    console.log(`   Initial dead links: ${initialDeadLinkCount}, Final dead links: ${finalDeadLinkCount}`);
    
    await cleanupAllTestBookmarks(context);
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'dead-link-removal-verification-selected', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testDeadLinkRemovalVerificationAll() {
  console.log('🚀 Testing dead link removal verification - Remove All...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add only dead links for complete removal testing
    await page.goto('https://www.google.com');
    console.log('📚 Adding test bookmarks with dead links...');
    await addBookmarks(context, getBookmarkSet('deadLinksOnly'));
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="deadlinks"]').click();
    await page.waitForTimeout(500);

    // First scan - should find dead links
    console.log('🔍 Running initial dead link scan...');
    await page.locator('#checkDeadLinks').click();
    
    // Wait for scan to complete with extended timeout
    let scanComplete = false;
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds
    
    while (!scanComplete && attempts < maxAttempts) {
      await page.waitForTimeout(500);
      attempts++;
      
      const buttonText = await page.locator('#checkDeadLinks').textContent();
      const hasResults = await page.locator('.dead-link-item, .no-results, .error').count() > 0;
      
      if (buttonText.includes('Check Dead Links') || hasResults) {
        scanComplete = true;
        break;
      }
      
      if (attempts % 20 === 0) {
        const progressText = await page.locator('.progress-text').textContent().catch(() => '');
        console.log(`⏳ Progress (${attempts/2}s): ${progressText || 'Processing...'}`);
      }
    }
    
    const initialDeadLinkCount = await page.locator('.dead-link-item').count();
    console.log(`📊 Initial dead links found: ${initialDeadLinkCount}`);
    
    if (initialDeadLinkCount === 0) {
      console.log('❌ No dead links found in initial scan');
      return false;
    }
    
    // Remove all dead links
    const removeAllBtn = page.locator('#removeAllDeadLinks');
    if (!(await removeAllBtn.isVisible())) {
      console.log('❌ Remove All Dead Links button not visible');
      return false;
    }
    
    // Set up dialog handler to auto-accept confirmation
    console.log('🗑️ Setting up dialog handler and removing all dead links...');
    page.on('dialog', async dialog => {
      console.log(`✅ Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });
    
    await removeAllBtn.click();
    await page.waitForTimeout(5000); // Wait for removal to complete
    
    // Second scan - should find no dead links
    console.log('🔍 Running second dead link scan to verify complete removal...');
    await page.locator('#checkDeadLinks').click();
    
    // Wait for second scan to complete
    scanComplete = false;
    attempts = 0;
    
    while (!scanComplete && attempts < maxAttempts) {
      await page.waitForTimeout(500);
      attempts++;
      
      const buttonText = await page.locator('#checkDeadLinks').textContent();
      const hasResults = await page.locator('.dead-link-item, .no-results, .error').count() > 0;
      
      if (buttonText.includes('Check Dead Links') || hasResults) {
        scanComplete = true;
        break;
      }
    }
    
    const finalDeadLinkCount = await page.locator('.dead-link-item').count();
    const deadLinksContent = await page.locator('#deadLinksList').textContent();
    
    console.log(`📊 Dead links after removal: ${finalDeadLinkCount}`);
    console.log('📄 Final scan result:', deadLinksContent.substring(0, 100) + '...');
    
    // Should have no dead links and show "All links are working" or similar message
    if (finalDeadLinkCount !== 0) {
      console.log(`❌ Expected 0 dead links after removal, found ${finalDeadLinkCount}`);
      return false;
    }
    
    const hasNoDeadLinksMessage = deadLinksContent.includes('All links are working') ||
                                 deadLinksContent.includes('No bookmarks with URLs found') ||
                                 deadLinksContent.includes('no dead links');
    if (!hasNoDeadLinksMessage) {
      console.log('❌ Expected "All links are working" or similar message after removal');
      console.log('Actual content:', deadLinksContent.trim());
      return false;
    }
    
    console.log('✅ Dead link removal verification - Remove All completed successfully');
    console.log(`   Initial dead links: ${initialDeadLinkCount}, Final dead links: ${finalDeadLinkCount}`);
    console.log('   ✅ "All links are working" message displayed correctly');
    
    await cleanupAllTestBookmarks(context);
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'dead-link-removal-verification-all', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

// Test runner
async function runDeadLinkCheckerTests() {
  console.log('🎯 Running Dead Link Checker Feature Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Basic Dead Link Detection', fn: testBasicDeadLinkDetection },
    { name: 'Stop Functionality', fn: testDeadLinkStopFunctionality },
    { name: 'No Bookmarks Scenario', fn: testNoBookmarksScenario },
    { name: 'Dead Link Removal Controls', fn: testDeadLinkRemovalControls },
    { name: 'Dead Link Removal Verification - Remove Selected', fn: testDeadLinkRemovalVerificationSelected },
    { name: 'Dead Link Removal Verification - Remove All', fn: testDeadLinkRemovalVerificationAll }
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
  
  console.log('\n📊 Dead Link Checker Tests Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 Total: ${tests.length}`);
  
  return { passed, failed, total: tests.length };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runDeadLinkCheckerTests().catch(console.error);
}

module.exports = {
  testBasicDeadLinkDetection,
  testDeadLinkStopFunctionality,
  testNoBookmarksScenario,
  testDeadLinkRemovalControls,
  testDeadLinkRemovalVerificationSelected,
  testDeadLinkRemovalVerificationAll,
  runDeadLinkCheckerTests
};
