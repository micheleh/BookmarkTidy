/**
 * BookmarkTidy Test Utilities - Extension Helpers
 * Shared utilities for extension testing across all test files
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');

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
 * Clean up old artifact files
 * @param {number} maxFiles - Maximum number of files to keep (default: 5)
 */
async function cleanupOldArtifacts(maxFiles = 5) {
  const artifactsDir = path.join(__dirname, '..', 'artifacts');
  
  if (!existsSync(artifactsDir)) {
    return;
  }
  
  try {
    const files = await fs.readdir(artifactsDir);
    const screenshotFiles = files
      .filter(file => file.endsWith('.png') && file.includes('-failure-'))
      .map(file => ({
        name: file,
        path: path.join(artifactsDir, file),
        time: extractTimestampFromFilename(file)
      }))
      .filter(file => file.time) // Only files with valid timestamps
      .sort((a, b) => b.time - a.time); // Sort by newest first
    
    if (screenshotFiles.length > maxFiles) {
      const filesToDelete = screenshotFiles.slice(maxFiles);
      
      console.log(`🧹 Cleaning up ${filesToDelete.length} old artifact files...`);
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          console.log(`   Removed: ${file.name}`);
        } catch (error) {
          console.log(`   Failed to remove ${file.name}: ${error.message}`);
        }
      }
      
      console.log(`✅ Artifact cleanup completed. Kept ${Math.min(maxFiles, screenshotFiles.length)} most recent files.`);
    }
  } catch (error) {
    console.log(`⚠️  Failed to cleanup artifacts: ${error.message}`);
  }
}

/**
 * Extract timestamp from filename for sorting
 * @param {string} filename - The filename to extract timestamp from
 * @returns {number|null} Timestamp in milliseconds or null if not found
 */
function extractTimestampFromFilename(filename) {
  // Extract timestamp from format: test-name-failure-2025-07-24T20-07-43-797Z.png
  const match = filename.match(/-failure-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.png$/);
  if (match) {
    try {
      // Convert back to ISO format and parse
      const isoString = match[1].replace(/-/g, (match, offset) => {
        // Replace all but the first 4 dashes with colons and dots appropriately
        if (offset < 10) return match; // Keep date dashes
        if (offset === 10) return 'T'; // T separator
        if (offset < 16) return ':'; // Time colons  
        if (offset === 16) return ':'; // Time colon
        if (offset === 19) return '.'; // Millisecond dot
        return match;
      });
      const correctedIso = isoString.replace(/T(\d{2}):(\d{2}):(\d{2}):(\d{3})/, 'T$1:$2:$3.$4');
      return new Date(correctedIso).getTime();
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Clean up artifacts for successful tests (optional)
 * Only keeps failure screenshots
 */
async function cleanupSuccessArtifacts() {
  // For now, we only clean up old failure screenshots
  // Could be extended to remove other temporary files if needed
  await cleanupOldArtifacts(5);
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
    
    // Clean up old artifacts after taking a new failure screenshot
    await cleanupOldArtifacts(5);
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
  captureFailureScreenshot,
  cleanupOldArtifacts,
  cleanupSuccessArtifacts
};
