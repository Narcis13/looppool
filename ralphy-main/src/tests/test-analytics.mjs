#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results
let passed = 0;
let failed = 0;

function test(description, assertion) {
  try {
    if (assertion) {
      console.log(`✓ ${description}`);
      passed++;
    } else {
      console.log(`✗ ${description}`);
      failed++;
    }
  } catch (error) {
    console.log(`✗ ${description} - Error: ${error.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('Testing Analytics Implementation...\n');

  // Test 1: Analytics.js file exists
  const analyticsPath = path.join(__dirname, '../frontend/analytics.js');
  const analyticsExists = await fs.access(analyticsPath).then(() => true).catch(() => false);
  test('analytics.js file exists', analyticsExists);

  // Test 2: Check Analytics class implementation
  const analyticsContent = await fs.readFile(analyticsPath, 'utf8');
  test('Analytics class is defined', analyticsContent.includes('class Analytics'));
  test('initSession method exists', analyticsContent.includes('initSession()'));
  test('trackFeature method exists', analyticsContent.includes('trackFeature('));
  test('trackError method exists', analyticsContent.includes('trackError('));
  test('trackPerformance method exists', analyticsContent.includes('trackPerformance('));
  test('getSummary method exists', analyticsContent.includes('getSummary()'));
  test('localStorage storage key defined', analyticsContent.includes("'lpl-ide-analytics'"));

  // Test 3: Check feature tracking events
  test('File opens tracking', analyticsContent.includes("'fileOpens'"));
  test('File saves tracking', analyticsContent.includes("'fileSaves'"));
  test('Find usage tracking', analyticsContent.includes("'findUsed'"));
  test('Replace usage tracking', analyticsContent.includes("'replaceUsed'"));
  test('Vim mode tracking', analyticsContent.includes("'vimModeUsed'"));
  test('Quick open tracking', analyticsContent.includes("'quickOpenUsed'"));
  test('Graph view tracking', analyticsContent.includes("'graphViewed'"));
  test('Command view tracking', analyticsContent.includes("'commandsViewed'"));
  test('State view tracking', analyticsContent.includes("'stateViewed'"));

  // Test 4: Check performance metrics
  test('File load time tracking', analyticsContent.includes('fileLoadTimes'));
  test('File save time tracking', analyticsContent.includes('fileSaveTimes'));
  test('Graph render time tracking', analyticsContent.includes('graphRenderTimes'));

  // Test 5: Check error tracking
  test('Error tracking implementation', analyticsContent.includes('trackError(error'));
  test('Window error event listener', analyticsContent.includes("window.addEventListener('error'"));
  test('Unhandled rejection listener', analyticsContent.includes("window.addEventListener('unhandledrejection'"));

  // Test 6: Check session management
  test('Session ID generation', analyticsContent.includes('generateSessionId()'));
  test('Session storage key', analyticsContent.includes("'lpl-ide-session'"));
  test('Session duration tracking', analyticsContent.includes('sessionDuration'));

  // Test 7: Analytics initialization in index.html
  const indexPath = path.join(__dirname, '../frontend/index.html');
  const indexContent = await fs.readFile(indexPath, 'utf8');
  test('Analytics script included in HTML', indexContent.includes('<script src="analytics.js"></script>'));
  test('Analytics initialized', indexContent.includes('const analytics = new Analytics()'));
  test('Analytics button in UI', indexContent.includes('analytics-btn'));
  test('showAnalytics function exists', indexContent.includes('function showAnalytics()'));

  // Test 8: Event tracking integration in components
  const editorPath = path.join(__dirname, '../frontend/editor.js');
  const editorContent = await fs.readFile(editorPath, 'utf8');
  test('Find opened event dispatch in editor', editorContent.includes("new CustomEvent('find-opened')"));
  test('Replace used event dispatch in editor', editorContent.includes("new CustomEvent('replace-used')"));
  test('Vim mode toggled event dispatch in editor', editorContent.includes("new CustomEvent('vim-mode-toggled')"));
  test('File saved event dispatch in editor', editorContent.includes("new CustomEvent('file-saved')"));

  // Test 9: Performance tracking in app.js
  const appPath = path.join(__dirname, '../frontend/app.js');
  const appContent = await fs.readFile(appPath, 'utf8');
  test('File load performance tracking', appContent.includes("trackPerformance('fileLoad'"));
  test('File save performance tracking', appContent.includes("trackPerformance('fileSave'"));
  test('File open event tracking', appContent.includes("trackFeature('fileOpens')"));

  // Test 10: Event tracking in other components
  const quickOpenPath = path.join(__dirname, '../frontend/quick-open.js');
  const quickOpenContent = await fs.readFile(quickOpenPath, 'utf8');
  test('Quick open used event dispatch', quickOpenContent.includes("new CustomEvent('quick-open-used')"));

  const graphPath = path.join(__dirname, '../frontend/graph-viewer.js');
  const graphContent = await fs.readFile(graphPath, 'utf8');
  test('Graph viewed event dispatch', graphContent.includes("new CustomEvent('graph-viewed')"));
  test('Graph render performance tracking', graphContent.includes("trackPerformance('graphRender'"));

  const commandPath = path.join(__dirname, '../frontend/command-viewer.js');
  const commandContent = await fs.readFile(commandPath, 'utf8');
  test('Command viewed event dispatch', commandContent.includes("new CustomEvent('command-viewed')"));

  const statePath = path.join(__dirname, '../frontend/state-panel.js');
  const stateContent = await fs.readFile(statePath, 'utf8');
  test('State viewed event dispatch', stateContent.includes("new CustomEvent('state-viewed')"));

  // Test 11: Analytics summary display
  test('Analytics summary includes usage stats', indexContent.includes('Days since first use'));
  test('Analytics summary includes file operations', indexContent.includes('Files opened'));
  test('Analytics summary includes features used', indexContent.includes('Features Used'));
  test('Analytics summary includes performance metrics', indexContent.includes('Avg file load time'));
  test('Analytics summary includes error tracking', indexContent.includes('Total errors'));

  // Test summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(console.error);