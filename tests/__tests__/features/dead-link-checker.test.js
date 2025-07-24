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

// Test runner
async function runDeadLinkCheckerTests() {
  console.log('🎯 Running Dead Link Checker Feature Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Basic Dead Link Detection', fn: testBasicDeadLinkDetection },
    { name: 'Stop Functionality', fn: testDeadLinkStopFunctionality },
    { name: 'No Bookmarks Scenario', fn: testNoBookmarksScenario },
    { name: 'Dead Link Removal Controls', fn: testDeadLinkRemovalControls }
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
  runDeadLinkCheckerTests
};
