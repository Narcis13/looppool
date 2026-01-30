import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, 'index.js');

async function waitForPort(port, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            reject(new Error(`Status code: ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return response;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Port ${port} not reachable after ${maxAttempts} attempts`);
}

async function startServer(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [serverPath, ...args], {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);

    // Give server time to start
    setTimeout(() => {
      resolve({ child, stdout, stderr });
    }, 1000);
  });
}

// Test 1: Server starts on default port (3456)
async function testDefaultPort() {
  console.log('Test 1: Default port...');
  const { child } = await startServer();
  
  try {
    await waitForPort(3456);
    console.log('✓ Server started on default port 3456');
  } catch (e) {
    console.error('✗ Failed to start on default port:', e.message);
    process.exit(1);
  } finally {
    child.kill();
  }
}

// Test 2: Server starts on custom port
async function testCustomPort() {
  console.log('\nTest 2: Custom port...');
  const { child } = await startServer(['--port', '4567']);
  
  try {
    await waitForPort(4567);
    console.log('✓ Server started on custom port 4567');
  } catch (e) {
    console.error('✗ Failed to start on custom port:', e.message);
    process.exit(1);
  } finally {
    child.kill();
  }
}

// Test 3: Invalid port number (should exit with error)
async function testInvalidPort() {
  console.log('\nTest 3: Invalid port...');
  const { child, stderr } = await startServer(['--port', 'invalid']);
  
  // Wait for process to exit
  const exitCode = await new Promise(resolve => {
    child.on('exit', resolve);
  });
  
  if (exitCode === 1 && stderr.includes('Invalid port number')) {
    console.log('✓ Server correctly rejected invalid port');
  } else {
    console.error('✗ Server did not properly handle invalid port');
    process.exit(1);
  }
}

// Test 4: Port out of range
async function testPortOutOfRange() {
  console.log('\nTest 4: Port out of range...');
  const { child, stderr } = await startServer(['--port', '70000']);
  
  // Wait for process to exit
  const exitCode = await new Promise(resolve => {
    child.on('exit', resolve);
  });
  
  if (exitCode === 1 && stderr.includes('Invalid port number')) {
    console.log('✓ Server correctly rejected port out of range');
  } else {
    console.error('✗ Server did not properly handle port out of range');
    process.exit(1);
  }
}

// Test 5: Multiple port arguments (last one wins)
async function testMultiplePortArgs() {
  console.log('\nTest 5: Multiple port arguments...');
  const { child } = await startServer(['--port', '5678', '--port', '6789']);
  
  try {
    await waitForPort(6789);
    console.log('✓ Server correctly used last port argument');
  } catch (e) {
    console.error('✗ Failed with multiple port arguments:', e.message);
    process.exit(1);
  } finally {
    child.kill();
  }
}

// Run all tests
async function runTests() {
  try {
    await testDefaultPort();
    await testCustomPort();
    await testInvalidPort();
    await testPortOutOfRange();
    await testMultiplePortArgs();
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } catch (e) {
    console.error('\n✗ Test suite failed:', e);
    process.exit(1);
  }
}

runTests();