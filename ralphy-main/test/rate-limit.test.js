import http from 'http';
import { spawn } from 'child_process';
import { describe, it, expect } from '@jest/globals';

// Helper to make HTTP requests
function makeRequest(path, port = 3456) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
  });
}

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Rate Limiting', () => {
  let server;

  beforeAll(async () => {
    // Start server on test port
    server = spawn('node', ['src/server/index.js', '--port', '3457', '--no-open'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    // Wait for server to start
    await wait(2000);
  });

  afterAll(() => {
    if (server) {
      server.kill();
    }
  });

  it('should rate limit /api/tree endpoint to 30 requests per minute', async () => {
    const results = [];
    
    // Make 35 requests rapidly
    for (let i = 0; i < 35; i++) {
      const result = await makeRequest('/api/tree', 3457);
      results.push(result.status);
    }
    
    const successCount = results.filter(status => status === 200).length;
    const rateLimitedCount = results.filter(status => status === 429).length;
    
    expect(successCount).toBe(30);
    expect(rateLimitedCount).toBe(5);
  });

  it('should have separate rate limits for different endpoints', async () => {
    // Wait a bit to avoid interference from previous test
    await wait(1000);
    
    // Make a request to different endpoints
    const fileResult = await makeRequest('/api/file?path=package.json', 3457);
    const treeResult = await makeRequest('/api/tree', 3457); 
    
    // Both should succeed since they have separate rate limit buckets
    expect(fileResult.status).toBe(200);
    expect(treeResult.status).toBe(200);
  });

  it('should return 429 with proper error message when rate limited', async () => {
    // Exhaust rate limit for /api/events (10 per minute)
    const results = [];
    for (let i = 0; i < 12; i++) {
      const result = await makeRequest('/api/events', 3457);
      results.push(result);
    }
    
    // Find a rate limited response
    const rateLimited = results.find(r => r.status === 429);
    expect(rateLimited).toBeDefined();
    
    const errorData = JSON.parse(rateLimited.data);
    expect(errorData.error).toBe('Too many requests');
    expect(errorData.message).toBe('Rate limit exceeded. Please try again later.');
  });
});