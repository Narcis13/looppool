// Simple test for double-click to open file feature
// This test runs in the browser environment

async function testDoubleClickFeature() {
  console.log('\n=== Testing Double-click Open File Feature ===\n');
  
  const tests = [];
  
  // Test 1: Check if GraphViewer class exists
  tests.push({
    name: 'GraphViewer class exists',
    passed: typeof GraphViewer === 'function'
  });
  
  // Test 2: Check if onNodeDoubleClick method exists
  if (typeof GraphViewer === 'function') {
    try {
      const viewer = new GraphViewer(document.createElement('div'));
      tests.push({
        name: 'onNodeDoubleClick method exists',
        passed: typeof viewer.onNodeDoubleClick === 'function'
      });
    } catch (e) {
      tests.push({
        name: 'onNodeDoubleClick method exists',
        passed: false,
        error: e.message
      });
    }
  }
  
  // Test 3: Check if open-file event listener is registered in app.js
  // We'll check if the global api object has the loadFile method
  tests.push({
    name: 'API has loadFile method',
    passed: window.api && typeof window.api.loadFile === 'function'
  });
  
  // Test 4: Test event dispatching
  let eventReceived = false;
  let receivedPath = null;
  
  const testHandler = (event) => {
    eventReceived = true;
    receivedPath = event.detail ? event.detail.path : null;
  };
  
  window.addEventListener('open-file', testHandler);
  
  // Simulate the double-click behavior
  if (typeof GraphViewer === 'function') {
    try {
      const viewer = new GraphViewer(document.createElement('div'));
      const mockNode = {
        id: 'test.md',
        name: 'test',
        path: 'test/path/test.md',
        type: 'command'
      };
      
      viewer.onNodeDoubleClick(mockNode);
      
      tests.push({
        name: 'open-file event dispatched correctly',
        passed: eventReceived && receivedPath === 'test/path/test.md'
      });
    } catch (e) {
      tests.push({
        name: 'open-file event dispatched correctly',
        passed: false,
        error: e.message
      });
    }
  }
  
  window.removeEventListener('open-file', testHandler);
  
  // Test 5: Check if editor loadFile method would be called
  tests.push({
    name: 'Editor has loadFile method',
    passed: window.editor && typeof window.editor.loadFile === 'function'
  });
  
  // Display results
  console.log('Test Results:');
  let passed = 0;
  tests.forEach(test => {
    if (test.passed) {
      console.log(`✓ ${test.name}`);
      passed++;
    } else {
      console.log(`✗ ${test.name}${test.error ? ` - ${test.error}` : ''}`);
    }
  });
  
  console.log(`\nTotal: ${passed}/${tests.length} tests passed`);
  
  return passed === tests.length;
}

// Run the test when this script is loaded
if (typeof document !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testDoubleClickFeature);
  } else {
    testDoubleClickFeature();
  }
}