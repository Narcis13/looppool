import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testResults = [];

function addResult(test, passed, details = '') {
  testResults.push({ test, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${test}${details ? ': ' + details : ''}`);
}

// Test 1: Check if state-panel.js exists
const statePanelPath = path.join(__dirname, 'src/frontend/state-panel.js');
if (fs.existsSync(statePanelPath)) {
  addResult('State panel file exists', true);
  
  const content = fs.readFileSync(statePanelPath, 'utf8');
  
  // Test 2: Check for StatePanel class
  if (content.includes('class StatePanel')) {
    addResult('StatePanel class defined', true);
  } else {
    addResult('StatePanel class defined', false);
  }
  
  // Test 3: Check for loadProjectMd method
  if (content.includes('loadProjectMd')) {
    addResult('loadProjectMd method exists', true);
  } else {
    addResult('loadProjectMd method exists', false);
  }
  
  // Test 4: Check for parseMarkdown method
  if (content.includes('parseMarkdown')) {
    addResult('parseMarkdown method exists', true);
  } else {
    addResult('parseMarkdown method exists', false);
  }
  
  // Test 5: Check for PROJECT.md API call
  if (content.includes('/api/file?path=PROJECT.md')) {
    addResult('PROJECT.md API call implemented', true);
  } else {
    addResult('PROJECT.md API call implemented', false);
  }
  
  // Test 6: Check for markdown rendering
  const markdownTags = ['<h1>', '<h2>', '<h3>', '<strong>', '<em>', '<code>', '<pre>', '<a href='];
  const missingTags = [];
  markdownTags.forEach(tag => {
    if (!content.includes(tag)) {
      missingTags.push(tag);
    }
  });
  
  if (missingTags.length === 0) {
    addResult('Markdown rendering tags', true);
  } else {
    addResult('Markdown rendering tags', false, `Missing: ${missingTags.join(', ')}`);
  }
  
  // Test 7: Check for project section rendering
  if (content.includes('project-section')) {
    addResult('Project section CSS class', true);
  } else {
    addResult('Project section CSS class', false);
  }
  
  // Test 8: Check for markdown-content CSS
  if (content.includes('markdown-content')) {
    addResult('Markdown content CSS', true);
  } else {
    addResult('Markdown content CSS', false);
  }
  
} else {
  addResult('State panel file exists', false);
}

// Test 9: Check index.html integration
const indexPath = path.join(__dirname, 'src/frontend/index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  
  if (html.includes('state-panel.js')) {
    addResult('State panel script in HTML', true);
  } else {
    addResult('State panel script in HTML', false);
  }
  
  if (html.includes('state-panel-container')) {
    addResult('State panel container in HTML', true);
  } else {
    addResult('State panel container in HTML', false);
  }
  
  if (html.includes('new StatePanel')) {
    addResult('State panel initialized in HTML', true);
  } else {
    addResult('State panel initialized in HTML', false);
  }
} else {
  addResult('Index.html exists', false);
}

// Summary
console.log('\n=== TEST SUMMARY ===');
const passed = testResults.filter(r => r.passed).length;
const total = testResults.length;
console.log(`Passed: ${passed}/${total}`);

testResults.forEach(result => {
  console.log(`${result.passed ? '✓' : '✗'} ${result.test}${result.details ? ': ' + result.details : ''}`);
});

process.exit(passed === total ? 0 : 1);