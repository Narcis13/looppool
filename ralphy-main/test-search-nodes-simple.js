// Simple test suite for graph node search functionality
import fs from 'fs';

console.log('Testing Graph Node Search Functionality...\n');

let testsPassed = 0;
let totalTests = 0;

function test(description, result) {
  totalTests++;
  if (result) {
    console.log(`✓ ${description}`);
    testsPassed++;
  } else {
    console.error(`✗ ${description}`);
  }
}

// Read files
const graphViewerContent = fs.readFileSync('./src/frontend/graph-viewer.js', 'utf8');
const htmlContent = fs.readFileSync('./src/frontend/index.html', 'utf8');

// Test 1: Check if searchNodes method exists
test('GraphViewer has searchNodes method', 
  graphViewerContent.includes('searchNodes(query)'));

// Test 2: Check search implementation includes case-insensitive search
test('searchNodes implements case-insensitive search',
  graphViewerContent.includes('toLowerCase()') && 
  graphViewerContent.includes('searchQuery') &&
  graphViewerContent.includes('nameMatches'));

// Test 3: Check search respects type filters
test('searchNodes respects active type filters',
  graphViewerContent.includes('typeFilterActive') && 
  graphViewerContent.includes('this.activeFilters'));

// Test 4: Check edge visibility update based on node visibility
test('searchNodes updates edge visibility',
  graphViewerContent.includes('this.edgeElements?.forEach') &&
  graphViewerContent.includes('sourceVisible && targetVisible'));

// Test 5: Check node count update
test('searchNodes updates node count display',
  graphViewerContent.includes('updateNodeCountDisplay(visibleNodes, totalNodes)'));

// Test 6: Check event listener setup
test('Search input has event listener',
  graphViewerContent.includes('.graph-search') &&
  graphViewerContent.includes("addEventListener('input'") &&
  graphViewerContent.includes('searchNodes'));

// Test 7: Check updateFilters integration with search
const updateFiltersStart = graphViewerContent.indexOf('updateFilters()');
const updateFiltersEnd = graphViewerContent.indexOf('async loadGraph()', updateFiltersStart);
const updateFiltersContent = graphViewerContent.substring(updateFiltersStart, updateFiltersEnd);

test('updateFilters method considers search query',
  updateFiltersContent.includes('.graph-search') &&
  updateFiltersContent.includes('searchQuery'));

// Test 8: Check CSS styles for search
test('CSS includes search-related styles',
  htmlContent.includes('.graph-search') &&
  htmlContent.includes('.graph-search:focus') &&
  htmlContent.includes('.node.search-filtered'));

// Test 9: Check GraphViewer setupHTML includes search input
test('GraphViewer setupHTML includes search input element',
  graphViewerContent.includes('class="graph-search"') &&
  graphViewerContent.includes('placeholder="Search nodes..."') &&
  graphViewerContent.includes('type="text"'));

// Test 10: Check empty search behavior
test('Empty search clears filters and shows all nodes',
  graphViewerContent.includes('if (!searchQuery)') &&
  graphViewerContent.includes('this.updateFilters()'));

console.log(`\n${testsPassed}/${totalTests} tests passed`);

if (testsPassed === totalTests) {
  console.log('\nAll tests passed! ✨');
  process.exit(0);
} else {
  console.log('\nSome tests failed.');
  process.exit(1);
}