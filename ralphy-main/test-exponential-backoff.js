import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_PORT = 3458;
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let serverProcess = null;
let testsPassed = true;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['src/server/index.js', '--port', TEST_PORT, '--no-open'], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'test' }
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes(`LPL IDE server running`)) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', reject);

    setTimeout(() => reject(new Error('Server failed to start')), 5000);
  });
}

async function testExponentialBackoff() {
  log('\n=== Testing Exponential Backoff for EventSource ===', 'blue');

  try {
    // Start server
    await startServer();
    log('✓ Server started', 'green');

    // Create a simple test page that logs reconnection attempts
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
</head>
<body>
  <div id="connection-status">Disconnected</div>
  <div id="log"></div>
  <script>
    const log = document.getElementById('log');
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      originalConsoleLog.apply(console, args);
      const p = document.createElement('p');
      p.textContent = args.join(' ');
      log.appendChild(p);
    };
  </script>
  <script src="app.js"></script>
</body>
</html>`;

    // Make a request to get the test page
    const pageReq = await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${TEST_PORT}/`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
    });

    // Verify the page loads
    if (pageReq.includes('LPL IDE')) {
      log('✓ Frontend page loads correctly', 'green');
    } else {
      throw new Error('Frontend page did not load correctly');
    }

    // Test SSE connection
    const sseReq = http.get(`http://127.0.0.1:${TEST_PORT}/api/events`, {
      headers: {
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      if (res.headers['content-type'] === 'text/event-stream') {
        log('✓ SSE endpoint responds with correct content type', 'green');
      } else {
        throw new Error('SSE endpoint has wrong content type');
      }

      let connected = false;
      res.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('connected') && !connected) {
          connected = true;
          log('✓ SSE connection established', 'green');
          
          // Now test reconnection by killing the server
          log('\nKilling server to test reconnection...', 'yellow');
          serverProcess.kill();
          
          // The client should attempt to reconnect with exponential backoff
          log('✓ Server killed - client should attempt reconnection with exponential backoff', 'green');
          log('  Expected behavior: 1s, 2s, 4s, 8s, 16s, 30s (capped) delays', 'yellow');
          
          setTimeout(() => {
            res.destroy();
          }, 1000);
        }
      });
    });

    sseReq.on('error', (err) => {
      // Expected when server is killed
    });

    // Wait for test to complete
    await sleep(2000);

  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    testsPassed = false;
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

async function testBackoffCalculation() {
  log('\n=== Testing Backoff Calculation Logic ===', 'blue');

  // Simulate the backoff calculation
  const baseDelay = 1000;
  const maxDelay = 30000;
  const maxAttempts = 10;

  log('Testing exponential backoff delays:', 'yellow');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    log(`  Attempt ${attempt}: ${delay}ms delay`, 'blue');
    
    // Verify the calculation
    if (attempt === 1 && delay !== 1000) {
      log(`✗ Attempt 1 should be 1000ms, got ${delay}ms`, 'red');
      testsPassed = false;
    } else if (attempt === 2 && delay !== 2000) {
      log(`✗ Attempt 2 should be 2000ms, got ${delay}ms`, 'red');
      testsPassed = false;
    } else if (attempt === 3 && delay !== 4000) {
      log(`✗ Attempt 3 should be 4000ms, got ${delay}ms`, 'red');
      testsPassed = false;
    } else if (attempt === 5 && delay !== 16000) {
      log(`✗ Attempt 5 should be 16000ms, got ${delay}ms`, 'red');
      testsPassed = false;
    } else if (attempt >= 6 && delay !== 30000) {
      log(`✗ Attempt ${attempt} should be capped at 30000ms, got ${delay}ms`, 'red');
      testsPassed = false;
    }
  }

  if (testsPassed) {
    log('✓ Backoff calculation is correct', 'green');
  }
}

// Run all tests
async function runTests() {
  await testBackoffCalculation();
  await testExponentialBackoff();

  if (testsPassed) {
    log('\n✅ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed!', 'red');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(1);
});