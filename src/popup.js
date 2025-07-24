/**
 * Bookmark Tidy - Popup Script
 * Simple script to open the main options page
 */

document.addEventListener('DOMContentLoaded', () => {
  const openOptionsButton = document.getElementById('openOptions');
  
  openOptionsButton.addEventListener('click', () => {
    // Open the options page in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options.html')
    });
    
    // Close the popup
    window.close();
  });
});
