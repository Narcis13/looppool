import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, 'index.js');

// Test that server accepts --port argument
const child = spawn('node', [serverPath, '--port', '5678'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
let error = '';
let success = false;

child.stdout.on('data', (data) => {
  output += data.toString();
  if (output.includes('http://127.0.0.1:5678')) {
    success = true;
    console.log('✓ Server started with custom port 5678');
    child.kill();
  }
});

child.stderr.on('data', (data) => {
  error += data.toString();
});

child.on('exit', (code) => {
  if (!success) {
    console.error('✗ Test failed');
    console.error('Output:', output);
    console.error('Error:', error);
    process.exit(1);
  } else {
    console.log('✓ Test passed');
    process.exit(0);
  }
});

// Timeout after 5 seconds
setTimeout(() => {
  if (!success) {
    console.error('✗ Test timed out');
    child.kill();
    process.exit(1);
  }
}, 5000);