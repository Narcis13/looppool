import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runTests() {
  const tests = [];
  let passed = 0;
  let failed = 0;
  
  // Test helper
  function test(name, fn) {
    tests.push({ name, fn });
  }
  
  // Read the state-panel.js file
  const statePanelPath = join(__dirname, 'src/frontend/state-panel.js');
  const content = readFileSync(statePanelPath, 'utf8');
  
  // Test 1: Check that view decisions button HTML is present
  test('View decisions button HTML is present', () => {
    if (!content.includes('view-decisions-btn')) {
      throw new Error('view-decisions-btn class not found');
    }
    
    if (!content.includes('data-path="DECISIONS.md"')) {
      throw new Error('DECISIONS.md path not found');
    }
    
    if (!content.includes('📋 View decisions')) {
      throw new Error('View decisions button text not found');
    }
  });
  
  // Test 2: Check event handler for view decisions button
  test('View decisions button event handler exists', () => {
    if (!content.includes("e.target.classList.contains('view-decisions-btn')")) {
      throw new Error('View decisions button event handler not found');
    }
    
    // Check that handler section dispatches open-file event
    const handlerRegex = /view-decisions-btn[\s\S]*?open-file/;
    if (!handlerRegex.test(content)) {
      throw new Error('View decisions handler does not dispatch open-file event');
    }
  });
  
  // Test 3: Check CSS styling
  test('View decisions button CSS exists', () => {
    if (!content.includes('.view-decisions-btn {')) {
      throw new Error('View decisions button CSS not found');
    }
    
    if (!content.includes('background: #7c3aed')) {
      throw new Error('Purple background color not found');
    }
    
    if (!content.includes('.view-decisions-btn:hover')) {
      throw new Error('Hover state CSS not found');
    }
    
    if (!content.includes('.view-decisions-btn:active')) {
      throw new Error('Active state CSS not found');
    }
  });
  
  // Test 4: Check button is in quick actions section
  test('Button is in quick actions section', () => {
    // Just check that both buttons exist in the content
    if (!content.includes('quick-actions-section')) {
      throw new Error('Quick actions section not found in file');
    }
    
    // Check that both buttons are defined with the quick-action-btn class
    const resumeMatch = content.match(/class="[^"]*quick-action-btn[^"]*resume-work-btn[^"]*"/);
    const decisionsMatch = content.match(/class="[^"]*quick-action-btn[^"]*view-decisions-btn[^"]*"/);
    
    if (!resumeMatch) {
      throw new Error('Resume work button with quick-action-btn class not found');
    }
    
    if (!decisionsMatch) {
      throw new Error('View decisions button with quick-action-btn class not found');
    }
  });
  
  // Test 5: Check button attributes
  test('View decisions button has correct attributes', () => {
    const buttonMatch = content.match(/<button[^>]*view-decisions-btn[^>]*>/);
    if (!buttonMatch) {
      throw new Error('View decisions button element not found');
    }
    
    const buttonHtml = buttonMatch[0];
    
    if (!buttonHtml.includes('quick-action-btn')) {
      throw new Error('Button missing quick-action-btn class');
    }
    
    if (!buttonHtml.includes('data-path="DECISIONS.md"')) {
      throw new Error('Button missing correct data-path');
    }
  });
  
  // Run all tests
  console.log('Running View Decisions Button tests...\n');
  
  for (const { name, fn } of tests) {
    try {
      fn();
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
const success = runTests();
process.exit(success ? 0 : 1);