/**
 * BookmarkTidy Test Utilities - Extension Helpers
 * Shared utilities for extension testing across all test files
 */

const { chromium } = require('playwright');
const path = require('path');

/**
 * Launch browser with BookmarkTidy extension loaded
 * @param {Object} options - Browser launch options
 * @returns {Object} { context, page }
 */
async function launchExtensionBrowser(options = {}) {
  const extensionPath = path.join(__dirname, '..', '..');
  
  const defaultOptions = {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-default-apps',
      '--enable-logging',
      '--v=1'
    ]
  };

  const context = await chromium.launchPersistentContext('', {
    ...defaultOptions,
    ...options
  });

  const page = await context.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Browser console error: ${msg.text()}`);
    }
  });

  return { context, page };
}

/**
 * Get extension ID from Chrome extensions page
 * @param {Object} context - Browser context
 * @returns {string} Extension ID
 */
async function getExtensionId(context) {
  const page = await context.newPage();
  
  try {
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(1000);
    
    // Enable developer mode if needed
    try {
      const devModeToggle = page.locator('#devMode');
      if (await devModeToggle.isVisible()) {
        await devModeToggle.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Developer mode might already be enabled
    }

    // Find BookmarkTidy extension
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
        // Continue searching
      }
    }
    
    await page.close();
    throw new Error('BookmarkTidy extension not found');
  } catch (error) {
    await page.close();
    throw error;
  }
}

/**
 * Navigate to extension options page
 * @param {Object} page - Playwright page
 * @param {Object} context - Browser context
 * @returns {string} Options page URL
 */
async function navigateToOptionsPage(page, context) {
  const extensionId = await getExtensionId(context);
  const optionsUrl = `chrome-extension://${extensionId}/src/options.html`;
  
  await page.goto(optionsUrl);
  await page.waitForTimeout(1000);
  
  return optionsUrl;
}

/**
 * Navigate to extension popup page
 * @param {Object} page - Playwright page
 * @param {Object} context - Browser context
 * @returns {string} Popup page URL
 */
async function navigateToPopupPage(page, context) {
  const extensionId = await getExtensionId(context);
  const popupUrl = `chrome-extension://${extensionId}/src/popup.html`;
  
  await page.goto(popupUrl);
  await page.waitForTimeout(1000);
  
  return popupUrl;
}

/**
 * Wait for extension to be fully loaded
 * @param {Object} context - Browser context
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForExtensionLoad(context, timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const targets = await context.browser().targets();
      const extensionTarget = targets.find(target => 
        target.type() === 'background_page' && 
        target.url().includes('chrome-extension://')
      );
      
      if (extensionTarget) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
      }
    } catch (e) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Extension not loaded within ${timeout}ms`);
}

/**
 * Take screenshot on test failure
 * @param {Object} page - Playwright page
 * @param {string} testName - Name of the test
 * @param {Error} error - Error that occurred
 */
async function captureFailureScreenshot(page, testName, error) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${testName}-failure-${timestamp}.png`;
  const filepath = path.join(__dirname, '..', 'artifacts', filename);
  
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Failure screenshot saved: ${filepath}`);
  } catch (screenshotError) {
    console.log(`❌ Failed to capture screenshot: ${screenshotError.message}`);
  }
  
  console.error(`❌ Test "${testName}" failed:`, error);
}

module.exports = {
  launchExtensionBrowser,
  getExtensionId,
  navigateToOptionsPage,
  navigateToPopupPage,
  waitForExtensionLoad,
  captureFailureScreenshot
};
