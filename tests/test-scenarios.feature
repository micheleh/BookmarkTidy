Feature: BookmarkTidy Extension - Complete Test Coverage
  As a user of the BookmarkTidy Chrome extension
  I want all features to work correctly
  So that I can efficiently manage and organize my bookmarks

  Background:
    Given the BookmarkTidy extension is loaded in the browser
    And the extension service worker is active

  # ========================================
  # EXTENSION LOADING TESTS
  # ========================================

  Scenario: Basic Extension Loading
    Given I launch a browser with the BookmarkTidy extension
    When the extension loads
    Then the extension should be visible in the Chrome extensions list
    And the extension name should be "Bookmark Tidy"
    And the extension should be enabled by default
    And the extension should have proper icons loaded

  Scenario: Extension UI Components Visibility
    Given the BookmarkTidy extension is loaded
    When I navigate to the extension options page
    Then I should see the main tab navigation
    And I should see the "Duplicate Finder" tab
    And I should see the "Dead Link Checker" tab  
    And I should see the "Settings" tab
    And all tabs should be clickable and functional
    When I navigate to the extension popup page
    Then the popup should load without errors
    And the popup should display the extension interface

  # ========================================
  # SETTINGS MANAGEMENT TESTS
  # ========================================

  Scenario: Settings Page Layout Verification
    Given I am on the BookmarkTidy options page
    When I click on the "Settings" tab
    Then I should see the settings page layout
    And I should see the "Auto Folder Sorting" checkbox
    And I should see the "Sort by Use" checkbox
    And I should see form labels for both settings
    And I should see form descriptions for both settings
    And all settings elements should be properly visible

  Scenario: Settings Toggle Functionality
    Given I am on the settings page
    When I click on the "Auto Folder Sorting" toggle
    Then the toggle state should change from checked to unchecked
    When I click on the "Auto Folder Sorting" toggle again
    Then the toggle state should return to its original state
    When I click on the "Sort by Use" toggle
    Then the toggle state should change from checked to unchecked
    When I click on the "Sort by Use" toggle again
    Then the toggle state should return to its original state

  Scenario: Settings Persistence Across Sessions
    Given I am on the settings page
    And I have initial settings states recorded
    When I change both "Auto Folder Sorting" and "Sort by Use" settings
    And I wait for settings to be saved
    And I close and reopen the browser
    And I navigate back to the settings page
    Then the changed settings should persist across browser restart
    # Note: In test environment, persistence may not work due to fresh contexts
    And I restore the original settings for cleanup

  Scenario: Settings Labels and Descriptions Validation
    Given I am on the settings page
    When I examine the form labels
    Then I should see "Automatic Folder Sorting" label
    And I should see "Sort by Use" label
    When I examine the form descriptions
    Then I should see at least 2 form descriptions
    And each description should have meaningful content (more than 10 characters)

  # ========================================
  # DUPLICATE FINDER TESTS
  # ========================================

  Scenario: Duplicate Bookmark Detection
    Given I have bookmarks with known duplicates in the browser
    | Title | URL |
    | Google - First | https://www.google.com |
    | Google - Duplicate | https://www.google.com |
    | GitHub - Original | https://github.com |
    | GitHub - Copy | https://github.com |
    | Example Site | https://example.com |
    | Example Duplicate | https://example.com |
    When I navigate to the "Duplicate Finder" tab
    And I click the "Find Duplicates" button
    And I wait for the scanning to complete
    Then I should see duplicate groups displayed
    And I should see exactly 3 duplicate URL groups
    And the scan results should show duplicate bookmarks found
    And I clean up the test bookmarks after testing

  Scenario: Duplicate Removal Controls Visibility
    Given I have bookmarks with known duplicates in the browser
    When I navigate to the "Duplicate Finder" tab
    And I run the duplicate finder scan
    And duplicates are found
    Then I should see the "Select All" control button
    And I should see the "Unselect All" control button
    And I should see the "Remove All Duplicates" control button
    And I should see the "Remove Selected" control button
    And all 4 control buttons should be visible and functional

  Scenario: Duplicate Selection Functionality
    Given I have found duplicate bookmarks
    And the duplicate removal controls are visible
    When I click the "Select All" button
    Then all duplicate checkboxes should be selected
    And I should see multiple checkboxes in checked state
    And I clean up the test bookmarks after testing

  Scenario: No Duplicates Found Scenario
    Given I have bookmarks without any duplicates in the browser
    | Title | URL |
    | Google | https://www.google.com |
    | GitHub | https://github.com |
    | Stack Overflow | https://stackoverflow.com |
    When I navigate to the "Duplicate Finder" tab
    And I click the "Find Duplicates" button
    And I wait for the scanning to complete
    Then I should see the message "No duplicate bookmarks found!"
    And no duplicate groups should be displayed
    And I clean up the test bookmarks after testing

  Scenario: Duplicate Finder Button States
    Given I have bookmarks with duplicates in the browser
    When I navigate to the "Duplicate Finder" tab
    Then the "Find Duplicates" button should be enabled
    And the button text should be "Find Duplicates"
    When I click the "Find Duplicates" button
    And I check the button state during scanning
    Then the button may show "Scanning..." or similar loading text
    When the scanning completes
    Then the button should return to enabled state
    And the button text should be "Find Duplicates"
    And I clean up the test bookmarks after testing

  # ========================================
  # DEAD LINK CHECKER TESTS
  # ========================================

  Scenario: Basic Dead Link Detection
    Given I have bookmarks with mixed working and dead links
    | Title | URL | Expected Status |
    | Google (Working) | https://www.google.com | Working |
    | GitHub (Working) | https://github.com | Working |
    | Twitter/X (CORS Restricted) | https://twitter.com | Should not be flagged |
    | Facebook (CORS Restricted) | https://facebook.com | Should not be flagged |
    | Dead Site 1 | https://thissitedoesnotexist12345.com | Dead |
    | Dead Site 2 | https://anotherfakeurl9999.com | Dead |
    When I navigate to the "Dead Link Checker" tab
    And I click the "Check Dead Links" button
    And I wait for the link checking to complete (up to 60 seconds)
    Then I should see valid results from the dead link check
    And the results should show either dead links found, no results message, or stopped message
    And the check should not fail with errors
    And I clean up the test bookmarks after testing

  Scenario: Dead Link Checker Stop Functionality
    Given I have a larger set of bookmarks to ensure check takes time
    When I navigate to the "Dead Link Checker" tab
    And I click the "Check Dead Links" button
    And I wait for the check to start
    And the button text changes to indicate it can be stopped
    When I click the button to stop the check
    Then the dead link check should be stopped
    And I should see a "stopped" message in the results
    And I clean up the test bookmarks after testing

  Scenario: Dead Link Checker with No Bookmarks
    Given I have no bookmarks in the browser
    When I navigate to the "Dead Link Checker" tab
    And I click the "Check Dead Links" button
    And I wait for the check to complete
    Then I should see a "No bookmarks with URLs found" message or a "No bookmarks" related message
    And the no bookmarks scenario should be handled correctly

  Scenario: Dead Link Removal Controls
    Given I have bookmarks with known dead links
    | Title | URL |
    | Non-existent Domain 1 | https://this-domain-definitely-does-not-exist-12345.com |
    | Non-existent Domain 2 | https://completely-fake-website-xyz-999.net |
    | Invalid TLD | https://invalid.invalidtld |
    | 404 Test URL | https://httpstat.us/404 |
    | 500 Error Test | https://httpstat.us/500 |
    When I navigate to the "Dead Link Checker" tab
    And I run the dead link checker
    And dead links are found
    Then I should see the "Select All" dead links control button
    And I should see the "Unselect All" dead links control button
    And I should see the "Remove All Dead Links" control button
    And I should see the "Remove Selected" dead links control button
    When I click the "Select All" button
    Then all dead link checkboxes should be selected
    And I should see multiple dead link checkboxes in checked state
    And I clean up the test bookmarks after testing

  # ========================================
  # ERROR HANDLING AND EDGE CASES
  # ========================================

  Scenario: Extension Service Worker Availability
    Given I launch the BookmarkTidy extension
    When I attempt to add test bookmarks
    Then the extension service worker should be available
    And bookmark operations should work through the service worker
    And I should not get "No service worker found" errors

  Scenario: Test Cleanup and Isolation
    Given I run any test that adds bookmarks
    When the test completes (successfully or with failure)
    Then all test bookmarks should be cleaned up
    And test patterns should be removed from bookmarks
    And the browser should be in a clean state for the next test

  Scenario: Screenshot Capture on Test Failures
    Given I run any test
    When a test fails with an error
    Then a failure screenshot should be captured
    And the screenshot should be saved to the artifacts directory
    And the screenshot filename should include the test name and timestamp
    And error details should be logged to the console

  Scenario: Progress Monitoring for Long-Running Operations
    Given I run dead link checking on multiple bookmarks
    When the operation takes longer than expected
    Then progress updates should be displayed periodically
    And I should see progress text indicating the current status
    And the operation should not appear to hang without feedback

  # ========================================
  # INTEGRATION SCENARIOS
  # ========================================

  Scenario: Complete Extension Workflow
    Given the BookmarkTidy extension is fully loaded
    When I navigate through all tabs (Duplicates, Dead Links, Settings)
    Then each tab should load without errors
    And each tab should display appropriate content
    And all major buttons should be functional
    And the extension should maintain state between tab switches

  Scenario: Settings Integration with Background Features
    Given I change the "Auto Folder Sorting" setting to disabled
    When bookmark operations are performed in the background
    Then the background script should respect the disabled setting
    Given I change the "Sort by Use" setting to disabled  
    When bookmarks are accessed
    Then the sort by use functionality should be disabled
    And settings changes should be communicated to the background script
