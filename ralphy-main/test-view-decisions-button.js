import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess;
const serverPort = 4567; // Use a different port to avoid conflicts

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [
      join(__dirname, 'src/server/index.js'),
      '--port', serverPort.toString(),
      '--no-open'
    ], {
      stdio: 'pipe',
      cwd: __dirname
    });
    
    let output = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes(`Server running at`)) {
        setTimeout(resolve, 500);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    serverProcess.on('error', reject);
    
    setTimeout(() => reject(new Error('Server failed to start')), 10000);
  });
}

async function runTests() {
  const tests = [];
  let passed = 0;
  let failed = 0;
  
  // Test helper
  function test(name, fn) {
    tests.push({ name, fn });
  }
  
  // Test 1: Check that renderResumeWorkButton method includes view decisions button
  test('renderResumeWorkButton includes view decisions button', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    if (!content.includes('renderResumeWorkButton')) {
      throw new Error('renderResumeWorkButton method not found');
    }
    
    // Check for view decisions button HTML
    if (!content.includes('view-decisions-btn')) {
      throw new Error('view-decisions-btn class not found in renderResumeWorkButton');
    }
    
    if (!content.includes('data-path="DECISIONS.md"')) {
      throw new Error('DECISIONS.md path not found in button');
    }
    
    if (!content.includes('📋 View decisions')) {
      throw new Error('View decisions button text not found');
    }
  });
  
  // Test 2: Check that event handler includes view decisions button handling
  test('Event handler includes view decisions button handling', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    if (!content.includes("e.target.classList.contains('view-decisions-btn')")) {
      throw new Error('View decisions button event handler not found');
    }
    
    // Check that it dispatches open-file event
    const handlerSection = content.split('view-decisions-btn')[2];
    if (handlerSection && !handlerSection.includes('open-file')) {
      throw new Error('View decisions button does not dispatch open-file event');
    }
  });
  
  // Test 3: Check CSS styling for view decisions button
  test('CSS includes view decisions button styling', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    if (!content.includes('.view-decisions-btn {')) {
      throw new Error('View decisions button CSS class not found');
    }
    
    if (!content.includes('background: #7c3aed')) {
      throw new Error('View decisions button background color not correct');
    }
    
    if (!content.includes('.view-decisions-btn:hover')) {
      throw new Error('View decisions button hover state not found');
    }
    
    if (!content.includes('.view-decisions-btn:active')) {
      throw new Error('View decisions button active state not found');
    }
  });
  
  // Test 4: Check HTML structure in quick actions section
  test('Quick actions section contains both buttons', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    const renderMethod = content.split('renderResumeWorkButton')[1];
    if (!renderMethod) {
      throw new Error('renderResumeWorkButton method not found');
    }
    
    // Check that quick actions section exists
    if (!renderMethod.includes('quick-actions-section')) {
      throw new Error('Quick actions section not found');
    }
    
    // Check that both buttons are in the same container
    if (!renderMethod.includes('quick-action-buttons')) {
      throw new Error('Quick action buttons container not found');
    }
    
    // Verify button order
    const resumeIndex = renderMethod.indexOf('resume-work-btn');
    const decisionsIndex = renderMethod.indexOf('view-decisions-btn');
    
    if (resumeIndex === -1 || decisionsIndex === -1) {
      throw new Error('One or both buttons not found');
    }
    
    if (decisionsIndex < resumeIndex) {
      throw new Error('View decisions button should come after resume work button');
    }
  });
  
  // Test 5: Check button attributes
  test('View decisions button has correct attributes', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    const renderMethod = content.split('renderResumeWorkButton')[1];
    const buttonMatch = renderMethod.match(/<button[^>]*view-decisions-btn[^>]*>/);
    
    if (!buttonMatch) {
      throw new Error('View decisions button element not found');
    }
    
    const buttonHtml = buttonMatch[0];
    
    // Check classes
    if (!buttonHtml.includes('class="quick-action-btn view-decisions-btn"')) {
      throw new Error('Button does not have correct classes');
    }
    
    // Check data-path attribute
    if (!buttonHtml.includes('data-path="DECISIONS.md"')) {
      throw new Error('Button does not have correct data-path attribute');
    }
  });
  
  // Test 6: Integration with existing open-file event system
  test('View decisions button uses same event system as resume work', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    // Find both button handlers
    const resumeHandler = content.match(/if\s*\([^)]*resume-work-btn[^}]+}/s);
    const decisionsHandler = content.match(/if\s*\([^)]*view-decisions-btn[^}]+}/s);
    
    if (!resumeHandler || !decisionsHandler) {
      throw new Error('One or both button handlers not found');
    }
    
    // Both should use CustomEvent
    if (!decisionsHandler[0].includes('CustomEvent')) {
      throw new Error('View decisions handler does not use CustomEvent');
    }
    
    // Both should dispatch 'open-file' event
    if (!decisionsHandler[0].includes("'open-file'")) {
      throw new Error('View decisions handler does not dispatch open-file event');
    }
    
    // Both should get path from dataset
    if (!decisionsHandler[0].includes('dataset.path')) {
      throw new Error('View decisions handler does not use dataset.path');
    }
  });
  
  // Test 7: Check purple color scheme
  test('View decisions button uses purple color scheme', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    // Check base color
    if (!content.includes('.view-decisions-btn {') || !content.includes('background: #7c3aed')) {
      throw new Error('Base purple color not correct');
    }
    
    // Check hover color
    if (!content.includes('.view-decisions-btn:hover {') || !content.includes('background: #6d28d9')) {
      throw new Error('Hover purple color not correct');
    }
    
    // Check active color
    if (!content.includes('.view-decisions-btn:active {') || !content.includes('background: #5b21b6')) {
      throw new Error('Active purple color not correct');
    }
  });
  
  // Test 8: Method naming consistency
  test('Method still named renderResumeWorkButton', async () => {
    const response = await fetch(`http://localhost:${serverPort}/src/frontend/state-panel.js`);
    const content = await response.text();
    
    // Method should still be called renderResumeWorkButton (not renamed)
    if (!content.includes('renderResumeWorkButton()')) {
      throw new Error('Method renamed - should still be renderResumeWorkButton');
    }
    
    // Method is called in renderState
    if (!content.includes('this.renderResumeWorkButton()')) {
      throw new Error('Method not called in renderState');
    }
  });
  
  // Run all tests
  console.log('Running View Decisions Button tests...\n');
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${passed} passed, ${failed} failed`);
  
  return failed === 0;
}

// Main execution
(async () => {
  try {
    console.log('Starting test server...');
    await startServer();
    console.log('Server started successfully\n');
    
    const success = await runTests();
    
    if (serverProcess) {
      serverProcess.kill();
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Test failed:', error);
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(1);
  }
})();