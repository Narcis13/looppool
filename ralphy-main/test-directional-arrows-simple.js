// Simple test for directional arrow edges
const fs = require('fs');
const path = require('path');

// Read the graph-viewer.js file
const filePath = path.join(__dirname, 'src/frontend/graph-viewer.js');
const content = fs.readFileSync(filePath, 'utf8');

let allTestsPassed = true;

// Test 1: Check arrow marker is created before edges
console.log('Test 1: Arrow marker created before edges');
const renderGraphStart = content.indexOf('renderGraph(graphData)');
const defsCreation = content.indexOf('// Create arrow marker for directional edges', renderGraphStart);
const edgeCreation = content.indexOf('// Create edge elements', renderGraphStart);

if (defsCreation > 0 && edgeCreation > 0 && defsCreation < edgeCreation) {
  console.log('✓ Arrow marker is created before edges');
} else {
  console.log('✗ Arrow marker is not created before edges');
  allTestsPassed = false;
}

// Test 2: Check marker attributes
console.log('\nTest 2: Marker attributes');
const markerIdMatch = content.match(/marker\.setAttribute\('id',\s*'arrow'\)/);
const markerOrientMatch = content.match(/marker\.setAttribute\('orient',\s*'auto'\)/);
const markerWidthMatch = content.match(/marker\.setAttribute\('markerWidth',\s*'6'\)/);
const markerHeightMatch = content.match(/marker\.setAttribute\('markerHeight',\s*'6'\)/);
const markerRefXMatch = content.match(/marker\.setAttribute\('refX',\s*'15'\)/);

if (markerIdMatch && markerOrientMatch && markerWidthMatch && markerHeightMatch && markerRefXMatch) {
  console.log('✓ All marker attributes are correct');
} else {
  console.log('✗ Some marker attributes are missing');
  allTestsPassed = false;
}

// Test 3: Check arrow path
console.log('\nTest 3: Arrow path');
const pathMatch = content.match(/path\.setAttribute\('d',\s*'M0,-5L10,0L0,5'\)/);
const pathFillMatch = content.match(/path\.setAttribute\('fill',\s*'#999'\)/);

if (pathMatch && pathFillMatch) {
  console.log('✓ Arrow path is correctly defined');
} else {
  console.log('✗ Arrow path is not correctly defined');
  allTestsPassed = false;
}

// Test 4: Check edges have marker-end attribute
console.log('\nTest 4: Edges have marker-end attribute');
const markerEndMatch = content.match(/line\.setAttribute\('marker-end',\s*'url\(#arrow\)'\)/);

if (markerEndMatch) {
  console.log('✓ Edges have marker-end attribute');
} else {
  console.log('✗ Edges do not have marker-end attribute');
  allTestsPassed = false;
}

// Test 5: Check SVG structure
console.log('\nTest 5: SVG structure');
const defsAppendMatch = content.match(/svg\.appendChild\(defs\)/);
const markerAppendMatch = content.match(/defs\.appendChild\(marker\)/);
const pathAppendMatch = content.match(/marker\.appendChild\(path\)/);

if (defsAppendMatch && markerAppendMatch && pathAppendMatch) {
  console.log('✓ SVG structure is correct');
} else {
  console.log('✗ SVG structure is incorrect');
  allTestsPassed = false;
}

// Summary
console.log('\n' + '='.repeat(40));
if (allTestsPassed) {
  console.log('All tests passed! ✓');
  process.exit(0);
} else {
  console.log('Some tests failed! ✗');
  process.exit(1);
}