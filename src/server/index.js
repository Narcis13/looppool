import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exec } from 'node:child_process';
import { handleTree } from './routes/tree.js';
import { handleFileGet, handleFilePut } from './routes/file.js';
import { handleEvents } from './routes/events.js';

// Server configuration
const PORT = 3456;
const HOST = '127.0.0.1'; // Bind to localhost only for security

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

// DNS rebinding protection - validate Host header
function validateHost(req) {
  const host = req.headers.host;
  if (!host) return false;
  
  // Extract hostname without port
  const hostname = host.split(':')[0];
  
  // Only allow localhost variations
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '[::1]';
}

// Simple router
const routes = new Map();

// Register a route
function route(method, pattern, handler) {
  const key = `${method} ${pattern}`;
  routes.set(key, handler);
}

// Find matching route
function findRoute(method, pathname) {
  // Try exact match first
  const exactKey = `${method} ${pathname}`;
  if (routes.has(exactKey)) {
    return routes.get(exactKey);
  }
  
  // Try pattern matching (for parameterized routes)
  for (const [key, handler] of routes) {
    const [routeMethod, routePattern] = key.split(' ');
    if (routeMethod === method) {
      // Simple pattern matching for now
      if (routePattern === pathname) {
        return handler;
      }
    }
  }
  
  return null;
}

// Main request handler
async function handleRequest(req, res) {
  try {
    // DNS rebinding protection
    if (!validateHost(req)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden: Invalid Host header');
      return;
    }
    
    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Find and execute route handler
    const handler = findRoute(req.method, pathname);
    if (handler) {
      await handler(req, res, url);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } catch (error) {
    console.error('Request error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

// Register routes
route('GET', '/health', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
});

route('GET', '/api/tree', handleTree);
route('GET', '/api/file', handleFileGet);
route('PUT', '/api/file', handleFilePut);
route('GET', '/api/events', handleEvents);

// Serve static files for frontend (when we build it)
route('GET', '/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('IDE Server is running. Frontend not yet implemented.');
});

// Create and start server
const server = createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`IDE Server running at http://${HOST}:${PORT}/`);
  console.log('Project root:', PROJECT_ROOT);
  
  // Auto-launch browser
  const url = `http://${HOST}:${PORT}`;
  const platform = process.platform;
  
  let command;
  if (platform === 'darwin') {
    command = `open ${url}`;
  } else if (platform === 'win32') {
    command = `start ${url}`;
  } else {
    // Linux
    command = `xdg-open ${url}`;
  }
  
  exec(command, (err) => {
    if (err) {
      console.log('Could not auto-launch browser:', err.message);
      console.log('Please open your browser and navigate to:', url);
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { route, PROJECT_ROOT };