import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Test utilities
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer(projectRoot = __dirname) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['src/server/index.js', '--port', '3457', '--no-open', '--root', projectRoot], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let output = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running at')) {
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`);
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Server failed to start within 5 seconds'));
    }, 5000);
  });
}

async function runBrowserTest() {
  // Since we can't run a real browser in Node.js, we'll test the queue logic directly
  // by loading and evaluating the frontend code
  const appJs = await fs.readFile(path.join(__dirname, 'src/frontend/app.js'), 'utf8');
  
  // Create a mock DOM environment
  const mockDOM = {
    document: {
      addEventListener: (event, callback) => {
        if (event === 'DOMContentLoaded') {
          // Don't call immediately, we'll set up our mocks first
          mockDOM._domReadyCallback = callback;
        }
      },
      getElementById: () => null
    },
    window: {},
    console: console,
    EventSource: class MockEventSource {
      constructor(url) {
        this.url = url;
        this.readyState = 1; // OPEN
        this.onopen = null;
        this.onerror = null;
        this.onmessage = null;
        this.CLOSED = 2;
        
        // Simulate connection after a delay
        setTimeout(() => {
          if (this.onopen) this.onopen();
        }, 100);
      }
      close() {
        this.readyState = 2;
      }
    },
    fetch: async (url, options) => {
      mockDOM._fetchCalls.push({ url, options });
      
      // Simulate network failure for the first few attempts to test queueing
      if (mockDOM._fetchShouldFail) {
        throw new Error('Network error');
      }
      
      // Return mock responses based on the URL
      if (url.includes('/api/file')) {
        if (options && options.method === 'PUT') {
          return {
            ok: true,
            json: async () => ({ success: true, path: url.split('=')[1] })
          };
        } else {
          return {
            ok: true,
            text: async () => 'mock file content'
          };
        }
      } else if (url.includes('/api/tree')) {
        return {
          ok: true,
          json: async () => ({ files: ['test.md'] })
        };
      } else if (url.includes('/api/state')) {
        return {
          ok: true,
          text: async () => 'mock state content'
        };
      }
      
      return { ok: false, status: 404 };
    },
    _fetchCalls: [],
    _fetchShouldFail: true
  };

  // Run the app code in our mock environment
  const func = new Function(
    'document', 'window', 'console', 'EventSource', 'fetch',
    appJs + '\nreturn { OperationQueue, EventSourceClient, API };'
  );
  
  const exports = func(
    mockDOM.document,
    mockDOM.window,
    mockDOM.console,
    mockDOM.EventSource,
    mockDOM.fetch
  );

  return { mockDOM, exports };
}

// Test cases
async function testOperationQueueBasics() {
  console.log(`\n${YELLOW}Test 1: Operation Queue Basics${RESET}`);
  
  const { exports } = await runBrowserTest();
  const { OperationQueue } = exports;
  
  const queue = new OperationQueue();
  
  // Test enqueueing operations
  const id1 = queue.enqueue({ type: 'saveFile', path: 'test1.md', content: 'hello' });
  const id2 = queue.enqueue({ type: 'loadFile', path: 'test2.md' });
  
  console.log(`✓ Enqueued operations successfully`);
  console.log(`✓ Queue length: ${queue.getQueueLength()}`);
  
  if (queue.getQueueLength() !== 2) {
    throw new Error(`Expected queue length 2, got ${queue.getQueueLength()}`);
  }
  
  // Test queue retrieval
  const queuedOps = queue.getQueue();
  if (queuedOps.length !== 2) {
    throw new Error(`Expected 2 queued operations, got ${queuedOps.length}`);
  }
  
  console.log(`${GREEN}✓ Test 1 passed: Queue operations work correctly${RESET}`);
}

async function testQueueWithDisconnection() {
  console.log(`\n${YELLOW}Test 2: Queue Operations During Disconnection${RESET}`);
  
  const { mockDOM, exports } = await runBrowserTest();
  const { EventSourceClient, API } = exports;
  
  // Create SSE client and API
  const sseClient = new EventSourceClient('/api/events');
  const api = new API(sseClient);
  
  // Initially disconnected
  sseClient.isConnected = false;
  
  // Try to save a file while disconnected
  let errorCaught = false;
  try {
    await api.saveFile('test.md', 'content while disconnected');
  } catch (error) {
    errorCaught = true;
    console.log(`✓ Operation queued while disconnected: ${error.message}`);
  }
  
  if (!errorCaught) {
    throw new Error('Expected error when queueing operation while disconnected');
  }
  
  // Check that operation was queued
  const queuedOps = api.getQueuedOperations();
  if (queuedOps.length !== 1) {
    throw new Error(`Expected 1 queued operation, got ${queuedOps.length}`);
  }
  
  console.log(`✓ Operation successfully queued: ${queuedOps[0].type}`);
  
  console.log(`${GREEN}✓ Test 2 passed: Operations queue correctly when disconnected${RESET}`);
}

async function testQueueProcessingOnReconnect() {
  console.log(`\n${YELLOW}Test 3: Queue Processing on Reconnection${RESET}`);
  
  const { mockDOM, exports } = await runBrowserTest();
  const { EventSourceClient, API } = exports;
  
  // Create SSE client and API
  const sseClient = new EventSourceClient('/api/events');
  const api = new API(sseClient);
  
  // Initially disconnected
  sseClient.isConnected = false;
  
  // Queue multiple operations
  try {
    await api.saveFile('file1.md', 'content 1');
  } catch (e) {}
  
  try {
    await api.loadFile('file2.md');
  } catch (e) {}
  
  try {
    await api.loadTree();
  } catch (e) {}
  
  const queueLength = sseClient.getOperationQueue().getQueueLength();
  console.log(`✓ Queued ${queueLength} operations while disconnected`);
  
  if (queueLength !== 3) {
    throw new Error(`Expected 3 queued operations, got ${queueLength}`);
  }
  
  // Simulate reconnection
  mockDOM._fetchShouldFail = false;  // Allow fetch to succeed now
  sseClient.isConnected = true;
  
  // Process the queue
  await sseClient.getOperationQueue().processQueue();
  
  // Wait a bit for async processing
  await sleep(100);
  
  // Check that queue is empty after processing
  const remainingOps = sseClient.getOperationQueue().getQueueLength();
  console.log(`✓ Remaining operations after processing: ${remainingOps}`);
  
  if (remainingOps !== 0) {
    throw new Error(`Expected 0 remaining operations, got ${remainingOps}`);
  }
  
  // Check that all fetch calls were made
  const fetchCalls = mockDOM._fetchCalls;
  console.log(`✓ Made ${fetchCalls.length} fetch calls`);
  
  if (fetchCalls.length !== 3) {
    throw new Error(`Expected 3 fetch calls, got ${fetchCalls.length}`);
  }
  
  console.log(`${GREEN}✓ Test 3 passed: Queue processes correctly on reconnection${RESET}`);
}

async function testMaxQueueSize() {
  console.log(`\n${YELLOW}Test 4: Max Queue Size Limit${RESET}`);
  
  const { exports } = await runBrowserTest();
  const { OperationQueue } = exports;
  
  const queue = new OperationQueue();
  
  // Fill queue beyond max size (100)
  for (let i = 0; i < 105; i++) {
    queue.enqueue({ type: 'saveFile', path: `file${i}.md`, content: `content ${i}` });
  }
  
  const queueLength = queue.getQueueLength();
  console.log(`✓ Queue length after adding 105 items: ${queueLength}`);
  
  if (queueLength !== 100) {
    throw new Error(`Expected queue length 100 (max size), got ${queueLength}`);
  }
  
  // Check that oldest items were dropped
  const queuedOps = queue.getQueue();
  const firstOp = queuedOps[0];
  
  if (!firstOp.path.includes('file5')) {
    throw new Error(`Expected oldest operations to be dropped, but found ${firstOp.path}`);
  }
  
  console.log(`${GREEN}✓ Test 4 passed: Queue respects max size limit${RESET}`);
}

async function testRetryLogic() {
  console.log(`\n${YELLOW}Test 5: Retry Logic for Failed Operations${RESET}`);
  
  const { mockDOM, exports } = await runBrowserTest();
  const { OperationQueue } = exports;
  
  const queue = new OperationQueue();
  let attemptCount = 0;
  let successCallbackCalled = false;
  let errorCallbackCalled = false;
  
  // Override executeOperation to count attempts and fail first 2 times
  const originalExecute = queue.executeOperation.bind(queue);
  queue.executeOperation = async function(operation) {
    attemptCount++;
    if (attemptCount <= 2) {
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    // On 3rd attempt, use original execute (which should succeed)
    mockDOM._fetchShouldFail = false;
    return originalExecute(operation);
  };
  
  // Enqueue an operation
  queue.enqueue({ 
    type: 'saveFile', 
    path: 'retry-test.md', 
    content: 'test',
    maxRetries: 3,
    retryCount: 0,
    onSuccess: () => { successCallbackCalled = true; },
    onError: () => { errorCallbackCalled = true; }
  });
  
  // Process queue multiple times to simulate retries
  for (let i = 0; i < 3; i++) {
    await queue.processQueue();
    await sleep(50); // Small delay between retry attempts
  }
  
  console.log(`✓ Operation attempted ${attemptCount} times`);
  console.log(`✓ Success callback called: ${successCallbackCalled}`);
  console.log(`✓ Error callback called: ${errorCallbackCalled}`);
  
  if (attemptCount !== 3) {
    throw new Error(`Expected 3 attempts (2 failures + 1 success), got ${attemptCount}`);
  }
  
  // Queue should be empty after successful retry
  if (queue.getQueueLength() !== 0) {
    throw new Error(`Expected empty queue after successful retry, got ${queue.getQueueLength()}`);
  }
  
  if (!successCallbackCalled) {
    throw new Error('Success callback was not called after successful retry');
  }
  
  if (errorCallbackCalled) {
    throw new Error('Error callback should not have been called since operation eventually succeeded');
  }
  
  console.log(`${GREEN}✓ Test 5 passed: Retry logic works correctly${RESET}`);
}

async function testIntegrationWithServer() {
  console.log(`\n${YELLOW}Test 6: Integration with Real Server${RESET}`);
  
  let server;
  try {
    // Start the server
    server = await startServer();
    console.log('✓ Server started successfully');
    
    // Wait for server to be ready
    await sleep(500);
    
    // Make a test request to verify server is working
    const response = await fetch('http://127.0.0.1:3457/api/state');
    
    if (response.ok) {
      console.log('✓ Server responding to requests');
    }
    
    console.log(`${GREEN}✓ Test 6 passed: Server integration verified${RESET}`);
  } catch (error) {
    console.error(`${RED}✗ Test 6 failed: ${error.message}${RESET}`);
    throw error;
  } finally {
    if (server) {
      server.kill();
    }
  }
}

// Run all tests
async function runTests() {
  console.log(`${YELLOW}=== Operation Queue Test Suite ===${RESET}`);
  
  const tests = [
    testOperationQueueBasics,
    testQueueWithDisconnection,
    testQueueProcessingOnReconnect,
    testMaxQueueSize,
    testRetryLogic
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      failed++;
      console.error(`${RED}✗ ${test.name} failed: ${error.message}${RESET}`);
      console.error(error.stack);
    }
  }
  
  console.log(`\n${YELLOW}=== Test Summary ===${RESET}`);
  console.log(`${GREEN}Passed: ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`${RED}Failed: ${failed}${RESET}`);
  }
  console.log(`Total: ${tests.length}`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log(`\n${GREEN}All tests passed! ✨${RESET}`);
  }
}

// Run tests
runTests().catch(console.error);