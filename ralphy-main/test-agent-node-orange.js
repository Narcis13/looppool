#!/usr/bin/env node

// Test suite for agent node orange styling
const fs = require('fs');
const path = require('path');

console.log('Testing agent node orange styling...\n');

// Test 1: Check if graph-viewer.js exists
const graphViewerPath = path.join(__dirname, 'src', 'frontend', 'graph-viewer.js');
console.log('Test 1: Checking if graph-viewer.js exists...');
if (!fs.existsSync(graphViewerPath)) {
  console.error('✗ graph-viewer.js not found');
  process.exit(1);
}
console.log('✓ graph-viewer.js exists');

// Test 2: Check if GraphViewer class is defined
console.log('\nTest 2: Checking if GraphViewer class is defined...');
const graphViewerContent = fs.readFileSync(graphViewerPath, 'utf-8');
if (!graphViewerContent.includes('class GraphViewer')) {
  console.error('✗ GraphViewer class not found');
  process.exit(1);
}
console.log('✓ GraphViewer class is defined');

// Test 3: Check if getNodeColor method exists
console.log('\nTest 3: Checking if getNodeColor method exists...');
if (!graphViewerContent.includes('getNodeColor(type)')) {
  console.error('✗ getNodeColor method not found');
  process.exit(1);
}
console.log('✓ getNodeColor method exists');

// Test 4: Check if agent nodes are styled as orange (#ff9800)
console.log('\nTest 4: Checking if agent nodes are styled as orange...');
const agentColorMatch = graphViewerContent.match(/case\s+['"]agent['"]\s*:\s*return\s+['"]#ff9800['"]/);
if (!agentColorMatch) {
  console.error('✗ Agent nodes are not styled as orange (#ff9800)');
  process.exit(1);
}
console.log('✓ Agent nodes are styled as orange (#ff9800)');

// Test 5: Check if color is applied to SVG circles
console.log('\nTest 5: Checking if color is applied to SVG circles...');
if (!graphViewerContent.includes("circle.setAttribute('fill', this.getNodeColor(node.type))")) {
  console.error('✗ Color is not applied to SVG circles using getNodeColor');
  process.exit(1);
}
console.log('✓ Color is applied to SVG circles using getNodeColor');

// Test 6: Check other node colors to ensure distinct styling
console.log('\nTest 6: Checking other node colors for distinct styling...');
const colors = {
  'command': '#2196f3',  // blue
  'workflow': '#4caf50', // green
  'agent': '#ff9800',    // orange
  'template': '#9e9e9e'  // gray
};

let allColorsCorrect = true;
for (const [nodeType, expectedColor] of Object.entries(colors)) {
  const colorPattern = new RegExp(`case\\s+['"]${nodeType}['"]\\s*:\\s*return\\s+['"]${expectedColor}['"]`);
  if (!graphViewerContent.match(colorPattern)) {
    console.error(`✗ ${nodeType} nodes are not styled as ${expectedColor}`);
    allColorsCorrect = false;
  }
}

if (!allColorsCorrect) {
  process.exit(1);
}
console.log('✓ All node types have distinct and correct colors');

// Test 7: Check node rendering attributes
console.log('\nTest 7: Checking node rendering attributes...');
const circleAttrs = [
  "circle.setAttribute('r', '8')",
  "circle.setAttribute('stroke', '#fff')",
  "circle.setAttribute('stroke-width', '2')"
];

let allAttrsPresent = true;
for (const attr of circleAttrs) {
  if (!graphViewerContent.includes(attr)) {
    console.error(`✗ Missing circle attribute: ${attr}`);
    allAttrsPresent = false;
  }
}

if (!allAttrsPresent) {
  process.exit(1);
}
console.log('✓ All node rendering attributes are present');

console.log('\n✅ All tests passed! Agent nodes are properly styled as orange.');