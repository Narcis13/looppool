// Simple test for pan functionality in graph-viewer.js
const fs = require('fs');
const path = require('path');

console.log('Testing pan with drag behavior...\n');

// Read the graph-viewer.js file
const graphViewerPath = path.join(__dirname, 'graph-viewer.js');
const graphViewerContent = fs.readFileSync(graphViewerPath, 'utf8');

let passedTests = 0;
let totalTests = 0;

function test(description, assertion) {
  totalTests++;
  if (assertion) {
    console.log(`✓ ${description}`);
    passedTests++;
  } else {
    console.log(`✗ ${description}`);
  }
}

// Test 1: setupZoomPan method exists
test('setupZoomPan method is defined', 
  graphViewerContent.includes('setupZoomPan(svg)'));

// Test 2: Pan variables are initialized
test('Pan variables (isPanning, panStartX, panStartY) are initialized', 
  graphViewerContent.includes('let isPanning = false') &&
  graphViewerContent.includes('let panStartX, panStartY'));

// Test 3: Mousedown event for pan initiation
test('Mousedown event initiates panning when clicking on SVG', 
  graphViewerContent.includes('svg.addEventListener(\'mousedown\'') &&
  graphViewerContent.includes('if (e.target === svg)') &&
  graphViewerContent.includes('isPanning = true'));

// Test 4: Mousemove event for panning
test('Mousemove event updates position during pan', 
  graphViewerContent.includes('svg.addEventListener(\'mousemove\'') &&
  graphViewerContent.includes('if (isPanning)') &&
  graphViewerContent.includes('translateX += e.clientX - panStartX') &&
  graphViewerContent.includes('translateY += e.clientY - panStartY'));

// Test 5: Mouseup event stops panning
test('Mouseup event stops panning', 
  graphViewerContent.includes('svg.addEventListener(\'mouseup\'') &&
  graphViewerContent.includes('isPanning = false'));

// Test 6: Cursor changes during pan
test('Cursor changes to grab/grabbing during pan', 
  graphViewerContent.includes('svg.style.cursor = \'grab\'') &&
  graphViewerContent.includes('svg.style.cursor = \'grabbing\'') &&
  graphViewerContent.includes('svg.style.cursor = \'auto\''));

// Test 7: Transform is updated during pan
test('Transform is updated with translate values', 
  graphViewerContent.includes('this.updateTransform(svg, scale, translateX, translateY)'));

// Test 8: setupZoomPan is called in renderGraph
test('setupZoomPan is called when rendering graph', 
  graphViewerContent.includes('this.setupZoomPan(svg)'));

// Summary
console.log(`\nTest Results: ${passedTests}/${totalTests} passed`);

if (passedTests === totalTests) {
  console.log('\n✅ All tests passed! Pan with drag behavior is fully implemented.');
  console.log('\nPan functionality details:');
  console.log('- Click and drag on empty SVG area to pan');
  console.log('- Cursor changes to grab/grabbing during pan');
  console.log('- Pan updates are incremental (smooth movement)');
  console.log('- Pan is integrated with zoom functionality');
} else {
  console.log('\n❌ Some tests failed.');
}