/**
 * Test script for watcher.js
 * Creates a temp directory, writes files, and verifies events are emitted
 */

import { createWatcher } from './lib/watcher.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TIMEOUT = 2000;

async function waitForEvent(emitter, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event (${timeout}ms)`));
    }, timeout);

    emitter.once('change', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function runTests() {
  let tempDir;
  let watcher;
  let passed = 0;
  let failed = 0;

  try {
    // Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'watcher-test-'));
    console.log(`Test directory: ${tempDir}`);

    // Create watcher for temp directory
    watcher = createWatcher([tempDir]);

    // Wait for watcher to be ready (chokidar needs a moment)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Test 1: Add event
    console.log('\nTest 1: Add event');
    const testFile = join(tempDir, 'test.txt');
    const addPromise = waitForEvent(watcher.emitter, TIMEOUT);
    await writeFile(testFile, 'initial content');

    try {
      const addEvent = await addPromise;
      if (addEvent.event === 'add' && addEvent.path === testFile) {
        console.log('  PASS: Received add event');
        passed++;
      } else {
        console.log(`  FAIL: Unexpected event ${JSON.stringify(addEvent)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  FAIL: ${err.message}`);
      failed++;
    }

    // Wait for awaitWriteFinish stabilization
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Test 2: Change event
    console.log('\nTest 2: Change event');
    const changePromise = waitForEvent(watcher.emitter, TIMEOUT);
    await writeFile(testFile, 'modified content');

    try {
      const changeEvent = await changePromise;
      if (changeEvent.event === 'change' && changeEvent.path === testFile) {
        console.log('  PASS: Received change event');
        passed++;
      } else {
        console.log(`  FAIL: Unexpected event ${JSON.stringify(changeEvent)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  FAIL: ${err.message}`);
      failed++;
    }

    console.log(`\n${passed} passed, ${failed} failed`);

    // Clean up
    await watcher.close();
    await rm(tempDir, { recursive: true });

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test error:', err);
    if (watcher) await watcher.close();
    if (tempDir) await rm(tempDir, { recursive: true }).catch(() => {});
    process.exit(1);
  }
}

runTests();
