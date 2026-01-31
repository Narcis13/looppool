#!/usr/bin/env node

// Test for request debouncing in file tree operations

const http = require('http');
const fs = require('fs');
const path = require('path');

const serverUrl = 'http://127.0.0.1:3456';

// Test that FileTree class exists and has debouncing methods
async function testFileTreeClassStructure() {
  console.log('\nTest 1: FileTree class structure');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check for class definition
    if (!content.includes('class FileTree')) {
      throw new Error('FileTree class not found');
    }
    
    // Check for debounce configuration
    const hasDebounceConfig = 
      content.includes('loadDebounceDelay') &&
      content.includes('expandDebounceDelay') &&
      content.includes('loadDebounceTimer') &&
      content.includes('expandDebounceTimers');
    
    if (!hasDebounceConfig) {
      throw new Error('Debounce configuration properties not found');
    }
    
    // Check for debounced methods
    const debouncedMethods = [
      'debouncedLoadTree',
      'debouncedRenderTree',
      'debouncedToggleDir',
      'debouncedHandleFileChange'
    ];
    
    for (const method of debouncedMethods) {
      if (!content.includes(method)) {
        throw new Error(`Debounced method ${method} not found`);
      }
    }
    
    console.log('✓ FileTree class has all required debouncing structures');
  } catch (error) {
    console.error('✗ FileTree class structure test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test debounce delay configurations
async function testDebounceDelays() {
  console.log('\nTest 2: Debounce delay configurations');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check load debounce delay (300ms)
    if (!content.includes('this.loadDebounceDelay = 300')) {
      throw new Error('Load debounce delay not set to 300ms');
    }
    
    // Check expand debounce delay (100ms)
    if (!content.includes('this.expandDebounceDelay = 100')) {
      throw new Error('Expand debounce delay not set to 100ms');
    }
    
    // Check file change delay (500ms)
    if (!content.includes('}, 500); // 500ms delay for file changes')) {
      throw new Error('File change debounce delay not set to 500ms');
    }
    
    console.log('✓ All debounce delays configured correctly');
  } catch (error) {
    console.error('✗ Debounce delay test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test debounced load tree implementation
async function testDebouncedLoadTree() {
  console.log('\nTest 3: Debounced load tree implementation');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check that debouncedLoadTree clears existing timer
    const hasTimerClear = content.includes('debouncedLoadTree') && 
                          content.includes('if (this.loadDebounceTimer)') &&
                          content.includes('clearTimeout(this.loadDebounceTimer)');
    
    if (!hasTimerClear) {
      throw new Error('debouncedLoadTree does not clear existing timer');
    }
    
    // Check that it shows loading state immediately
    if (!content.includes('this.showLoading()')) {
      throw new Error('debouncedLoadTree does not show loading state');
    }
    
    // Check that it sets a new timer
    if (!content.includes('this.loadDebounceTimer = setTimeout')) {
      throw new Error('debouncedLoadTree does not set new timer');
    }
    
    console.log('✓ debouncedLoadTree implemented correctly');
  } catch (error) {
    console.error('✗ Debounced load tree test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test debounced render tree implementation
async function testDebouncedRenderTree() {
  console.log('\nTest 4: Debounced render tree implementation');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check method exists
    if (!content.includes('debouncedRenderTree()')) {
      throw new Error('debouncedRenderTree method not found');
    }
    
    // Check timer management
    const hasRenderDebounce = 
      content.includes('if (this.renderDebounceTimer)') &&
      content.includes('clearTimeout(this.renderDebounceTimer)') &&
      content.includes('this.renderDebounceTimer = setTimeout');
    
    if (!hasRenderDebounce) {
      throw new Error('debouncedRenderTree does not manage timer correctly');
    }
    
    console.log('✓ debouncedRenderTree implemented correctly');
  } catch (error) {
    console.error('✗ Debounced render tree test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test event handler integration
async function testEventHandlerIntegration() {
  console.log('\nTest 5: Event handler integration with debouncing');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check refresh button uses debounced method
    if (!content.includes("this.refreshBtn.addEventListener('click'") &&
        !content.includes('this.debouncedLoadTree()')) {
      throw new Error('Refresh button does not use debounced load');
    }
    
    // Check search input uses debounced method
    if (!content.includes("this.searchInput.addEventListener('input'") &&
        !content.includes('this.debouncedRenderTree()')) {
      throw new Error('Search input does not use debounced render');
    }
    
    // Check SSE file change uses debounced method
    if (!content.includes('this.debouncedHandleFileChange(data.path)')) {
      throw new Error('SSE file change does not use debounced handler');
    }
    
    console.log('✓ All event handlers use debounced methods');
  } catch (error) {
    console.error('✗ Event handler integration test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test expand/collapse debouncing with Map
async function testExpandCollapseDebouncing() {
  console.log('\nTest 6: Expand/collapse debouncing with Map');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check Map initialization
    if (!content.includes('this.expandDebounceTimers = new Map()')) {
      throw new Error('expandDebounceTimers Map not initialized');
    }
    
    // Check per-path timer management
    const hasPathTimerManagement = 
      content.includes('if (this.expandDebounceTimers.has(path))') &&
      content.includes('this.expandDebounceTimers.get(path)') &&
      content.includes('this.expandDebounceTimers.set(path, timer)') &&
      content.includes('this.expandDebounceTimers.delete(path)');
    
    if (!hasPathTimerManagement) {
      throw new Error('Per-path timer management not implemented correctly');
    }
    
    console.log('✓ Expand/collapse debouncing uses Map for per-path timers');
  } catch (error) {
    console.error('✗ Expand/collapse debouncing test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test file change debouncing
async function testFileChangeDebouncing() {
  console.log('\nTest 7: File change debouncing');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check file change debounce timer object
    if (!content.includes('if (!this.fileChangeDebounceTimer)') ||
        !content.includes('this.fileChangeDebounceTimer = {}')) {
      throw new Error('File change debounce timer object not initialized');
    }
    
    // Check per-file timer management
    if (!content.includes('if (this.fileChangeDebounceTimer[path])') ||
        !content.includes('clearTimeout(this.fileChangeDebounceTimer[path])')) {
      throw new Error('Per-file timer management not implemented');
    }
    
    // Check visibility check before refresh
    if (!content.includes('const needsRefresh = this.isFileVisible(path)')) {
      throw new Error('File visibility check not implemented');
    }
    
    console.log('✓ File change debouncing implemented with per-file timers');
  } catch (error) {
    console.error('✗ File change debouncing test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test virtual scrolling integration
async function testVirtualScrollingIntegration() {
  console.log('\nTest 8: Virtual scrolling integration');
  
  try {
    const response = await fetch(serverUrl + '/file-tree.js');
    const content = await response.text();
    
    // Check virtual scrolling properties
    if (!content.includes('this.itemHeight = 24') ||
        !content.includes('this.visibleItems = []')) {
      throw new Error('Virtual scrolling properties not initialized');
    }
    
    // Check scroll event uses requestAnimationFrame
    if (!content.includes('handleScroll()') ||
        !content.includes('requestAnimationFrame')) {
      throw new Error('Scroll handler does not use requestAnimationFrame');
    }
    
    console.log('✓ Virtual scrolling integrated with debouncing');
  } catch (error) {
    console.error('✗ Virtual scrolling integration test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test HTML integration
async function testHTMLIntegration() {
  console.log('\nTest 9: HTML integration');
  
  try {
    const response = await fetch(serverUrl);
    const content = await response.text();
    
    // Check file-tree.js is included
    if (!content.includes('<script src="file-tree.js"></script>')) {
      throw new Error('file-tree.js not included in HTML');
    }
    
    // Check initialization
    if (!content.includes('const fileTree = new FileTree(sidebarElement)')) {
      throw new Error('FileTree not initialized in HTML');
    }
    
    // Check debounced load call
    if (!content.includes('fileTree.debouncedLoadTree()')) {
      throw new Error('Initial load does not use debounced method');
    }
    
    console.log('✓ FileTree properly integrated in HTML');
  } catch (error) {
    console.error('✗ HTML integration test failed:', error.message);
    return false;
  }
  
  return true;
}

// Test CSS styles
async function testCSSStyles() {
  console.log('\nTest 10: CSS styles for file tree');
  
  try {
    const response = await fetch(serverUrl);
    const content = await response.text();
    
    // Check for file tree CSS classes
    const cssClasses = [
      '.file-tree',
      '.file-tree-header',
      '.file-tree-search',
      '.file-search-input',
      '.file-tree-container',
      '.file-tree-viewport',
      '.tree-item',
      '.tree-arrow',
      '.tree-icon',
      '.tree-name',
      '.unsaved-dot'
    ];
    
    for (const cssClass of cssClasses) {
      if (!content.includes(cssClass)) {
        throw new Error(`CSS class ${cssClass} not found`);
      }
    }
    
    console.log('✓ All file tree CSS styles defined');
  } catch (error) {
    console.error('✗ CSS styles test failed:', error.message);
    return false;
  }
  
  return true;
}

// Run all tests
async function runTests() {
  console.log('Testing request debouncing for file tree operations...');
  
  let allPassed = true;
  
  allPassed &= await testFileTreeClassStructure();
  allPassed &= await testDebounceDelays();
  allPassed &= await testDebouncedLoadTree();
  allPassed &= await testDebouncedRenderTree();
  allPassed &= await testEventHandlerIntegration();
  allPassed &= await testExpandCollapseDebouncing();
  allPassed &= await testFileChangeDebouncing();
  allPassed &= await testVirtualScrollingIntegration();
  allPassed &= await testHTMLIntegration();
  allPassed &= await testCSSStyles();
  
  console.log('\n' + (allPassed ? '✓ All tests passed!' : '✗ Some tests failed'));
  process.exit(allPassed ? 0 : 1);
}

// Add delay to ensure server is ready
setTimeout(runTests, 100);