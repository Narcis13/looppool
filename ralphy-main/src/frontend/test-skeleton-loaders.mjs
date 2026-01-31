// Test suite for loading skeleton implementations
// Run: node test-skeleton-loaders.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Loading Skeleton Implementations...\n');

let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
  try {
    testFn();
    console.log(`✓ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failedTests++;
  }
}

function assertFileContains(filePath, searchString, description) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(searchString)) {
    throw new Error(`${description}: "${searchString}" not found in ${filePath}`);
  }
}

// Test 1: CSS file exists and contains skeleton styles
test('Skeleton CSS file exists', () => {
  const cssPath = path.join(__dirname, 'skeleton-loader.css');
  if (!fs.existsSync(cssPath)) {
    throw new Error('skeleton-loader.css not found');
  }
});

test('Skeleton CSS contains base styles', () => {
  const cssPath = path.join(__dirname, 'skeleton-loader.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  
  // Check for essential skeleton CSS
  if (!content.includes('.skeleton {')) {
    throw new Error('Base .skeleton class not found');
  }
  if (!content.includes('@keyframes skeleton-shimmer')) {
    throw new Error('Shimmer animation keyframes not found');
  }
  if (!content.includes('skeleton-fade-in')) {
    throw new Error('Fade-in animation class not found');
  }
});

// Test 2: CSS link added to index.html
test('Index.html includes skeleton CSS', () => {
  assertFileContains(
    path.join(__dirname, 'index.html'),
    '<link rel="stylesheet" href="skeleton-loader.css">',
    'Skeleton CSS link'
  );
});

// Test 3: FileTree component skeleton implementation
test('FileTree has showLoading with skeleton', () => {
  const fileTreePath = path.join(__dirname, 'file-tree.js');
  assertFileContains(fileTreePath, 'showLoading()', 'showLoading method');
  assertFileContains(fileTreePath, 'file-tree-skeleton', 'FileTree skeleton class');
  assertFileContains(fileTreePath, 'generateTreeSkeletonItems', 'Skeleton item generator');
});

// Test 4: StatePanel component skeleton implementation
test('StatePanel has skeleton renderer', () => {
  const statePanelPath = path.join(__dirname, 'state-panel.js');
  assertFileContains(statePanelPath, 'renderStateSkeleton()', 'renderStateSkeleton method');
  assertFileContains(statePanelPath, 'state-panel-skeleton', 'StatePanel skeleton class');
});

// Test 5: CommandViewer component skeleton implementation
test('CommandViewer shows skeleton on load', () => {
  const commandViewerPath = path.join(__dirname, 'command-viewer.js');
  assertFileContains(commandViewerPath, 'showCommandSkeleton()', 'showCommandSkeleton method');
  assertFileContains(commandViewerPath, 'command-viewer-skeleton', 'CommandViewer skeleton class');
});

test('CommandViewer calls skeleton on loadCommand', () => {
  const commandViewerPath = path.join(__dirname, 'command-viewer.js');
  assertFileContains(commandViewerPath, 'this.showCommandSkeleton();', 'Skeleton called in loadCommand');
});

// Test 6: Editor component skeleton implementation
test('Editor has loading skeleton methods', () => {
  const editorPath = path.join(__dirname, 'editor.js');
  assertFileContains(editorPath, 'showLoadingSkeleton(path)', 'showLoadingSkeleton method');
  assertFileContains(editorPath, 'hideLoadingSkeleton()', 'hideLoadingSkeleton method');
  assertFileContains(editorPath, 'generateEditorSkeletonLines', 'Skeleton line generator');
});

test('App.js shows editor skeleton on file open', () => {
  const appPath = path.join(__dirname, 'app.js');
  assertFileContains(appPath, 'window.editor.showLoadingSkeleton(path)', 'Editor skeleton called');
});

// Test 7: QuickOpen component skeleton implementation
test('QuickOpen has skeleton loader', () => {
  const quickOpenPath = path.join(__dirname, 'quick-open.js');
  assertFileContains(quickOpenPath, 'showLoadingSkeleton()', 'showLoadingSkeleton method');
  assertFileContains(quickOpenPath, 'quick-open-skeleton', 'QuickOpen skeleton class');
});

// Test 8: Skeleton CSS classes coverage
test('All component skeleton CSS classes defined', () => {
  const cssPath = path.join(__dirname, 'skeleton-loader.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  
  const requiredClasses = [
    '.file-tree-skeleton',
    '.state-panel-skeleton',
    '.command-viewer-skeleton',
    '.editor-skeleton',
    '.quick-open-skeleton',
    '.skeleton-text',
    '.skeleton-button',
    '.skeleton-title'
  ];
  
  for (const className of requiredClasses) {
    if (!content.includes(className)) {
      throw new Error(`Required CSS class ${className} not found`);
    }
  }
});

// Test 9: Width modifiers for skeleton text
test('Skeleton CSS has width modifiers', () => {
  const cssPath = path.join(__dirname, 'skeleton-loader.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  
  const widthModifiers = ['.short', '.medium', '.long', '.full'];
  for (const modifier of widthModifiers) {
    if (!content.includes(`.skeleton-text${modifier}`)) {
      throw new Error(`Width modifier ${modifier} not found`);
    }
  }
});

// Test 10: Error handling with skeleton removal
test('Editor removes skeleton on error', () => {
  const editorPath = path.join(__dirname, 'editor.js');
  assertFileContains(editorPath, 'showError(message)', 'showError method exists');
  
  // Read the showError method to verify it removes skeleton
  const content = fs.readFileSync(editorPath, 'utf8');
  const showErrorStart = content.indexOf('showError(message)');
  const showErrorEnd = content.indexOf('}', showErrorStart + 200);
  const showErrorContent = content.substring(showErrorStart, showErrorEnd);
  
  if (!showErrorContent.includes('this.hideLoadingSkeleton()')) {
    throw new Error('showError does not call hideLoadingSkeleton');
  }
});

// Summary
console.log('\n========================================');
console.log('Test Results:');
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);
console.log('========================================');

if (failedTests > 0) {
  console.log('\nSome tests failed. Please check the implementation.');
  process.exit(1);
} else {
  console.log('\nAll tests passed! Loading skeletons are properly implemented.');
}