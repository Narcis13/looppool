#!/usr/bin/env node

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testPort = 3458;

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function waitForServer(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await makeRequest(`http://localhost:${port}/`);
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  return false;
}

async function runTests() {
  log('Starting find functionality integration tests...', 'yellow');

  // Start server
  const serverPath = path.join(__dirname, 'src', 'server', 'index.js');
  const server = spawn('node', [serverPath, '--port', testPort.toString(), '--no-open'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', (data) => {
    console.log(`Server: ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`Server Error: ${data.toString().trim()}`);
  });

  try {
    // Wait for server to start
    const serverReady = await waitForServer(testPort);
    if (!serverReady) {
      throw new Error('Server failed to start');
    }

    log('Server started successfully', 'green');

    // Test 1: Check if editor.js is served correctly
    log('Test 1: Editor script is served');
    const editorResponse = await makeRequest(`http://localhost:${testPort}/editor.js`);
    if (editorResponse.status === 200 && editorResponse.data.includes('MarkdownEditor')) {
      log('✓ Editor script served successfully', 'green');
    } else {
      log('✗ Editor script not served correctly', 'red');
    }

    // Test 2: Check if find functionality code is present
    log('Test 2: Find functionality code exists');
    const hasFindCode = editorResponse.data.includes('openFindBar') && 
                       editorResponse.data.includes('performFind') &&
                       editorResponse.data.includes('findNext') &&
                       editorResponse.data.includes('findPrevious');
    if (hasFindCode) {
      log('✓ Find functionality code is present', 'green');
    } else {
      log('✗ Find functionality code is missing', 'red');
    }

    // Test 3: Check keyboard shortcuts are set up
    log('Test 3: Keyboard shortcuts configured');
    const hasShortcuts = editorResponse.data.includes('Cmd/Ctrl+F') && 
                        editorResponse.data.includes('setupKeyboardShortcuts');
    if (hasShortcuts) {
      log('✓ Keyboard shortcuts are configured', 'green');
    } else {
      log('✗ Keyboard shortcuts are not configured', 'red');
    }

    // Test 4: Check find UI elements
    log('Test 4: Find UI elements present');
    const hasFindUI = editorResponse.data.includes('find-bar') && 
                     editorResponse.data.includes('find-input') &&
                     editorResponse.data.includes('find-results') &&
                     editorResponse.data.includes('find-next') &&
                     editorResponse.data.includes('find-prev');
    if (hasFindUI) {
      log('✓ Find UI elements are present', 'green');
    } else {
      log('✗ Find UI elements are missing', 'red');
    }

    // Test 5: Check HTML page includes editor
    log('Test 5: HTML page includes editor');
    const htmlResponse = await makeRequest(`http://localhost:${testPort}/`);
    const hasEditorInHTML = htmlResponse.data.includes('editor.js') && 
                           htmlResponse.data.includes('MarkdownEditor');
    if (hasEditorInHTML) {
      log('✓ HTML page includes editor initialization', 'green');
    } else {
      log('✗ HTML page missing editor initialization', 'red');
    }

    log('All tests completed!', 'green');

  } catch (error) {
    log(`Test error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    server.kill();
  }
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});