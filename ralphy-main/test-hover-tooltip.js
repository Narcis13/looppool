// Test for hover tooltip functionality in graph visualization

const fs = require('fs');
const path = require('path');

console.log('Testing hover tooltip functionality for graph nodes...\n');

// Load the graph viewer source
const graphViewerPath = path.join(__dirname, 'src', 'frontend', 'graph-viewer.js');
const graphViewerSource = fs.readFileSync(graphViewerPath, 'utf8');

// Test 1: Check if onNodeHover method exists
const hasOnNodeHover = graphViewerSource.includes('onNodeHover(node) {');
console.log('Test 1 - onNodeHover method exists:', hasOnNodeHover ? 'PASS' : 'FAIL');

// Test 2: Check if onNodeLeave method exists
const hasOnNodeLeave = graphViewerSource.includes('onNodeLeave(node) {');
console.log('Test 2 - onNodeLeave method exists:', hasOnNodeLeave ? 'PASS' : 'FAIL');

// Test 3: Check if tooltip element is created with correct class
const hasTooltipClass = graphViewerSource.includes("tooltip.className = 'graph-tooltip'");
console.log('Test 3 - Tooltip element has correct class:', hasTooltipClass ? 'PASS' : 'FAIL');

// Test 4: Check if tooltip displays node name and type
const hasTooltipContent = graphViewerSource.includes('tooltip.textContent = `${node.name} (${node.type})`');
console.log('Test 4 - Tooltip displays node details:', hasTooltipContent ? 'PASS' : 'FAIL');

// Test 5: Check if tooltip styling is set
const hasTooltipStyles = graphViewerSource.includes("tooltip.style.background = 'rgba(0, 0, 0, 0.8)'") &&
                        graphViewerSource.includes("tooltip.style.color = 'white'") &&
                        graphViewerSource.includes("tooltip.style.padding = '4px 8px'") &&
                        graphViewerSource.includes("tooltip.style.borderRadius = '4px'");
console.log('Test 5 - Tooltip has proper styling:', hasTooltipStyles ? 'PASS' : 'FAIL');

// Test 6: Check if tooltip position follows mouse
const hasMouseMoveHandler = graphViewerSource.includes("document.addEventListener('mousemove', updateTooltipPosition)");
console.log('Test 6 - Tooltip follows mouse position:', hasMouseMoveHandler ? 'PASS' : 'FAIL');

// Test 7: Check if tooltip is cleaned up on leave
const hasTooltipRemoval = graphViewerSource.includes('this._currentTooltip.remove()') &&
                         graphViewerSource.includes("document.removeEventListener('mousemove', this._tooltipMouseMoveHandler)");
console.log('Test 7 - Tooltip is removed on mouse leave:', hasTooltipRemoval ? 'PASS' : 'FAIL');

// Test 8: Check if hover event listeners are attached
const hasHoverListeners = graphViewerSource.includes("group.addEventListener('mouseenter', () => this.onNodeHover(node))") &&
                         graphViewerSource.includes("group.addEventListener('mouseleave', () => this.onNodeLeave(node))");
console.log('Test 8 - Hover event listeners are attached:', hasHoverListeners ? 'PASS' : 'FAIL');

// Test 9: Check if tooltip is positioned relative to mouse
const hasTooltipPosition = graphViewerSource.includes('tooltip.style.left = e.clientX + 10 + \'px\'') &&
                          graphViewerSource.includes('tooltip.style.top = e.clientY - 30 + \'px\'');
console.log('Test 9 - Tooltip is positioned correctly:', hasTooltipPosition ? 'PASS' : 'FAIL');

// Test 10: Check if tooltip has pointer-events: none
const hasPointerEvents = graphViewerSource.includes("tooltip.style.pointerEvents = 'none'");
console.log('Test 10 - Tooltip does not block interactions:', hasPointerEvents ? 'PASS' : 'FAIL');

// Count passes
const tests = [
  hasOnNodeHover,
  hasOnNodeLeave,
  hasTooltipClass,
  hasTooltipContent,
  hasTooltipStyles,
  hasMouseMoveHandler,
  hasTooltipRemoval,
  hasHoverListeners,
  hasTooltipPosition,
  hasPointerEvents
];

const passCount = tests.filter(t => t).length;
console.log(`\nTotal: ${passCount}/10 tests passed`);

if (passCount === 10) {
  console.log('\n✅ All tests passed! Hover tooltip functionality is fully implemented.');
} else {
  console.log('\n❌ Some tests failed. Please check the implementation.');
  process.exit(1);
}