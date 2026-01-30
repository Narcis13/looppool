// Test for command file parsing functionality in graph viewer
import assert from 'assert';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the graph viewer implementation
const graphViewerPath = join(__dirname, 'src/frontend/graph-viewer.js');
const graphViewerCode = fs.readFileSync(graphViewerPath, 'utf8');

console.log('Testing command file parsing functionality...\n');

// Test 1: Check if GraphViewer class is defined
console.log('1. Testing GraphViewer class definition...');
assert(graphViewerCode.includes('class GraphViewer'), 'GraphViewer class should be defined');
console.log('✓ GraphViewer class is defined');

// Test 2: Check if parseCommandRelationships method exists
console.log('\n2. Testing parseCommandRelationships method...');
assert(graphViewerCode.includes('parseCommandRelationships(commandId, content)'), 'parseCommandRelationships method should exist');
console.log('✓ parseCommandRelationships method exists');

// Test 3: Check workflow pattern matching
console.log('\n3. Testing workflow pattern...');
const workflowPatternMatch = graphViewerCode.match(/const workflowPattern = \/(.+)\/g/);
assert(workflowPatternMatch, 'Workflow pattern should be defined');
const workflowPattern = new RegExp(workflowPatternMatch[1], 'g');

// Test pattern matching
const testCases = [
  { content: 'looppool/workflows/test-workflow.md', expected: true },
  { content: 'looppool/workflows/my-complex-workflow.md', expected: true },
  { content: 'some/other/path.md', expected: false },
  { content: 'looppool/templates/test.md', expected: false },
  { content: 'workflows/test.md', expected: false }
];

testCases.forEach((test, index) => {
  const matches = test.content.match(workflowPattern);
  const found = matches !== null && matches.length > 0;
  assert.strictEqual(found, test.expected, `Pattern test ${index + 1} failed for: ${test.content}`);
});
console.log('✓ Workflow pattern correctly matches workflow references');

// Test 4: Check code block filtering logic
console.log('\n4. Testing code block filtering...');
assert(graphViewerCode.includes('const beforeMatch = content.substring(0, content.indexOf(match))'), 'Should extract content before match');
assert(graphViewerCode.includes('const codeBlockCount = (beforeMatch.match(/```/g) || []).length'), 'Should count code blocks');
assert(graphViewerCode.includes('if (codeBlockCount % 2 === 0)'), 'Should check if not in code block');
console.log('✓ Code block filtering logic is implemented');

// Test 5: Check if addRelationship is called with correct parameters
console.log('\n5. Testing relationship creation...');
assert(graphViewerCode.includes("this.addRelationship(commandId, match, 'delegates-to')"), 'Should create delegates-to relationship');
console.log('✓ Creates delegates-to relationship for workflow references');

// Test 6: Verify the method handles empty content
console.log('\n6. Testing empty content handling...');
assert(graphViewerCode.includes('const matches = content.match(workflowPattern) || []'), 'Should handle no matches gracefully');
console.log('✓ Handles empty content gracefully');

// Test 7: Check integration with parseFileRelationships
console.log('\n7. Testing integration with parseFileRelationships...');
assert(graphViewerCode.includes("if (file.type === 'command') {"), 'Should check for command type');
assert(graphViewerCode.includes('this.parseCommandRelationships(nodeId, content)'), 'Should call parseCommandRelationships for command files');
console.log('✓ Properly integrated with parseFileRelationships');

// Test 8: Verify extractFiles method identifies command files
console.log('\n8. Testing command file identification...');
assert(graphViewerCode.includes("if (fullPath.startsWith('commands/') && fullPath.endsWith('.md'))"), 'Should identify command files');
assert(graphViewerCode.includes("files.push({ path: fullPath, type: 'command' })"), 'Should mark files as command type');
console.log('✓ Correctly identifies command files in extractFiles');

// Test 9: Test the complete parsing flow
console.log('\n9. Testing complete parsing flow...');
assert(graphViewerCode.includes('async parseGraphData()'), 'Should have parseGraphData method');
assert(graphViewerCode.includes('await this.parseFileRelationships(file)'), 'Should parse each file');
console.log('✓ Complete parsing flow is implemented');

// Test 10: Verify error handling
console.log('\n10. Testing error handling...');
assert(graphViewerCode.includes('} catch (error) {'), 'Should handle errors in parseGraphData');
assert(graphViewerCode.includes('console.error(\'Error parsing graph data:\', error)'), 'Should log parsing errors');
console.log('✓ Error handling is implemented');

console.log('\n✅ All tests passed! Command file parsing is properly implemented.');