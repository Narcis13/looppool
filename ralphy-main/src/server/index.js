import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
let port = 3456;
let projectRoot = process.cwd();
let skipBrowserOpen = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    const parsedPort = parseInt(args[i + 1]);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      console.error(`Error: Invalid port number '${args[i + 1]}'. Port must be between 1 and 65535.`);
      process.exit(1);
    }
    port = parsedPort;
    i++;
  } else if (args[i] === '--root' && args[i + 1]) {
    const resolvedPath = path.resolve(args[i + 1]);
    try {
      const stat = fs.statSync(resolvedPath);
      if (!stat.isDirectory()) {
        console.error(`Error: Root path '${resolvedPath}' is not a directory.`);
        process.exit(1);
      }
      projectRoot = resolvedPath;
    } catch (error) {
      console.error(`Error: Root path '${resolvedPath}' does not exist or is not accessible.`);
      process.exit(1);
    }
    i++;
  } else if (args[i] === '--no-open') {
    skipBrowserOpen = true;
  } else if (args[i].startsWith('--')) {
    console.error(`Error: Unknown argument '${args[i]}'`);
    console.error('Usage: node src/server/index.js [--port <number>] [--root <path>] [--no-open]');
    process.exit(1);
  }
}

// Validate project root for security
const validatePath = (requestedPath) => {
  const resolved = path.resolve(projectRoot, requestedPath);
  return resolved.startsWith(projectRoot) ? resolved : null;
};

// Generate ETag for file content
const generateETag = async (filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    // Use file size and modification time for ETag
    // This is faster than reading content for MD5
    const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
    return { etag, stats };
  } catch (error) {
    return { etag: null, stats: null };
  }
};

// Cache for file ETags and content
const fileCache = new Map();
const CACHE_MAX_SIZE = 50; // Maximum number of files to cache
const CACHE_MAX_AGE = 300000; // 5 minutes in milliseconds

// Clean up old cache entries
setInterval(() => {
  const now = Date.now();
  for (const [path, entry] of fileCache.entries()) {
    if (now - entry.timestamp > CACHE_MAX_AGE) {
      fileCache.delete(path);
    }
  }
}, 60000); // Check every minute

// MIME type mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.txt': 'text/plain'
};

// SSE clients for file watching
const sseClients = new Set();

// Rate limiting configuration
const rateLimits = {
  '/api/tree': { requests: 30, window: 60000 }, // 30 requests per minute
  '/api/file': { requests: 60, window: 60000 }, // 60 requests per minute  
  '/api/state': { requests: 60, window: 60000 }, // 60 requests per minute
  '/api/events': { requests: 10, window: 60000 }  // 10 connections per minute
};

// Rate limiter state
const requestCounts = new Map();

