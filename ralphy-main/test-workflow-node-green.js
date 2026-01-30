import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the graph viewer file
const graphViewerContent = readFileSync(join(__dirname, 'src/frontend/graph-viewer.js'), 'utf-8');

console.log('Testing workflow nodes are styled as green...\n');

// Test 1: Check getNodeColor method exists
console.log('1. Testing getNodeColor method exists...');
const hasGetNodeColor = graphViewerContent.includes('getNodeColor(type)');
assert(hasGetNodeColor, 'getNodeColor method should be defined');
console.log('✓ getNodeColor method exists\n');

// Test 2: Check workflow nodes return green color
console.log('2. Testing workflow nodes return green color (#4caf50)...');
const workflowColorMatch = graphViewerContent.match(/case\s+'workflow':\s*return\s*'#4caf50'/);
assert(workflowColorMatch, 'Workflow nodes should return #4caf50 (green)');
console.log('✓ Workflow nodes are styled as green (#4caf50)\n');

// Test 3: Check green color comment
console.log('3. Testing green color has appropriate comment...');
const greenCommentMatch = graphViewerContent.match(/case\s+'workflow':\s*return\s*'#4caf50';\s*\/\/\s*green/);
assert(greenCommentMatch, 'Green color should have comment indicating it is green');
console.log('✓ Green color has comment\n');

// Test 4: Check getNodeColor is used in rendering
console.log('4. Testing getNodeColor is used when rendering nodes...');
const colorUsageMatch = graphViewerContent.match(/fill.*getNodeColor.*node\.type/);
assert(colorUsageMatch, 'getNodeColor should be used to set node fill color');
console.log('✓ getNodeColor is used in rendering\n');

// Test 5: Verify all node types have distinct colors
console.log('5. Testing all node types have distinct colors...');
const commandColor = graphViewerContent.match(/case\s+'command':\s*return\s*'#2196f3'/);
const agentColor = graphViewerContent.match(/case\s+'agent':\s*return\s*'#ff9800'/);
const templateColor = graphViewerContent.match(/case\s+'template':\s*return\s*'#9e9e9e'/);
assert(commandColor && agentColor && templateColor, 'All node types should have distinct colors');
console.log('✓ All node types have distinct colors\n');

// Test 6: Verify node styling integration
console.log('6. Testing node styling integration in SVG...');
const circleRenderMatch = graphViewerContent.includes("circle.setAttribute('r', '8')") && 
                         graphViewerContent.includes("circle.setAttribute('fill', this.getNodeColor(node.type))");
assert(circleRenderMatch, 'Nodes should be rendered as circles with fill color');
console.log('✓ Node styling is properly integrated\n');

console.log('All tests passed! ✅');
console.log('\nWorkflow nodes are properly styled as green (#4caf50) in the graph visualization.');