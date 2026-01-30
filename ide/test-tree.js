/**
 * Test script for ide/lib/tree-builder.js
 */

import { buildTree } from './lib/tree-builder.js';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

const PROJECT_ROOT = process.cwd();

// Test 1: Build tree for commands directory
await test('buildTree for commands directory returns array', async () => {
  const commandsDir = resolve(PROJECT_ROOT, 'commands');
  const tree = await buildTree(commandsDir, commandsDir);

  if (!Array.isArray(tree)) {
    throw new Error(`Expected array, got: ${typeof tree}`);
  }
});

// Test 2: First-level items have required properties
await test('Tree items have name, path, type properties', async () => {
  const commandsDir = resolve(PROJECT_ROOT, 'commands');
  const tree = await buildTree(commandsDir, commandsDir);

  if (tree.length === 0) {
    throw new Error('Tree is empty');
  }

  const item = tree[0];
  if (!item.name || !item.path || !item.type) {
    throw new Error(`Missing properties. Got: ${JSON.stringify(item)}`);
  }
});

// Test 3: Directories have children arrays
await test('Directories have children arrays', async () => {
  const commandsDir = resolve(PROJECT_ROOT, 'commands');
  const tree = await buildTree(commandsDir, commandsDir);

  const dir = tree.find(item => item.type === 'directory');
  if (!dir) {
    throw new Error('No directory found in tree');
  }

  if (!Array.isArray(dir.children)) {
    throw new Error(`Expected children array, got: ${typeof dir.children}`);
  }
});

// Test 4: Files have .md extension
await test('Files have .md extension', async () => {
  const commandsDir = resolve(PROJECT_ROOT, 'commands');
  const tree = await buildTree(commandsDir, commandsDir);

  // Recursively find all files
  function findFiles(nodes) {
    let files = [];
    for (const node of nodes) {
      if (node.type === 'file') {
        files.push(node);
      } else if (node.children) {
        files = files.concat(findFiles(node.children));
      }
    }
    return files;
  }

  const files = findFiles(tree);
  if (files.length === 0) {
    throw new Error('No files found in tree');
  }

  for (const file of files) {
    if (!file.name.endsWith('.md')) {
      throw new Error(`Expected .md file, got: ${file.name}`);
    }
  }
});

// Test 5: Directories sorted before files
await test('Directories sorted before files', async () => {
  const commandsDir = resolve(PROJECT_ROOT, 'commands');
  const tree = await buildTree(commandsDir, commandsDir);

  let seenFile = false;
  for (const item of tree) {
    if (item.type === 'file') {
      seenFile = true;
    } else if (item.type === 'directory' && seenFile) {
      throw new Error('Directory found after file - sorting incorrect');
    }
  }
});

// Summary
console.log(`\n--- Results ---`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
