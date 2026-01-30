// Test for double-click to open file feature in graph visualization

// Tests for implementation
const tests = {
  // Test 1: Verify onNodeDoubleClick method exists
  testMethodExists: () => {
    const GraphViewer = window.GraphViewer || require('./graph-viewer.js');
    const viewer = new GraphViewer(document.createElement('div'));
    return typeof viewer.onNodeDoubleClick === 'function';
  },

  // Test 2: Verify double-click event listener is added
  testEventListenerAdded: () => {
    const code = `group.addEventListener('dblclick', () => this.onNodeDoubleClick(node));`;
    const fileContent = require('fs').readFileSync('./graph-viewer.js', 'utf8');
    return fileContent.includes(code);
  },

  // Test 3: Verify onNodeDoubleClick dispatches open-file event
  testOpenFileEvent: () => {
    const code = `window.dispatchEvent(new CustomEvent('open-file', {
      detail: { path: node.path }
    }));`;
    const fileContent = require('fs').readFileSync('./graph-viewer.js', 'utf8');
    return fileContent.includes('open-file') && fileContent.includes('detail: { path: node.path }');
  },

  // Test 4: Verify app.js listens for open-file events
  testAppListensForOpenFile: () => {
    const fileContent = require('fs').readFileSync('./app.js', 'utf8');
    return fileContent.includes("window.addEventListener('open-file'");
  },

  // Test 5: Verify app.js loads file content
  testAppLoadsFile: () => {
    const fileContent = require('fs').readFileSync('./app.js', 'utf8');
    return fileContent.includes('await api.loadFile(path)') && 
           fileContent.includes('window.editor.loadFile(path, content)');
  },

  // Test 6: Test integration - simulate double-click
  testIntegration: () => {
    // This would be an integration test
    // Create a mock node
    const mockNode = {
      id: 'test-file.md',
      name: 'test-file',
      path: 'test/test-file.md',
      type: 'command'
    };
    
    let eventFired = false;
    const handler = (event) => {
      eventFired = true;
      return event.detail.path === mockNode.path;
    };
    
    window.addEventListener('open-file', handler);
    
    // Simulate double-click
    const GraphViewer = window.GraphViewer || require('./graph-viewer.js');
    const viewer = new GraphViewer(document.createElement('div'));
    viewer.onNodeDoubleClick(mockNode);
    
    window.removeEventListener('open-file', handler);
    
    return eventFired;
  }
};

// Run tests
function runTests() {
  const results = [];
  
  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      const result = testFn();
      results.push({
        name: testName,
        passed: result,
        error: null
      });
    } catch (error) {
      results.push({
        name: testName,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Print results
  console.log('\n=== Double-click Open File Test Results ===\n');
  
  let passedCount = 0;
  results.forEach(result => {
    if (result.passed) {
      console.log(`✓ ${result.name}`);
      passedCount++;
    } else {
      console.log(`✗ ${result.name}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }
  });
  
  console.log(`\nTotal: ${passedCount}/${results.length} tests passed`);
  
  return passedCount === results.length;
}

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tests, runTests };
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}