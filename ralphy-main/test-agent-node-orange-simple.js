import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing agent node orange styling...\n');

// Test 1: Check if GraphViewer has getNodeColor method
console.log('Test 1: Checking GraphViewer.getNodeColor method...');
const graphViewerPath = path.join(__dirname, 'src', 'frontend', 'graph-viewer.js');
const content = fs.readFileSync(graphViewerPath, 'utf-8');
if (!content.includes('getNodeColor(type)')) {
  console.error('✗ getNodeColor method not found');
  process.exit(1);
}
console.log('✓ getNodeColor method exists');

// Test 2: Check agent node color
console.log('\nTest 2: Checking agent node color...');
const agentColorMatch = content.match(/case\s+['"]agent['"]\s*:\s*return\s+['"]#ff9800['"]/);
if (!agentColorMatch) {
  console.error('✗ Agent nodes not styled as orange');
  process.exit(1);
}
console.log('✓ Agent nodes styled as #ff9800 (orange)');

// Test 3: Check color application in rendering
console.log('\nTest 3: Checking color application...');
if (!content.includes("circle.setAttribute('fill', this.getNodeColor(node.type))")) {
  console.error('✗ Color not applied correctly');
  process.exit(1);
}
console.log('✓ Color applied to SVG circles');

// Test 4: Verify all node colors
console.log('\nTest 4: Verifying all node colors...');
const expectedColors = {
  'command': '#2196f3',
  'workflow': '#4caf50',
  'agent': '#ff9800',
  'template': '#9e9e9e'
};

for (const [type, color] of Object.entries(expectedColors)) {
  const pattern = new RegExp(`case\\s+['"]${type}['"]\\s*:\\s*return\\s+['"]${color}['"]`);
  if (!content.match(pattern)) {
    console.error(`✗ ${type} color incorrect`);
    process.exit(1);
  }
}
console.log('✓ All node types have correct colors');

// Test 5: Check node styling attributes
console.log('\nTest 5: Checking node styling...');
const attrs = [
  "circle.setAttribute('r', '8')",
  "circle.setAttribute('stroke', '#fff')",
  "circle.setAttribute('stroke-width', '2')"
];

for (const attr of attrs) {
  if (!content.includes(attr)) {
    console.error(`✗ Missing: ${attr}`);
    process.exit(1);
  }
}
console.log('✓ Node styling attributes present');

console.log('\n✅ All tests passed! Agent nodes are styled as orange.');