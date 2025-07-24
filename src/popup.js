/**
 * Bookmark Tidy - Popup Script
 * Simple script to open the main options page
 */

document.addEventListener('DOMContentLoaded', () => {
  const openOptionsButton = document.getElementById('openOptions');
  
  openOptionsButton.addEventListener('click', async () => {
    const optionsUrl = chrome.runtime.getURL('src/options.html');
    
    try {
      // Query for existing tabs with the options page URL
      const existingTabs = await chrome.tabs.query({ url: optionsUrl });
      
      if (existingTabs.length > 0) {
        // If an options tab already exists, switch to it
        const existingTab = existingTabs[0];
        await chrome.tabs.update(existingTab.id, { active: true });
        await chrome.windows.update(existingTab.windowId, { focused: true });
      } else {
        // If no options tab exists, create a new one
        await chrome.tabs.create({ url: optionsUrl });
      }
    } catch (error) {
      console.error('Error managing options tab:', error);
      // Fallback: just create a new tab
      chrome.tabs.create({ url: optionsUrl });
    }
    
    // Close the popup
    window.close();
  });
});
