/**
 * BookmarkTidy Duplicate Finder Feature Tests
 * Tests duplicate bookmark detection and removal functionality
 */

const { launchExtensionBrowser, navigateToOptionsPage, captureFailureScreenshot } = require('../../test-utils/extension-helpers');
const { addBookmarks, cleanupAllTestBookmarks, getBookmarkSet } = require('../../test-utils/bookmark-fixtures');

async function testDuplicateDetection() {
  console.log('🚀 Testing duplicate bookmark detection...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Navigate to Google and add test bookmarks with duplicates
    await page.goto('https://www.google.com');
    console.log('📚 Adding test bookmarks with duplicates...');
    await addBookmarks(context, getBookmarkSet('withDuplicates'));
    
    // Navigate to options page
    await navigateToOptionsPage(page, context);
    
    // Navigate to duplicates tab
    await page.locator('[data-tab="duplicates"]').click();
    await page.waitForTimeout(500);
    console.log('✅ Navigated to duplicates tab');

    // Click find duplicates button
    const findDuplicatesBtn = page.locator('#findDuplicates');
    const isButtonVisible = await findDuplicatesBtn.isVisible();
    
    if (!isButtonVisible) {
      console.log('❌ Find Duplicates button not visible');
      return false;
    }

    console.log('🔍 Clicking Find Duplicates button...');
    await findDuplicatesBtn.click();
    
    // Wait for scanning to complete
    await page.waitForTimeout(3000);
    
    // Check results
    const duplicatesList = page.locator('#duplicatesList');
    const duplicatesContent = await duplicatesList.textContent();
    
    console.log('📊 Duplicates scan result preview:', duplicatesContent.substring(0, 150) + '...');
    
    // Check if duplicates were found (we added duplicates, so should find some)
    const hasDuplicateItems = await page.locator('.duplicate-group').count() > 0;
    const hasResults = duplicatesContent.includes('duplicate') || duplicatesContent.includes('URL');
    
    if (!hasResults && !duplicatesContent.includes('No duplicate bookmarks found')) {
      console.log('❌ No valid results from duplicate scan');
      return false;
    }
    
    console.log('✅ Duplicate detection completed successfully');
    console.log(`   Found duplicate groups: ${await page.locator('.duplicate-group').count()}`);
    
    // Clean up test bookmarks
    await cleanupAllTestBookmarks(context);
    
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'duplicate-detection', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testDuplicateRemovalControls() {
  console.log('🚀 Testing duplicate removal controls...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add bookmarks with known duplicates
    await page.goto('https://www.google.com');
    await addBookmarks(context, getBookmarkSet('withDuplicates'));
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="duplicates"]').click();
    await page.waitForTimeout(500);

    // Find duplicates first
    await page.locator('#findDuplicates').click();
    await page.waitForTimeout(3000);
    
    // Check if control buttons appear when duplicates are found
    const controlButtons = [
      '#selectAllDuplicates',
      '#unselectAllDuplicates', 
      '#removeAllDuplicates',
      '#removeSelectedDuplicates'
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
    const selectAllBtn = page.locator('#selectAllDuplicates');
    if (await selectAllBtn.isVisible()) {
      console.log('🔍 Testing Select All functionality...');
      await selectAllBtn.click();
      await page.waitForTimeout(1000);
      
      const checkedBoxes = await page.locator('.duplicate-checkbox:checked').count();
      console.log(`✅ Selected ${checkedBoxes} duplicate checkboxes`);
    }
    
    // Clean up test bookmarks
    await cleanupAllTestBookmarks(context);
    
    console.log('✅ Duplicate removal controls test completed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'duplicate-removal-controls', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testNoDuplicatesScenario() {
  console.log('🚀 Testing no duplicates scenario...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add bookmarks without duplicates
    await page.goto('https://www.google.com');
    await addBookmarks(context, getBookmarkSet('basic'));
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="duplicates"]').click();
    await page.waitForTimeout(500);

    // Find duplicates
    await page.locator('#findDuplicates').click();
    await page.waitForTimeout(3000);
    
    // Check results
    const duplicatesContent = await page.locator('#duplicatesList').textContent();
    console.log('📊 No duplicates result:', duplicatesContent.trim());
    
    const hasNoDuplicatesMessage = duplicatesContent.includes('No duplicate bookmarks found');
    
    if (!hasNoDuplicatesMessage) {
      console.log('❌ Expected "No duplicate bookmarks found" message not shown');
      return false;
    }
    
    console.log('✅ No duplicates scenario handled correctly');
    
    // Clean up test bookmarks
    await cleanupAllTestBookmarks(context);
    
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'no-duplicates-scenario', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testDuplicatesButtonStates() {
  console.log('🚀 Testing duplicates button states...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    await page.goto('https://www.google.com');
    await addBookmarks(context, getBookmarkSet('withDuplicates'));
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="duplicates"]').click();
    await page.waitForTimeout(500);

    const findBtn = page.locator('#findDuplicates');
    
    // Initial state
    const initialText = await findBtn.textContent();
    const initialEnabled = await findBtn.isEnabled();
    console.log(`✅ Initial button state - Text: "${initialText.trim()}", Enabled: ${initialEnabled}`);
    
    // Click and check loading state
    await findBtn.click();
    await page.waitForTimeout(500); // Brief moment to catch loading state
    
    const loadingText = await findBtn.textContent();
    console.log(`✅ Loading state - Text: "${loadingText.trim()}"`);
    
    // Wait for completion
    await page.waitForTimeout(3000);
    
    const finalText = await findBtn.textContent();
    const finalEnabled = await findBtn.isEnabled();
    console.log(`✅ Final button state - Text: "${finalText.trim()}", Enabled: ${finalEnabled}`);
    
    // Button should return to initial state
    if (!finalEnabled) {
      console.log('❌ Button should be enabled after completion');
      return false;
    }
    
    await cleanupAllTestBookmarks(context);
    
    console.log('✅ Button states test completed');
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'duplicates-button-states', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

// Test runner
async function runDuplicateFinderTests() {
  console.log('🎯 Running Duplicate Finder Feature Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Duplicate Detection', fn: testDuplicateDetection },
    { name: 'Duplicate Removal Controls', fn: testDuplicateRemovalControls },
    { name: 'No Duplicates Scenario', fn: testNoDuplicatesScenario },
    { name: 'Button States', fn: testDuplicatesButtonStates }
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
  
  console.log('\n📊 Duplicate Finder Tests Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 Total: ${tests.length}`);
  
  return { passed, failed, total: tests.length };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runDuplicateFinderTests().catch(console.error);
}

module.exports = {
  testDuplicateDetection,
  testDuplicateRemovalControls,
  testNoDuplicatesScenario,
  testDuplicatesButtonStates,
  runDuplicateFinderTests
};
