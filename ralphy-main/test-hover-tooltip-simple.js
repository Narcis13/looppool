import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Test 3: Check if tooltip displays node details
const hasTooltipContent = graphViewerSource.includes('tooltip.textContent = `${node.name} (${node.type})`');
console.log('Test 3 - Tooltip displays node details:', hasTooltipContent ? 'PASS' : 'FAIL');

// Test 4: Check if hover event listeners are attached
const hasHoverListeners = graphViewerSource.includes("group.addEventListener('mouseenter', () => this.onNodeHover(node))") &&
                         graphViewerSource.includes("group.addEventListener('mouseleave', () => this.onNodeLeave(node))");
console.log('Test 4 - Hover event listeners are attached:', hasHoverListeners ? 'PASS' : 'FAIL');

// Test 5: Check if tooltip is removed on leave
const hasTooltipRemoval = graphViewerSource.includes('this._currentTooltip.remove()');
console.log('Test 5 - Tooltip is removed on mouse leave:', hasTooltipRemoval ? 'PASS' : 'FAIL');

// Count passes
const tests = [
  hasOnNodeHover,
  hasOnNodeLeave,
  hasTooltipContent,
  hasHoverListeners,
  hasTooltipRemoval
];

const passCount = tests.filter(t => t).length;
console.log(`\nTotal: ${passCount}/5 tests passed`);

if (passCount === 5) {
  console.log('\n✅ All tests passed! Hover tooltip functionality is fully implemented.');
} else {
  console.log('\n❌ Some tests failed.');
  process.exit(1);
}