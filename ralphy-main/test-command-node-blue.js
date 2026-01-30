// Test: Command nodes are styled as blue
import assert from 'assert';
import { promises as fs } from 'fs';

async function testCommandNodeBlue() {
  console.log('Testing: Command nodes are styled as blue\n');

  // Test 1: getNodeColor method exists
  console.log('Test 1: Checking getNodeColor method exists...');
  const graphViewerContent = await fs.readFile('src/frontend/graph-viewer.js', 'utf-8');
  assert(graphViewerContent.includes('getNodeColor(type)'), 'getNodeColor method should exist');
  console.log('✓ getNodeColor method exists');

  // Test 2: Command nodes return blue color
  console.log('\nTest 2: Checking command nodes return blue color...');
  const getNodeColorMatch = graphViewerContent.match(/case 'command':\s*return\s*'([^']+)'/);
  assert(getNodeColorMatch, 'Command case should exist in getNodeColor');
  const commandColor = getNodeColorMatch[1];
  assert(commandColor === '#2196f3', `Command nodes should be blue (#2196f3), but got ${commandColor}`);
  console.log('✓ Command nodes return blue color #2196f3');

  // Test 3: getNodeColor is called when creating nodes
  console.log('\nTest 3: Checking getNodeColor is used when creating nodes...');
  assert(graphViewerContent.includes("circle.setAttribute('fill', this.getNodeColor(node.type))"), 
    'getNodeColor should be called when setting node fill color');
  console.log('✓ getNodeColor is called when creating circle elements');

  // Test 4: Other node types have different colors
  console.log('\nTest 4: Checking other node types have different colors...');
  const workflowMatch = graphViewerContent.match(/case 'workflow':\s*return\s*'([^']+)'/);
  const agentMatch = graphViewerContent.match(/case 'agent':\s*return\s*'([^']+)'/);
  const templateMatch = graphViewerContent.match(/case 'template':\s*return\s*'([^']+)'/);
  
  assert(workflowMatch && workflowMatch[1] === '#4caf50', 'Workflow nodes should be green');
  assert(agentMatch && agentMatch[1] === '#ff9800', 'Agent nodes should be orange');
  assert(templateMatch && templateMatch[1] === '#9e9e9e', 'Template nodes should be gray');
  console.log('✓ Other node types have correct colors (workflow: green, agent: orange, template: gray)');

  // Test 5: CSS includes graph node styling
  console.log('\nTest 5: Checking CSS includes graph node styling...');
  const indexContent = await fs.readFile('src/frontend/index.html', 'utf-8');
  assert(indexContent.includes('.graph-viewer'), 'Graph viewer CSS should exist');
  assert(indexContent.includes('circle'), 'SVG circle styling should exist');
  console.log('✓ CSS includes graph node styling');

  // Test 6: Verify node creation sets proper attributes
  console.log('\nTest 6: Checking node creation sets proper attributes...');
  assert(graphViewerContent.includes("circle.setAttribute('r', '8')"), 'Circle radius should be set to 8');
  assert(graphViewerContent.includes("circle.setAttribute('stroke', '#fff')"), 'Circle stroke should be white');
  assert(graphViewerContent.includes("circle.setAttribute('stroke-width', '2')"), 'Circle stroke width should be 2');
  console.log('✓ Node circles have proper attributes (radius: 8, stroke: white, stroke-width: 2)');

  console.log('\n✅ All tests passed! Command nodes are properly styled as blue (#2196f3)');
}

// Run the tests
testCommandNodeBlue().catch(console.error);