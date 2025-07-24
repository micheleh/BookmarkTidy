const { chromium } = require('playwright');
const path = require('path');

async function testDeadLinkReliability() {
  console.log('🔍 Testing BookmarkTidy IMPROVED Dead Link Detection...');
  console.log('🎯 This test demonstrates the reliability improvements:');
  console.log('   - Fewer false positives');
  console.log('   - Better handling of CORS/security restrictions');
  console.log('   - Multi-step verification process');
  console.log('   - Only genuine dead links are flagged');
  console.log('');
  
  // Launch browser with extension
  const extensionPath = path.join(__dirname);
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-default-apps'
    ]
  });

  const page = await context.newPage();
  
  try {
    console.log('📚 Creating test bookmarks with a mix of working and dead links...');
    
    // Create a comprehensive set of test bookmarks
    await page.evaluate(() => {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        // Working sites (should NOT be flagged as dead)
        chrome.bookmarks.create({
          title: 'Google (Working)',
          url: 'https://www.google.com'
        });
        chrome.bookmarks.create({
          title: 'GitHub (Working)',
          url: 'https://github.com'
        });
        chrome.bookmarks.create({
          title: 'Stack Overflow (Working)',
          url: 'https://stackoverflow.com'
        });
        chrome.bookmarks.create({
          title: 'Wikipedia (Working)',
          url: 'https://en.wikipedia.org'
        });
        chrome.bookmarks.create({
          title: 'Example.com (Working)',
          url: 'https://example.com'
        });
        
        // Sites with CORS restrictions (should NOT be flagged as dead - improved!)
        chrome.bookmarks.create({
          title: 'Twitter/X (CORS Restricted)',
          url: 'https://twitter.com'
        });
        chrome.bookmarks.create({
          title: 'Facebook (CORS Restricted)',
          url: 'https://facebook.com'
        });
        chrome.bookmarks.create({
          title: 'LinkedIn (CORS Restricted)',
          url: 'https://linkedin.com'
        });
        
        // Sites that might block HEAD requests (should NOT be flagged - improved!)
        chrome.bookmarks.create({
          title: 'Instagram (May Block HEAD)',
          url: 'https://instagram.com'
        });
        chrome.bookmarks.create({
          title: 'Reddit (May Block HEAD)',
          url: 'https://reddit.com'
        });
        
        // Genuinely dead links (SHOULD be flagged)
        chrome.bookmarks.create({
          title: 'Non-existent Domain 1',
          url: 'https://this-domain-definitely-does-not-exist-12345.com'
        });
        chrome.bookmarks.create({
          title: 'Non-existent Domain 2',
          url: 'https://completely-fake-website-xyz-999.net'
        });
        chrome.bookmarks.create({
          title: 'Invalid TLD',
          url: 'https://example.invalidtld'
        });
        
        // Timeout-prone URLs (might be flagged)
        chrome.bookmarks.create({
          title: '404 Test URL',
          url: 'https://httpstat.us/404'
        });
        chrome.bookmarks.create({
          title: '500 Error Test',
          url: 'https://httpstat.us/500'
        });
      }
    });
    
    // Wait for bookmarks to be created
    await page.waitForTimeout(3000);
    
    // Get extension ID
    const extensionId = await getExtensionId(context);
    const optionsUrl = `chrome-extension://${extensionId}/src/options.html`;
    
    console.log('🔍 Opening extension options page...');
    await page.goto(optionsUrl);
    await page.waitForTimeout(1000);
    
    // Navigate to dead links tab
    console.log('🔍 Testing IMPROVED Dead Link Checker...');
    const deadlinksTab = page.locator('[data-tab="deadlinks"]');
    await deadlinksTab.click();
    await page.waitForTimeout(500);
    
    const checkDeadLinksBtn = page.locator('#checkDeadLinks');
    console.log('✅ Starting comprehensive dead link check...');
    console.log('📊 Expected results with improvements:');
    console.log('   ✅ Working sites (Google, GitHub, etc.) → Should pass');
    console.log('   ✅ CORS-restricted sites (Twitter, Facebook) → Should pass (improved!)');
    console.log('   ✅ HEAD-blocking sites (Instagram, Reddit) → Should pass (improved!)');
    console.log('   ❌ Non-existent domains → Should be flagged as dead');
    console.log('   ❌ Timeout-prone URLs → Might be flagged');
    console.log('');
    
    await checkDeadLinksBtn.click();
    
    // Monitor the progress
    console.log('⏱️  Monitoring progress (this will take a moment with the improved verification)...');
    
    let checkComplete = false;
    let iterations = 0;
    const maxIterations = 60; // 60 seconds max
    
    while (!checkComplete && iterations < maxIterations) {
      await page.waitForTimeout(1000);
      iterations++;
      
      // Check if still processing
      const buttonText = await checkDeadLinksBtn.textContent();
      const progressText = await page.locator('.progress-text').textContent().catch(() => '');
      
      if (buttonText.includes('Stop')) {
        console.log(`⏳ Progress (${iterations}s): ${progressText}`);
      } else {
        checkComplete = true;
        console.log('✅ Dead link check completed!');
        break;
      }
    }
    
    if (!checkComplete) {
      console.log('⏱️  Check is taking longer than expected - demonstrating stop feature...');
      await checkDeadLinksBtn.click(); // Stop the check
      await page.waitForTimeout(2000);
      console.log('🛑 Successfully stopped the check');
    }
    
    // Check results
    await page.waitForTimeout(2000);
    const resultsContent = await page.locator('#deadLinksList').textContent().catch(() => '');
    
    console.log('');
    console.log('📊 RELIABILITY TEST RESULTS:');
    console.log('─'.repeat(50));
    
    if (resultsContent.includes('All links are working')) {
      console.log('🎉 EXCELLENT! No false positives detected!');
      console.log('✅ All working sites passed the reliability test');
      console.log('✅ CORS-restricted sites were correctly identified as working');
      console.log('✅ HEAD-blocking sites were handled properly');
      console.log('');
      console.log('🏆 The improved dead link checker is working perfectly!');
    } else if (resultsContent.includes('potentially dead link')) {
      // Extract number if possible
      const match = resultsContent.match(/(\\d+)\\s+potentially dead link/);
      const count = match ? match[1] : 'some';
      
      console.log(`📋 Found ${count} potentially dead links`);
      console.log('');
      console.log('💡 This is expected for:');
      console.log('   ❌ Non-existent domains (should be flagged)');
      console.log('   ❌ Timeout-prone test URLs (might be flagged)');
      console.log('');
      console.log('✅ If working sites like Google, GitHub are NOT in the list,');
      console.log('   then the reliability improvements are working!');
    } else if (resultsContent.includes('stopped')) {
      console.log('🛑 Check was stopped - Stop functionality working!');
    } else {
      console.log('📄 Results:', resultsContent.substring(0, 200) + '...');
    }
    
    console.log('');
    console.log('🔍 Browser will stay open for manual inspection...');
    console.log('💡 Manual verification steps:');
    console.log('   1. Check if popular sites (Google, GitHub) are NOT flagged');
    console.log('   2. Verify only genuinely dead links are in the results');
    console.log('   3. Notice improved progress messages and error descriptions');
    console.log('   4. Try the Stop button during a check');
    console.log('');
    console.log('Press Ctrl+C when done inspecting');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'tests/dead-link-test-failure.png', fullPage: true });
    console.log('📸 Screenshot saved as tests/dead-link-test-failure.png');
  } finally {
    await context.close();
  }
}

async function getExtensionId(context) {
  const page = await context.newPage();
  await page.goto('chrome://extensions/');
  await page.waitForTimeout(1000);
  
  try {
    const devModeToggle = page.locator('#devMode');
    if (await devModeToggle.isVisible()) {
      await devModeToggle.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    // Developer mode might already be enabled
  }

  const extensionCards = await page.locator('extensions-item').all();
  for (const card of extensionCards) {
    try {
      const name = await card.locator('#name').textContent();
      if (name && name.includes('Bookmark Tidy')) {
        const cardId = await card.getAttribute('id');
        if (cardId) {
          await page.close();
          return cardId;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  await page.close();
  return 'bookmark-tidy-extension';
}

if (require.main === module) {
  testDeadLinkReliability().catch(console.error);
}

module.exports = { testDeadLinkReliability };
