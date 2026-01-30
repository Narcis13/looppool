// Test suite for pan with drag behavior in graph visualization
import { GraphViewer } from './graph-viewer.js';

console.log('Testing pan with drag behavior...\n');

let passedTests = 0;
let totalTests = 0;

function test(description, assertion) {
  totalTests++;
  try {
    if (assertion()) {
      console.log(`✓ ${description}`);
      passedTests++;
    } else {
      console.log(`✗ ${description}`);
    }
  } catch (error) {
    console.log(`✗ ${description} - Error: ${error.message}`);
  }
}

// Test 1: GraphViewer class exists
test('GraphViewer class is defined', () => {
  return typeof GraphViewer === 'function';
});

// Test 2: setupZoomPan method exists
test('setupZoomPan method exists', () => {
  const viewer = new GraphViewer();
  return typeof viewer.setupZoomPan === 'function';
});

// Test 3: Pan variables initialized
test('Pan with drag implementation includes isPanning flag', () => {
  const setupZoomPanStr = GraphViewer.prototype.setupZoomPan.toString();
  return setupZoomPanStr.includes('isPanning = false') &&
         setupZoomPanStr.includes('panStartX') &&
         setupZoomPanStr.includes('panStartY');
});

// Test 4: Mousedown event listener for pan
test('Mousedown event listener checks for SVG target', () => {
  const setupZoomPanStr = GraphViewer.prototype.setupZoomPan.toString();
  return setupZoomPanStr.includes('mousedown') &&
         setupZoomPanStr.includes('e.target === svg') &&
         setupZoomPanStr.includes('isPanning = true');
});

// Test 5: Mousemove event listener for panning
test('Mousemove event updates translateX and translateY', () => {
  const setupZoomPanStr = GraphViewer.prototype.setupZoomPan.toString();
  return setupZoomPanStr.includes('mousemove') &&
         setupZoomPanStr.includes('translateX += e.clientX - panStartX') &&
         setupZoomPanStr.includes('translateY += e.clientY - panStartY');
});

// Test 6: Cursor changes during pan
test('Cursor changes to grab/grabbing during pan', () => {
  const setupZoomPanStr = GraphViewer.prototype.setupZoomPan.toString();
  return setupZoomPanStr.includes('cursor = \'grab\'') &&
         setupZoomPanStr.includes('cursor = \'grabbing\'');
});

// Test 7: Mouseup event stops panning
test('Mouseup event sets isPanning to false', () => {
  const setupZoomPanStr = GraphViewer.prototype.setupZoomPan.toString();
  return setupZoomPanStr.includes('mouseup') &&
         setupZoomPanStr.includes('isPanning = false') &&
         setupZoomPanStr.includes('cursor = \'auto\'');
});

// Test 8: updateTransform is called during panning
test('updateTransform is called with scale and translate values', () => {
  const setupZoomPanStr = GraphViewer.prototype.setupZoomPan.toString();
  return setupZoomPanStr.includes('this.updateTransform(svg, scale, translateX, translateY)');
});

// Test 9: Pan updates are incremental
test('Pan updates use incremental movement calculation', () => {
  const setupZoomPanStr = GraphViewer.prototype.setupZoomPan.toString();
  return setupZoomPanStr.includes('panStartX = e.clientX') &&
         setupZoomPanStr.includes('panStartY = e.clientY');
});

// Test 10: setupZoomPan is called in renderGraph
test('setupZoomPan is called when graph is rendered', () => {
  const renderGraphStr = GraphViewer.prototype.renderGraph.toString();
  return renderGraphStr.includes('this.setupZoomPan');
});

// Summary
console.log(`\nTest Results: ${passedTests}/${totalTests} passed`);

if (passedTests === totalTests) {
  console.log('\n✅ All tests passed! Pan with drag behavior is fully implemented.');
} else {
  console.log('\n❌ Some tests failed. Pan functionality may need additional implementation.');
}