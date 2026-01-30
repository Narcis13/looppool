#!/usr/bin/env node

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start server
const server = spawn('node', ['src/server/index.js', '--no-open'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;
let testsPassed = 0;
let testsFailed = 0;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Server:', output);
  if (output.includes('LPL IDE server running at') && !serverReady) {
    serverReady = true;
    setTimeout(runTests, 500);
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

async function runTests() {
  console.log('\nRunning Copy Button Tests...\n');

  // Test 1: Check if copyCommand method exists and is async
  await test('copyCommand method exists and is async', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for async copyCommand method
    if (!content.includes('async copyCommand(commandName)')) {
      throw new Error('copyCommand method not found or not async');
    }
    
    // Check for Clipboard API usage
    if (!content.includes('navigator.clipboard.writeText')) {
      throw new Error('Clipboard API not used');
    }
  });

  // Test 2: Check visual feedback implementation
  await test('Visual feedback implementation', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for success feedback
    if (!content.includes("button.textContent = 'Copied!'")) {
      throw new Error('Success feedback not implemented');
    }
    
    // Check for success styling
    if (!content.includes("button.style.background = '#4caf50'")) {
      throw new Error('Success styling not implemented');
    }
    
    // Check for error feedback
    if (!content.includes("button.textContent = 'Copy failed'")) {
      throw new Error('Error feedback not implemented');
    }
    
    // Check for error styling
    if (!content.includes("button.style.background = '#f44336'")) {
      throw new Error('Error styling not implemented');
    }
  });

  // Test 3: Check error handling
  await test('Error handling implementation', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for try-catch block
    if (!content.includes('try {') || !content.includes('} catch (err) {')) {
      throw new Error('Try-catch block not found');
    }
    
    // Check for error logging
    if (!content.includes("console.error('Failed to copy to clipboard:', err)")) {
      throw new Error('Error logging not implemented');
    }
  });

  // Test 4: Check command format
  await test('Command format is correct', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for correct command format (should be /commandName not /lpl:commandName)
    if (!content.includes('const text = `/${commandName}`')) {
      throw new Error('Command format incorrect');
    }
  });

  // Test 5: Check button reset timeout
  await test('Button reset timeout implementation', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for setTimeout with 2000ms delay
    if (!content.includes('setTimeout(() => {') || !content.includes('}, 2000)')) {
      throw new Error('Button reset timeout not implemented');
    }
  });

  // Test 6: Check event listener is async
  await test('Event listener is async', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for async event listener
    if (!content.includes("?.addEventListener('click', async () => {")) {
      throw new Error('Event listener not async');
    }
    
    // Check for await in event listener
    if (!content.includes('await this.copyCommand(frontmatter.name)')) {
      throw new Error('copyCommand not awaited in event listener');
    }
  });

  // Test 7: Check button exists in UI
  await test('Copy button exists in UI', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for button HTML
    if (!content.includes('<button class="action-button copy-command">Copy as /lpl:command</button>')) {
      throw new Error('Copy button HTML not found');
    }
  });

  // Test 8: Check button styling
  await test('Button styling defined', async () => {
    const response = await fetch('http://127.0.0.1:3456/src/frontend/command-viewer.js');
    const content = await response.text();
    
    // Check for action-button CSS
    if (!content.includes('.action-button {')) {
      throw new Error('Action button styles not defined');
    }
    
    // Check for hover styles
    if (!content.includes('.action-button:hover {')) {
      throw new Error('Button hover styles not defined');
    }
  });

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);

  // Cleanup
  server.kill();
  process.exit(testsFailed > 0 ? 1 : 0);
}

async function test(name, testFn) {
  try {
    await testFn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}

async function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => data
        });
      });
    }).on('error', reject);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  server.kill();
  process.exit(1);
});

// Set a timeout to prevent hanging
setTimeout(() => {
  console.error('Test timeout');
  server.kill();
  process.exit(1);
}, 30000);