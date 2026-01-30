#!/usr/bin/env node

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testsPassed = 0;
let testsFailed = 0;

console.log('\nRunning Copy Button Tests (Direct File Check)...\n');

// Read the command-viewer.js file directly
const filePath = join(__dirname, 'src/frontend/command-viewer.js');
const content = fs.readFileSync(filePath, 'utf8');

// Test 1: Check if copyCommand method exists and is async
test('copyCommand method exists and is async', () => {
  if (!content.includes('async copyCommand(commandName)')) {
    throw new Error('copyCommand method not found or not async');
  }
  
  // Check for Clipboard API usage
  if (!content.includes('navigator.clipboard.writeText')) {
    throw new Error('Clipboard API not used');
  }
});

// Test 2: Check visual feedback implementation
test('Visual feedback implementation', () => {
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
test('Error handling implementation', () => {
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
test('Command format is correct', () => {
  // Check for correct command format (should be /commandName not /lpl:commandName)
  if (!content.includes('const text = `/${commandName}`')) {
    throw new Error('Command format incorrect');
  }
});

// Test 5: Check button reset timeout
test('Button reset timeout implementation', () => {
  // Check for setTimeout with 2000ms delay
  if (!content.includes('setTimeout(() => {') || !content.includes('}, 2000)')) {
    throw new Error('Button reset timeout not implemented');
  }
});

// Test 6: Check event listener is async
test('Event listener is async', () => {
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
test('Copy button exists in UI', () => {
  // Check for button HTML
  if (!content.includes('<button class="action-button copy-command">Copy as /lpl:command</button>')) {
    throw new Error('Copy button HTML not found');
  }
});

// Test 8: Check button styling
test('Button styling defined', () => {
  // Check for action-button CSS
  if (!content.includes('.action-button {')) {
    throw new Error('Action button styles not defined');
  }
  
  // Check for hover styles
  if (!content.includes('.action-button:hover {')) {
    throw new Error('Button hover styles not defined');
  }
});

// Test 9: Check async function returns promise
test('copyCommand returns a promise', () => {
  if (!content.includes('async copyCommand(commandName) {')) {
    throw new Error('copyCommand is not an async function');
  }
  
  // Verify it awaits the clipboard API
  if (!content.includes('await navigator.clipboard.writeText(text)')) {
    throw new Error('Clipboard API not awaited');
  }
});

// Test 10: Check clipboard text format
test('Clipboard text format', () => {
  // Ensure the text variable is defined correctly
  const copyMethodMatch = content.match(/async copyCommand\(commandName\)\s*{\s*const text = `([^`]+)`/);
  if (!copyMethodMatch || copyMethodMatch[1] !== '/${commandName}') {
    throw new Error('Clipboard text format incorrect');
  }
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

process.exit(testsFailed > 0 ? 1 : 0);

function test(name, testFn) {
  try {
    testFn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}