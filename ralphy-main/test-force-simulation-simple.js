import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Test runner function
function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    return true;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${RED}${error.message}${RESET}`);
    return false;
  }
}

// Simple assertion function
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Run tests
console.log('Running graph visualization force simulation tests...\n');

const results = [];

// Test 1: Verify ForceSimulation class is defined
results.push(test('ForceSimulation class should be defined in graph-viewer.js', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('class ForceSimulation'), 'ForceSimulation class not found');
}));

// Test 2: Check force simulation constructor implementation
results.push(test('ForceSimulation constructor should initialize nodes and edges', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('constructor(nodes, edges, options)'), 'Constructor signature not found');
  assert(content.includes('this.nodes = nodes.map'), 'Node initialization not found');
  assert(content.includes('this.edges = edges.map'), 'Edge initialization not found');
  assert(content.includes('this.nodeMap = new Map()'), 'Node map initialization not found');
}));

// Test 3: Verify force calculation methods
results.push(test('ForceSimulation should have force calculation methods', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('applyForceCharge()'), 'applyForceCharge method not found');
  assert(content.includes('applyForceLink()'), 'applyForceLink method not found');
  assert(content.includes('applyForceCenter()'), 'applyForceCenter method not found');
}));

// Test 4: Check simulation tick and animation
results.push(test('ForceSimulation should have tick and animation methods', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('tick()'), 'tick method not found');
  assert(content.includes('requestAnimationFrame'), 'Animation frame request not found');
  assert(content.includes('this.running'), 'Running state not found');
}));

// Test 5: Verify charge force implementation with -300 value
results.push(test('Force simulation should use charge value -300', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('charge: -300'), 'Charge value -300 not found in simulation options');
  assert(content.includes('charge: options.charge || -300'), 'Default charge value not set correctly');
}));

// Test 6: Check link distance configuration by edge type
results.push(test('Link distance should vary by edge type', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes("edge.type === 'delegates-to'"), 'delegates-to edge type not found');
  assert(content.includes("edge.type === 'spawns'"), 'spawns edge type not found');
  assert(content.includes("edge.type === 'uses'"), 'uses edge type not found');
  assert(content.includes('return 150'), 'Link distance 150 not found');
  assert(content.includes('return 120'), 'Link distance 120 not found');
  assert(content.includes('return 100'), 'Link distance 100 not found');
}));

// Test 7: Verify SVG rendering implementation
results.push(test('Graph viewer should render SVG elements', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('createElementNS'), 'SVG element creation not found');
  assert(content.includes("'http://www.w3.org/2000/svg'"), 'SVG namespace not found');
  assert(content.includes("'g'"), 'SVG group elements not found');
  assert(content.includes("'circle'"), 'SVG circle elements not found');
  assert(content.includes("'line'"), 'SVG line elements not found');
}));

// Test 8: Check node color styling by type
results.push(test('Nodes should be styled with correct colors', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('getNodeColor(type)'), 'getNodeColor method not found');
  assert(content.includes("case 'command': return '#2196f3'"), 'Blue color for commands not found');
  assert(content.includes("case 'workflow': return '#4caf50'"), 'Green color for workflows not found');
  assert(content.includes("case 'agent': return '#ff9800'"), 'Orange color for agents not found');
  assert(content.includes("case 'template': return '#9e9e9e'"), 'Gray color for templates not found');
}));

// Test 9: Verify drag behavior implementation
results.push(test('Nodes should support drag behavior', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('enableDragging'), 'enableDragging method not found');
  assert(content.includes('mousedown'), 'Mouse down event not found');
  assert(content.includes('mousemove'), 'Mouse move event not found');
  assert(content.includes('mouseup'), 'Mouse up event not found');
  assert(content.includes('simNode.fx'), 'Fixed x position not used');
  assert(content.includes('simNode.fy'), 'Fixed y position not used');
}));

// Test 10: Check zoom and pan implementation
results.push(test('Graph should support zoom (0.1 to 4) and pan', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('setupZoomPan'), 'setupZoomPan method not found');
  assert(content.includes('minScale = 0.1'), 'Min zoom scale 0.1 not found');
  assert(content.includes('maxScale = 4'), 'Max zoom scale 4 not found');
  assert(content.includes('wheel'), 'Wheel event for zoom not found');
  assert(content.includes('scale(${scale})'), 'Scale transform not found');
}));

// Test 11: Verify node interaction handlers
results.push(test('Nodes should have click, double-click, and hover handlers', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/graph-viewer.js'), 'utf8');
  assert(content.includes('onNodeClick'), 'onNodeClick handler not found');
  assert(content.includes('onNodeDoubleClick'), 'onNodeDoubleClick handler not found');
  assert(content.includes('onNodeHover'), 'onNodeHover handler not found');
  assert(content.includes('onNodeLeave'), 'onNodeLeave handler not found');
  assert(content.includes('open-file'), 'open-file event not dispatched on double-click');
}));

// Test 12: Check CSS styles in index.html
results.push(test('CSS styles should be defined for graph visualization', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/frontend/index.html'), 'utf8');
  assert(content.includes('.graph-viewer'), 'Graph viewer styles not found');
  assert(content.includes('.node circle'), 'Node circle styles not found');
  assert(content.includes('.edge'), 'Edge styles not found');
  assert(content.includes('.graph-tooltip'), 'Tooltip styles not found');
}));

// Print summary
console.log('\n' + '='.repeat(50));
const passed = results.filter(r => r).length;
const total = results.length;

if (passed === total) {
  console.log(`${GREEN}All tests passed! (${passed}/${total})${RESET}`);
  process.exit(0);
} else {
  console.log(`${RED}${total - passed} tests failed (${passed}/${total})${RESET}`);
  process.exit(1);
}