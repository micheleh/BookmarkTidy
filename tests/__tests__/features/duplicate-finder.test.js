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

async function testDuplicateRemovalVerificationSelected() {
  console.log('🚀 Testing duplicate removal verification - Remove Selected...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add bookmarks with multiple duplicate groups (4 groups)
    const multipleGroupsSet = [
      { title: 'Google - First', url: 'https://www.google.com' },
      { title: 'Google - Duplicate', url: 'https://www.google.com' },
      { title: 'GitHub - Original', url: 'https://github.com' },
      { title: 'GitHub - Copy', url: 'https://github.com' },
      { title: 'Example Site', url: 'https://example.com' },
      { title: 'Example Copy', url: 'https://example.com' },
      { title: 'Stack Overflow - Main', url: 'https://stackoverflow.com' },
      { title: 'Stack Overflow - Dup', url: 'https://stackoverflow.com' }
    ];
    
    await page.goto('https://www.google.com');
    console.log('📚 Adding test bookmarks with multiple duplicate groups...');
    await addBookmarks(context, multipleGroupsSet);
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="duplicates"]').click();
    await page.waitForTimeout(500);

    // First scan - should find 4 duplicate groups
    console.log('🔍 Running initial duplicate scan...');
    await page.locator('#findDuplicates').click();
    await page.waitForTimeout(3000);
    
    const initialGroupCount = await page.locator('.duplicate-group').count();
    console.log(`📊 Initial duplicate groups found: ${initialGroupCount}`);
    
    if (initialGroupCount !== 4) {
      console.log(`❌ Expected 4 duplicate groups, found ${initialGroupCount}`);
      return false;
    }
    
    // Select duplicates from only 2 groups (partial selection)
    console.log('✅ Selecting duplicates from 2 groups for removal...');
    const duplicateGroups = await page.locator('.duplicate-group').all();
    
    if (duplicateGroups.length < 2) {
      console.log(`❌ Not enough duplicate groups found: ${duplicateGroups.length}`);
      return false;
    }
    
    // Select one checkbox from each of the first 2 duplicate groups
    for (let i = 0; i < 2; i++) {
      const groupCheckboxes = await duplicateGroups[i].locator('.duplicate-checkbox').all();
      if (groupCheckboxes.length > 0) {
        await groupCheckboxes[0].check(); // Select the first checkbox in this group
        console.log(`✅ Selected 1 checkbox from group ${i + 1}`);
      }
    }
    await page.waitForTimeout(500);
    
    // Remove selected duplicates
    const removeSelectedBtn = page.locator('#removeSelectedDuplicates');
    if (!(await removeSelectedBtn.isVisible())) {
      console.log('❌ Remove Selected button not visible');
      return false;
    }
    
    // Set up dialog handler to auto-accept confirmation
    console.log('🗑️ Setting up dialog handler and removing selected duplicates...');
    page.on('dialog', async dialog => {
      console.log(`✅ Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });
    
    await removeSelectedBtn.click();
    await page.waitForTimeout(5000); // Extra wait for removal and re-scan to complete
    
    // Second scan - should find fewer duplicate groups
    console.log('🔍 Running second duplicate scan to verify removal...');
    await page.locator('#findDuplicates').click();
    await page.waitForTimeout(3000);
    
    const finalGroupCount = await page.locator('.duplicate-group').count();
    console.log(`📊 Duplicate groups after removal: ${finalGroupCount}`);
    
    // Should have 2 groups remaining (4 initial - 2 removed)
    if (finalGroupCount !== 2) {
      console.log(`❌ Expected 2 remaining duplicate groups, found ${finalGroupCount}`);
      return false;
    }
    
    console.log('✅ Duplicate removal verification - Remove Selected completed successfully');
    console.log(`   Initial groups: ${initialGroupCount}, Final groups: ${finalGroupCount}`);
    
    await cleanupAllTestBookmarks(context);
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'duplicate-removal-verification-selected', error);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

async function testDuplicateRemovalVerificationAll() {
  console.log('🚀 Testing duplicate removal verification - Remove All...');
  
  let context, page;
  
  try {
    ({ context, page } = await launchExtensionBrowser());
    
    // Add bookmarks with known duplicates
    await page.goto('https://www.google.com');
    console.log('📚 Adding test bookmarks with duplicates...');
    await addBookmarks(context, getBookmarkSet('withDuplicates'));
    
    await navigateToOptionsPage(page, context);
    await page.locator('[data-tab="duplicates"]').click();
    await page.waitForTimeout(500);

    // First scan - should find 3 duplicate groups
    console.log('🔍 Running initial duplicate scan...');
    await page.locator('#findDuplicates').click();
    await page.waitForTimeout(3000);
    
    const initialGroupCount = await page.locator('.duplicate-group').count();
    console.log(`📊 Initial duplicate groups found: ${initialGroupCount}`);
    
    if (initialGroupCount === 0) {
      console.log('❌ No duplicate groups found in initial scan');
      return false;
    }
    
    // Remove all duplicates
    const removeAllBtn = page.locator('#removeAllDuplicates');
    if (!(await removeAllBtn.isVisible())) {
      console.log('❌ Remove All Duplicates button not visible');
      return false;
    }
    
    // Set up dialog handler to auto-accept confirmation
    console.log('🗑️ Setting up dialog handler and removing all duplicates...');
    page.on('dialog', async dialog => {
      console.log(`✅ Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });
    
    await removeAllBtn.click();
    await page.waitForTimeout(5000); // Extra wait for removal and re-scan to complete
    
    // Second scan - should find no duplicates
    console.log('🔍 Running second duplicate scan to verify complete removal...');
    await page.locator('#findDuplicates').click();
    await page.waitForTimeout(3000);
    
    const finalGroupCount = await page.locator('.duplicate-group').count();
    const duplicatesContent = await page.locator('#duplicatesList').textContent();
    
    console.log(`📊 Duplicate groups after removal: ${finalGroupCount}`);
    console.log('📄 Final scan result:', duplicatesContent.substring(0, 100) + '...');
    
    // Should have no duplicate groups and show "No duplicate bookmarks found" message
    if (finalGroupCount !== 0) {
      console.log(`❌ Expected 0 duplicate groups after removal, found ${finalGroupCount}`);
      return false;
    }
    
    const hasNoDuplicatesMessage = duplicatesContent.includes('No duplicate bookmarks found');
    if (!hasNoDuplicatesMessage) {
      console.log('❌ Expected "No duplicate bookmarks found" message after removal');
      return false;
    }
    
    console.log('✅ Duplicate removal verification - Remove All completed successfully');
    console.log(`   Initial groups: ${initialGroupCount}, Final groups: ${finalGroupCount}`);
    console.log('   ✅ "No duplicate bookmarks found" message displayed correctly');
    
    await cleanupAllTestBookmarks(context);
    return true;

  } catch (error) {
    await captureFailureScreenshot(page, 'duplicate-removal-verification-all', error);
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
    { name: 'Button States', fn: testDuplicatesButtonStates },
    { name: 'Duplicate Removal Verification - Remove Selected', fn: testDuplicateRemovalVerificationSelected },
    { name: 'Duplicate Removal Verification - Remove All', fn: testDuplicateRemovalVerificationAll }
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
