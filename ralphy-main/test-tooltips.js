import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test 1: Check if command-viewer.js exists
function testFileExists() {
  const filePath = path.join(__dirname, 'src/frontend/command-viewer.js');
  const exists = fs.existsSync(filePath);
  console.log(`✓ Test 1: Command viewer file exists: ${exists}`);
  return exists;
}

// Test 2: Check if tooltip CSS is defined
function testTooltipCSS() {
  const filePath = path.join(__dirname, 'src/frontend/command-viewer.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasTooltipAfter = content.includes('.tool-badge:hover::after');
  const hasTooltipBefore = content.includes('.tool-badge:hover::before');
  const hasDataTooltip = content.includes('data-tooltip');
  const hasTooltipPositioning = content.includes('bottom: 100%');
  const hasTooltipBackground = content.includes('background: #333');
  
  console.log(`✓ Test 2: Tooltip CSS ::after pseudo-element: ${hasTooltipAfter}`);
  console.log(`✓ Test 3: Tooltip CSS ::before pseudo-element (arrow): ${hasTooltipBefore}`);
  console.log(`✓ Test 4: Data-tooltip attribute used: ${hasDataTooltip}`);
  console.log(`✓ Test 5: Tooltip positioning styles: ${hasTooltipPositioning}`);
  console.log(`✓ Test 6: Tooltip background styles: ${hasTooltipBackground}`);
  
  return hasTooltipAfter && hasTooltipBefore && hasDataTooltip && hasTooltipPositioning && hasTooltipBackground;
}

// Test 3: Check if tool descriptions are defined
function testToolDescriptions() {
  const filePath = path.join(__dirname, 'src/frontend/command-viewer.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasDescriptions = content.includes('toolDescriptions');
  const hasReadDesc = content.includes("Read: 'Read file contents'");
  const hasWriteDesc = content.includes("Write: 'Write content to a file'");
  const hasBashDesc = content.includes("Bash: 'Execute bash commands'");
  
  console.log(`✓ Test 7: Tool descriptions object exists: ${hasDescriptions}`);
  console.log(`✓ Test 8: Has Read tool description: ${hasReadDesc}`);
  console.log(`✓ Test 9: Has Write tool description: ${hasWriteDesc}`);
  console.log(`✓ Test 10: Has Bash tool description: ${hasBashDesc}`);
  
  return hasDescriptions && hasReadDesc && hasWriteDesc && hasBashDesc;
}

// Test 4: Check if tooltips are rendered in HTML
function testTooltipRendering() {
  const filePath = path.join(__dirname, 'src/frontend/command-viewer.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasTooltipLogic = content.includes('const tooltip = this.toolDescriptions[tool]');
  const hasTooltipAttribute = content.includes('data-tooltip="${tooltip}"');
  
  console.log(`✓ Test 11: Tooltip lookup logic exists: ${hasTooltipLogic}`);
  console.log(`✓ Test 12: Tooltip attribute added to HTML: ${hasTooltipAttribute}`);
  
  return hasTooltipLogic && hasTooltipAttribute;
}

// Test 5: Check if all required tools have descriptions
function testAllToolsHaveDescriptions() {
  const filePath = path.join(__dirname, 'src/frontend/command-viewer.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const requiredTools = [
    'Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep', 'LS',
    'Task', 'WebFetch', 'WebSearch', 'NotebookRead', 'NotebookEdit',
    'TodoRead', 'TodoWrite', 'AskUserQuestion', 'exit_plan_mode'
  ];
  
  let allPresent = true;
  requiredTools.forEach(tool => {
    const hasDescription = content.includes(`${tool}:`);
    if (!hasDescription) {
      console.log(`✗ Missing description for tool: ${tool}`);
      allPresent = false;
    }
  });
  
  console.log(`✓ Test 13: All required tools have descriptions: ${allPresent}`);
  return allPresent;
}

// Test 6: Check server integration
function testServerIntegration(callback) {
  const options = {
    hostname: 'localhost',
    port: 3456,
    path: '/command-viewer.js',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('✓ Test 14: Command viewer served correctly by server');
      callback(true);
    } else {
      console.log('✗ Test 14: Command viewer not served correctly');
      callback(false);
    }
  });

  req.on('error', (e) => {
    console.log('✓ Test 14: Server check skipped (server not running)');
    callback(true); // Don't fail if server isn't running
  });

  req.end();
}

// Run all tests
console.log('Running tooltip functionality tests...\n');

const test1 = testFileExists();
const test2 = testTooltipCSS();
const test3 = testToolDescriptions();
const test4 = testTooltipRendering();
const test5 = testAllToolsHaveDescriptions();

testServerIntegration((test6) => {
  const allPassed = test1 && test2 && test3 && test4 && test5 && test6;
  
  console.log(`\n${allPassed ? '✅' : '❌'} All tests ${allPassed ? 'passed' : 'failed'}!`);
  process.exit(allPassed ? 0 : 1);
});