// Rate limiting middleware
const checkRateLimit = (endpoint, clientId) => {
  const limit = rateLimits[endpoint];
  if (!limit) return true; // No limit configured
  
  const key = `${clientId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - limit.window;
  
  // Get or create request history
  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }
  
  const requests = requestCounts.get(key);
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  requestCounts.set(key, validRequests);
  
  // Check if limit exceeded
  if (validRequests.length >= limit.requests) {
    return false;
  }
  
  // Add current request
  validRequests.push(now);
  return true;
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of requestCounts.entries()) {
    const validRequests = requests.filter(timestamp => timestamp > now - 60000);
    if (validRequests.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, validRequests);
    }
  }
}, 60000); // Clean up every minute

// Debouncer for file changes
let fileChangeTimeout;
const debounceFileChange = (filePath) => {
  clearTimeout(fileChangeTimeout);
  fileChangeTimeout = setTimeout(() => {
    const message = JSON.stringify({ type: 'file-changed', path: filePath });
    for (const client of sseClients) {
      client.write(`data: ${message}\n\n`);
    }
  }, 100);
};

// Set up file watcher
const watchPaths = ['commands', 'looppool', 'agents', 'specs', '.planning'].map(p => 
  path.join(projectRoot, p)
);

watchPaths.forEach(watchPath => {
  if (fs.existsSync(watchPath)) {
    fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.startsWith('.')) {
        debounceFileChange(path.join(watchPath, filename));
      }
    });
  }
});

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname;

  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Content Security Policy headers
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self' http://localhost:* http://127.0.0.1:*; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "frame-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

  // Get client identifier (using IP address for localhost)
  const clientId = req.socket.remoteAddress || 'unknown';
  
  // Check rate limit for API endpoints
  if (pathname.startsWith('/api/')) {
    const endpoint = pathname.split('?')[0]; // Remove query params for matching
    if (!checkRateLimit(endpoint, clientId)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Too many requests', 
        message: 'Rate limit exceeded. Please try again later.' 
      }));
      return;
    }
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoints
  if (pathname === '/api/tree') {
    const dirs = ['commands', 'looppool', 'agents', 'specs'];
    const tree = {};

    for (const dir of dirs) {
      const dirPath = path.join(projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        tree[dir] = buildTree(dirPath);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tree));
    return;
  }

  if (pathname === '/api/file') {
    const filePath = validatePath(url.searchParams.get('path') || '');
    if (!filePath) {
      res.writeHead(400);
      res.end('Invalid path');
      return;
    }

    if (req.method === 'GET') {
      try {
        // Generate ETag for the file
        const { etag, stats } = await generateETag(filePath);
        
        if (!etag) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }

        // Check If-None-Match header
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
          // File hasn't changed, return 304 Not Modified
          res.writeHead(304, {
            'ETag': etag,
            'Cache-Control': 'private, must-revalidate'
          });
          res.end();
          return;
        }

        // Check cache
        const cached = fileCache.get(filePath);
        if (cached && cached.etag === etag) {
          // Serve from cache
          res.writeHead(200, {
            'Content-Type': 'text/plain',
            'ETag': etag,
            'Cache-Control': 'private, must-revalidate',
            'Content-Length': Buffer.byteLength(cached.content)
          });
          res.end(cached.content);
          return;
        }

        // Read file and update cache
        const content = await fs.promises.readFile(filePath, 'utf8');
        
        // Update cache (with size limit)
        if (fileCache.size >= CACHE_MAX_SIZE) {
          // Remove oldest entry
          const firstKey = fileCache.keys().next().value;
          fileCache.delete(firstKey);
        }
        
        fileCache.set(filePath, {
          content,
          etag,
          timestamp: Date.now()
        });

        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'ETag': etag,
          'Cache-Control': 'private, must-revalidate',
          'Content-Length': Buffer.byteLength(content)
        });
        res.end(content);
      } catch (error) {
        res.writeHead(404);
        res.end('File not found');
      }
    } else if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const tempPath = filePath + '.tmp';
          await fs.promises.writeFile(tempPath, body);
          await fs.promises.rename(tempPath, filePath);
          
          // Invalidate cache after write
          fileCache.delete(filePath);
          
          res.writeHead(200);
          res.end('OK');
        } catch (error) {
          res.writeHead(500);
          res.end('Write failed');
        }
      });
    }
    return;
  }

  if (pathname === '/api/state') {
    const statePath = path.join(projectRoot, '.planning', 'current-state.md');
    try {
      const content = await fs.promises.readFile(statePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(content);
    } catch (error) {
      res.writeHead(404);
      res.end('State not found');
    }
    return;
  }

  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    
    res.write('data: {"type":"connected"}\n\n');
    return;
  }

  // Static file serving
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, '..', 'frontend', filePath);

  try {
    const content = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Helper function to build directory tree
function buildTree(dirPath, relativePath = '') {
  const items = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const itemPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        type: 'directory',
        path: itemPath,
        children: buildTree(fullPath, itemPath)
      });
    } else {
      items.push({
        name: entry.name,
        type: 'file',
        path: itemPath
      });
    }
  }

  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// Start server
server.listen(port, '127.0.0.1', async () => {
  console.log(`LPL IDE server running at http://localhost:${port}`);
  console.log(`Project root: ${projectRoot}`);
  
  if (!skipBrowserOpen) {
    const platform = process.platform;
    const url = `http://localhost:${port}`;
    
    try {
      if (platform === 'darwin') {
        await execAsync(`open ${url}`);
      } else if (platform === 'win32') {
        await execAsync(`start ${url}`);
      } else {
        await execAsync(`xdg-open ${url}`);
      }
    } catch (error) {
      console.log('Could not auto-open browser. Please open manually.');
    }
  }
});