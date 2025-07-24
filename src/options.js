/**
 * Bookmark Tidy - Options Page Script
 * Handles UI interactions and bookmark management functionality
 */

class BookmarkTidy {
  constructor() {
    this.isCheckingDeadLinks = false;
    this.stopDeadLinkCheck = false;
    this.init();
  }

  async init() {
    this.setupTabs();
    this.setupEventListeners();
    await this.loadSettings();
  }

  setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabs = document.querySelectorAll('.tab');

    // Show first tab by default
    if (tabs.length > 0 && tabButtons.length > 0) {
      tabs[0].classList.add('active');
      tabButtons[0].classList.add('active');
    }

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        // Remove active class from all tabs and buttons
        tabs.forEach(tab => tab.classList.remove('active'));
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected tab and button
        document.getElementById(tabId).classList.add('active');
        button.classList.add('active');
      });
    });
  }

  setupEventListeners() {
    // Duplicate finder
    document.getElementById('findDuplicates').addEventListener('click', () => {
      this.findDuplicates();
    });

    // Dead link checker
    document.getElementById('checkDeadLinks').addEventListener('click', () => {
      this.checkDeadLinks();
    });

    // Settings
    document.getElementById('autoFolderSorting').addEventListener('change', (e) => {
      this.saveSetting('autoFolderSorting', e.target.checked);
    });
    
    document.getElementById('sortByUse').addEventListener('change', (e) => {
      this.saveSetting('sortByUse', e.target.checked);
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['autoFolderSorting', 'sortByUse']);
      
      // Set default values that match background.js
      document.getElementById('autoFolderSorting').checked = result.autoFolderSorting !== undefined ? result.autoFolderSorting : true;
      document.getElementById('sortByUse').checked = result.sortByUse !== undefined ? result.sortByUse : true;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSetting(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
      // Notify background script of settings change
      chrome.runtime.sendMessage({ action: 'updateSettings', key, value });
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  }

  async findDuplicates() {
    const button = document.getElementById('findDuplicates');
    const container = document.getElementById('duplicatesList');
    
    button.disabled = true;
    button.textContent = 'Scanning...';
    container.innerHTML = '<div class="progress-bar"><div class="progress-fill"></div></div>';

    try {
      const bookmarks = await this.getAllBookmarks();
      const duplicates = this.identifyDuplicates(bookmarks);
      
      if (duplicates.length === 0) {
        container.innerHTML = '<p class="no-results">No duplicate bookmarks found!</p>';
      } else {
        this.displayDuplicates(duplicates, container);
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
      container.innerHTML = '<p class="error">Error finding duplicates. Please try again.</p>';
    } finally {
      button.disabled = false;
      button.textContent = 'Find Duplicates';
    }
  }

  async checkDeadLinks() {
    const button = document.getElementById('checkDeadLinks');
    const container = document.getElementById('deadLinksList');
    
    if (this.isCheckingDeadLinks) {
      // Stop the current check
      this.stopDeadLinkCheck = true;
      button.textContent = 'Stopping...';
      return;
    }
    
    this.isCheckingDeadLinks = true;
    this.stopDeadLinkCheck = false;
    button.textContent = 'Stop Checking';
    container.innerHTML = '<div class="progress-bar"><div class="progress-fill"></div></div><div class="progress-text">Starting dead link check...</div>';

    try {
      const bookmarks = await this.getAllBookmarks();
      const urlBookmarks = bookmarks.filter(bookmark => bookmark.url && !bookmark.url.startsWith('javascript:'));
      
      if (urlBookmarks.length === 0) {
        container.innerHTML = '<p class="no-results">No bookmarks with URLs found!</p>';
        return;
      }

      const deadLinks = await this.checkLinks(urlBookmarks, container);
      
      if (this.stopDeadLinkCheck) {
        container.innerHTML = '<p class="warning">Dead link check was stopped.</p>';
      } else if (deadLinks.length === 0) {
        container.innerHTML = '<p class="no-results">All links are working!</p>';
      } else {
        this.displayDeadLinks(deadLinks, container);
      }
    } catch (error) {
      console.error('Error checking dead links:', error);
      container.innerHTML = '<p class="error">Error checking links. Please try again.</p>';
    } finally {
      this.isCheckingDeadLinks = false;
      this.stopDeadLinkCheck = false;
      button.disabled = false;
      button.textContent = 'Check Dead Links';
    }
  }

  async getAllBookmarks() {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((bookmarkTree) => {
        const bookmarks = [];
        const folderMap = new Map(); // Store folder info for path building
        
        const traverse = (nodes, parentPath = '') => {
          nodes.forEach(node => {
            // Store folder information
            if (!node.url) {
              folderMap.set(node.id, {
                title: node.title,
                parentId: node.parentId,
                path: parentPath
              });
            }
            
            if (node.url) {
              // Add folder map reference to bookmark for path building
              node._folderMap = folderMap;
              bookmarks.push(node);
            }
            if (node.children) {
              const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
              traverse(node.children, currentPath);
            }
          });
        };
        
        traverse(bookmarkTree);
        resolve(bookmarks);
      });
    });
  }

  identifyDuplicates(bookmarks) {
    const urlMap = new Map();
    const duplicates = [];

    bookmarks.forEach(bookmark => {
      if (!bookmark.url) return;
      
      const url = bookmark.url.toLowerCase();
      if (urlMap.has(url)) {
        const existing = urlMap.get(url);
        if (!existing.isDuplicate) {
          existing.isDuplicate = true;
          duplicates.push({
            url: bookmark.url,
            bookmarks: [existing, bookmark]
          });
        } else {
          // Find existing duplicate group and add to it
          const duplicateGroup = duplicates.find(d => d.url.toLowerCase() === url);
          if (duplicateGroup) {
            duplicateGroup.bookmarks.push(bookmark);
          }
        }
      } else {
        urlMap.set(url, bookmark);
      }
    });

    return duplicates;
  }

  async checkLinks(bookmarks, container) {
    const deadLinks = [];
    const batchSize = 20; // Balanced batch size
    const progressBar = container.querySelector('.progress-fill');
    const progressText = container.querySelector('.progress-text');

    // Improved URL filtering - skip local/private networks
    const filteredBookmarks = bookmarks.filter(bookmark => {
      try {
        const url = new URL(bookmark.url.toLowerCase());
        const protocol = url.protocol;
        const hostname = url.hostname;

        // Skip non-HTTP protocols
        if (!['http:', 'https:'].includes(protocol)) {
          return false;
        }

        // Skip local and private network URLs (consider them alive)
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
          return false;
        }
        const privateIpRegex = /^(10(\.([0-9]{1,3})){3})|(172\.(1[6-9]|2[0-9]|3[0-1])(\.[0-9]{1,3}){2})|(192\.168(\.[0-9]{1,3}){2})$/;
        if (privateIpRegex.test(hostname)) {
          return false;
        }

        return true;
      } catch (e) {
        // Invalid URLs are not checked
        return false;
      }
    });

    if (progressText) {
      progressText.textContent = `Filtered ${filteredBookmarks.length} URLs to check (skipped ${bookmarks.length - filteredBookmarks.length} local/private/invalid URLs)...`;
      await new Promise(resolve => setTimeout(resolve, 1500)); // Show message
    }

    for (let i = 0; i < filteredBookmarks.length && !this.stopDeadLinkCheck; i += batchSize) {
      const batch = filteredBookmarks.slice(i, i + batchSize);
      
      if (progressText) {
        progressText.textContent = `Checking batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(filteredBookmarks.length/batchSize)}...`;
      }
      
      const batchPromises = batch.map(bookmark => this.checkSingleLink(bookmark));
      const results = await Promise.all(batchPromises);

      results.forEach(result => {
        if (result) deadLinks.push(result);
      });

      const progress = Math.min(((i + batchSize) / filteredBookmarks.length) * 100, 100);
      if (progressBar) progressBar.style.width = `${progress}%`;
      
      if (this.stopDeadLinkCheck) {
        if (progressText) progressText.textContent = 'Stopping...';
        break;
      }
    }
    
    return deadLinks;
  }

  async checkSingleLink(bookmark) {
    return new Promise(async (resolve) => {
      try {
        const response = await fetch(bookmark.url, { 
          method: 'GET', 
          redirect: 'follow', 
          signal: AbortSignal.timeout(10000) // Increased to 10 seconds
        });
        
        // Rule 3: Status 404 is dead
        if (response.status === 404) {
          return resolve({ bookmark, error: `HTTP 404: Not Found`, status: 'dead' });
        }
        
        // Rule 2: Status 403 is alive (forbidden but not dead)
        if (response.status === 403) {
          return resolve(null);
        }
        
        // Additional: Common "alive but restricted" status codes
        if ([401, 405, 429, 503].includes(response.status)) {
          return resolve(null); // These indicate the server is alive
        }
        
        // Only flag 4xx client errors (except 403, 401, 405, 429) and 5xx server errors as potentially dead
        if (response.status >= 400) {
          return resolve({ bookmark, error: `HTTP Status ${response.status}`, status: 'dead' });
        }
        
        // Success - link is alive
        resolve(null);
      } catch (error) {
        // Only flag genuine network failures as dead
        if (error.name === 'AbortError') {
          // Even timeouts might be temporary - be more forgiving
          return resolve({ bookmark, error: 'Slow response (10s+ timeout) - might be temporarily unavailable', status: 'dead' });
        }
        
        // DNS failures, connection refused, etc. are genuine dead links
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          return resolve({ bookmark, error: `Network Error: ${error.name}`, status: 'dead' });
        }
        
        // For other errors, assume alive to avoid false positives
        resolve(null);
      }
    });
  }



  displayDuplicates(duplicates, container) {
    let html = `<div class="results-header">
      <h3>Found ${duplicates.length} duplicate URL${duplicates.length !== 1 ? 's' : ''}</h3>
      <div class="button-group">
        <button id="selectAllDuplicates" class="btn secondary-button">Select All</button>
        <button id="unselectAllDuplicates" class="btn secondary-button">Unselect All</button>
        <button id="removeAllDuplicates" class="btn secondary-button">Remove All Duplicates</button>
        <button id="removeSelectedDuplicates" class="btn btn-primary">Remove Selected</button>
      </div>
    </div>`;
    
    html += '<div class="results-list">';
    
    duplicates.forEach((duplicate, index) => {
      html += `<div class="duplicate-group">
        <div class="duplicate-url">
          <strong>URL:</strong> <a href="${duplicate.url}" target="_blank">${duplicate.url}</a>
        </div>
        <div class="duplicate-bookmarks">`;
      
      duplicate.bookmarks.forEach((bookmark, bmIndex) => {
        html += `<div class="bookmark-item">
          <input type="checkbox" id="dup_${index}_${bmIndex}" data-bookmark-id="${bookmark.id}" class="duplicate-checkbox">
          <label for="dup_${index}_${bmIndex}">
            <div class="bookmark-title">${bookmark.title || 'Untitled'}</div>
            <div class="bookmark-path">📁 ${this.getBookmarkPath(bookmark)}</div>
          </label>
        </div>`;
      });
      
      html += `</div>
      </div>`;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Add event listeners
    document.getElementById('selectAllDuplicates').addEventListener('click', () => {
      this.selectAllDuplicates(true);
    });
    
    document.getElementById('unselectAllDuplicates').addEventListener('click', () => {
      this.selectAllDuplicates(false);
    });
    
    document.getElementById('removeAllDuplicates').addEventListener('click', () => {
      this.removeAllDuplicates(duplicates);
    });
    
    document.getElementById('removeSelectedDuplicates').addEventListener('click', () => {
      this.removeSelectedDuplicates();
    });
  }

  displayDeadLinks(deadLinks, container) {
    // Group dead links by domain
    const groupedByDomain = this.groupDeadLinksByDomain(deadLinks);
    const domainCount = Object.keys(groupedByDomain).length;
    
    let html = `<div class="results-header">
      <h3>Found ${deadLinks.length} potentially dead link${deadLinks.length !== 1 ? 's' : ''} across ${domainCount} domain${domainCount !== 1 ? 's' : ''}</h3>
      <div class="button-group">
        <button id="selectAllDeadLinks" class="btn secondary-button">Select All</button>
        <button id="unselectAllDeadLinks" class="btn secondary-button">Unselect All</button>
        <button id="removeAllDeadLinks" class="btn secondary-button">Remove All Dead Links</button>
        <button id="removeSelectedDeadLinks" class="btn btn-primary">Remove Selected</button>
      </div>
    </div>`;
    
    html += '<div class="results-list">';
    
    // Sort domains by number of dead links (descending)
    const sortedDomains = Object.keys(groupedByDomain).sort((a, b) => 
      groupedByDomain[b].length - groupedByDomain[a].length
    );
    
    let globalIndex = 0;
    sortedDomains.forEach(domain => {
      const domainLinks = groupedByDomain[domain];
      
      html += `<div class="domain-group">
        <div class="domain-header">
          <h4 class="domain-name">
            <input type="checkbox" id="domain_${domain.replace(/[^a-zA-Z0-9]/g, '_')}" class="domain-checkbox" data-domain="${domain}">
            <label for="domain_${domain.replace(/[^a-zA-Z0-9]/g, '_')}">
              ${domain} (${domainLinks.length} link${domainLinks.length !== 1 ? 's' : ''})
            </label>
          </h4>
        </div>
        <div class="domain-links">`;
      
      domainLinks.forEach((deadLink) => {
        html += `<div class="dead-link-item">
          <input type="checkbox" id="dead_${globalIndex}" data-bookmark-id="${deadLink.bookmark.id}" data-domain="${domain}" class="dead-link-checkbox">
          <label for="dead_${globalIndex}">
            <div class="bookmark-title">${deadLink.bookmark.title || 'Untitled'}</div>
            <div class="bookmark-url">${deadLink.bookmark.url}</div>
            <div class="error-info">${deadLink.error}</div>
            <div class="bookmark-path">📁 ${this.getBookmarkPath(deadLink.bookmark)}</div>
          </label>
        </div>`;
        globalIndex++;
      });
      
      html += `</div>
      </div>`;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Add event listeners
    document.getElementById('selectAllDeadLinks').addEventListener('click', () => {
      this.selectAllDeadLinks(true);
    });
    
    document.getElementById('unselectAllDeadLinks').addEventListener('click', () => {
      this.selectAllDeadLinks(false);
    });
    
    document.getElementById('removeAllDeadLinks').addEventListener('click', () => {
      this.removeAllDeadLinks(deadLinks);
    });
    
    document.getElementById('removeSelectedDeadLinks').addEventListener('click', () => {
      this.removeSelectedDeadLinks();
    });
    
    // Add domain checkbox listeners
    document.querySelectorAll('.domain-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleDomainSelection(e.target.dataset.domain, e.target.checked);
      });
    });
  }

  groupDeadLinksByDomain(deadLinks) {
    const grouped = {};
    
    deadLinks.forEach(deadLink => {
      try {
        const url = new URL(deadLink.bookmark.url);
        const domain = url.hostname;
        
        if (!grouped[domain]) {
          grouped[domain] = [];
        }
        grouped[domain].push(deadLink);
      } catch (e) {
        // If URL parsing fails, group under 'Invalid URLs'
        const domain = 'Invalid URLs';
        if (!grouped[domain]) {
          grouped[domain] = [];
        }
        grouped[domain].push(deadLink);
      }
    });
    
    return grouped;
  }

  selectAllDeadLinks(select) {
    const checkboxes = document.querySelectorAll('.dead-link-checkbox');
    checkboxes.forEach(box => box.checked = select);
    
    // Also update domain checkboxes
    const domainCheckboxes = document.querySelectorAll('.domain-checkbox');
    domainCheckboxes.forEach(box => box.checked = select);
  }

  toggleDomainSelection(domain, isChecked) {
    const domainLinks = document.querySelectorAll(`.dead-link-checkbox[data-domain="${domain}"]`);
    domainLinks.forEach(checkbox => {
      checkbox.checked = isChecked;
    });
  }

  getBookmarkPath(bookmark) {
    if (!bookmark._folderMap || !bookmark.parentId) {
      return 'Root';
    }
    
    const folderMap = bookmark._folderMap;
    const path = [];
    let currentId = bookmark.parentId;
    
    // Traverse up the folder hierarchy
    while (currentId && folderMap.has(currentId)) {
      const folder = folderMap.get(currentId);
      // Skip the root folders ("Bookmarks Bar", "Other Bookmarks", etc.)
      if (folder.title && folder.title !== 'Bookmarks bar' && folder.title !== 'Other bookmarks' && folder.title !== 'Mobile bookmarks') {
        path.unshift(folder.title);
      }
      currentId = folder.parentId;
    }
    
    return path.length > 0 ? path.join(' → ') : 'Root';
  }

  selectAllDuplicates(select) {
    const checkboxes = document.querySelectorAll('.duplicate-checkbox');
    checkboxes.forEach(box => box.checked = select);
  }

  async removeSelectedDuplicates() {
    const checkboxes = document.querySelectorAll('.duplicate-checkbox:checked');
    const bookmarkIds = Array.from(checkboxes).map(cb => cb.dataset.bookmarkId);
    
    if (bookmarkIds.length === 0) {
      alert('Please select bookmarks to remove.');
      return;
    }
    
    if (confirm(`Remove ${bookmarkIds.length} selected duplicate bookmark${bookmarkIds.length !== 1 ? 's' : ''}?`)) {
      await this.removeBookmarks(bookmarkIds);
      this.findDuplicates(); // Refresh the list
    }
  }

  async removeAllDuplicates(duplicates) {
    const bookmarksToRemove = [];
    
    duplicates.forEach(duplicate => {
      // Keep the first bookmark, remove the rest
      for (let i = 1; i < duplicate.bookmarks.length; i++) {
        bookmarksToRemove.push(duplicate.bookmarks[i].id);
      }
    });
    
    if (confirm(`Remove ${bookmarksToRemove.length} duplicate bookmarks? (Keeping the first occurrence of each)`)) {
      await this.removeBookmarks(bookmarksToRemove);
      this.findDuplicates(); // Refresh the list
    }
  }

  async removeAllDeadLinks(deadLinks) {
    const bookmarkIds = deadLinks.map(dl => dl.bookmark.id);
    
    if (confirm(`Remove ${bookmarkIds.length} dead link${bookmarkIds.length !== 1 ? 's' : ''}?`)) {
      await this.removeBookmarks(bookmarkIds);
      this.checkDeadLinks(); // Refresh the list
    }
  }

  async removeSelectedDeadLinks() {
    const checkboxes = document.querySelectorAll('input[id^="dead_"]:checked');
    const bookmarkIds = Array.from(checkboxes).map(cb => cb.dataset.bookmarkId);
    
    if (bookmarkIds.length === 0) {
      alert('Please select dead links to remove.');
      return;
    }
    
    if (confirm(`Remove ${bookmarkIds.length} selected dead link${bookmarkIds.length !== 1 ? 's' : ''}?`)) {
      await this.removeBookmarks(bookmarkIds);
      this.checkDeadLinks(); // Refresh the list
    }
  }

  async removeBookmarks(bookmarkIds) {
    const promises = bookmarkIds.map(id => {
      return new Promise((resolve) => {
        chrome.bookmarks.remove(id, () => {
          if (chrome.runtime.lastError) {
            console.error('Error removing bookmark:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    });
    
    await Promise.all(promises);
  }
}

// Initialize the BookmarkTidy class when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BookmarkTidy();
});
