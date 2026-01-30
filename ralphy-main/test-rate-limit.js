import http from 'http';
import { spawn } from 'child_process';

// Helper to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3456${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
  });
}

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test rate limiting
async function testRateLimit() {
  console.log('Starting rate limit tests...\n');
  
  // Start the server
  const server = spawn('node', ['src/server/index.js', '--no-open'], {
    stdio: 'pipe',
    cwd: process.cwd()
  });
  
  // Wait for server to start
  await wait(2000);
  
  try {
    // Test 1: API tree endpoint (limit: 30 per minute)
    console.log('Test 1: Testing /api/tree rate limit (30 req/min)...');
    const treeResults = [];
    
    // Make 35 requests rapidly
    for (let i = 0; i < 35; i++) {
      const result = await makeRequest('/api/tree');
      treeResults.push(result.status);
      if (i % 10 === 0) {
        console.log(`  Made ${i + 1} requests...`);
      }
    }
    
    const successCount = treeResults.filter(status => status === 200).length;
    const rateLimitedCount = treeResults.filter(status => status === 429).length;
    
    console.log(`  Results: ${successCount} successful, ${rateLimitedCount} rate limited`);
    if (successCount === 30 && rateLimitedCount === 5) {
      console.log('  ✓ Rate limiting working correctly!\n');
    } else {
      console.log('  ✗ Rate limiting not working as expected\n');
    }
    
    // Test 2: Multiple endpoints
    console.log('Test 2: Testing different endpoints have separate limits...');
    
    // Reset by waiting a bit
    await wait(1000);
    
    // Make requests to different endpoints
    const stateResult = await makeRequest('/api/state');
    const fileResult = await makeRequest('/api/file?path=package.json');
    
    console.log(`  /api/state: ${stateResult.status === 200 ? 'Success' : 'Failed'}`);
    console.log(`  /api/file: ${fileResult.status === 200 ? 'Success' : 'Failed'}`);
    
    if (stateResult.status === 200 && fileResult.status === 200) {
      console.log('  ✓ Different endpoints have separate rate limits!\n');
    } else {
      console.log('  ✗ Endpoints may be sharing rate limits\n');
    }
    
    // Test 3: Rate limit window reset
    console.log('Test 3: Testing rate limit window (should reset after 1 minute)...');
    console.log('  This test would take 1+ minutes, skipping for brevity.\n');
    
    console.log('All rate limiting tests completed!');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Kill the server
    server.kill();
  }
}

// Run tests
testRateLimit().catch(console.error);