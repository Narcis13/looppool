import { watch } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

// Directories to watch
const WATCH_DIRS = ['commands', 'looppool', 'agents', 'specs', '.planning'];

// Active SSE connections
const clients = new Set();

// Debounce timer for file events
const eventDebounce = new Map();
const DEBOUNCE_MS = 300;

/**
 * Send event to all connected clients
 */
function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(data);
  }
}

/**
 * Handle file change with debouncing
 */
function handleFileChange(eventType, filename, dirPath) {
  if (!filename) return;
  
  // Ignore non-markdown files
  if (!filename.endsWith('.md')) return;
  
  const fullPath = join(dirPath, filename);
  const relativePath = relative(PROJECT_ROOT, fullPath);
  
  // Debounce events for the same file
  const debounceKey = `${eventType}:${relativePath}`;
  
  if (eventDebounce.has(debounceKey)) {
    clearTimeout(eventDebounce.get(debounceKey));
  }
  
  const timer = setTimeout(() => {
    eventDebounce.delete(debounceKey);
    broadcast({
      type: eventType === 'rename' ? 'change' : eventType,
      path: relativePath,
      timestamp: Date.now()
    });
  }, DEBOUNCE_MS);
  
  eventDebounce.set(debounceKey, timer);
}

/**
 * Set up file watchers for all directories
 */
async function setupWatchers() {
  const watchers = [];
  
  for (const dir of WATCH_DIRS) {
    const dirPath = join(PROJECT_ROOT, dir);
    try {
      const watcher = watch(dirPath, { recursive: true });
      watchers.push({ watcher, dir: dirPath });
      
      // Handle events from watcher
      (async () => {
        for await (const event of watcher) {
          handleFileChange(event.eventType, event.filename, dirPath);
        }
      })().catch(err => {
        console.error(`Watcher error for ${dir}:`, err);
      });
    } catch (err) {
      console.warn(`Failed to watch directory ${dir}:`, err.message);
    }
  }
  
  return watchers;
}

// Initialize watchers
let watchers = [];
setupWatchers().then(w => {
  watchers = w;
  console.log(`Watching ${watchers.length} directories for changes`);
});

/**
 * GET /api/events - Server-Sent Events endpoint
 */
export function handleEvents(req, res) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
  
  // Add client to active connections
  clients.add(res);
  console.log(`SSE client connected (${clients.size} total)`);
  
  // Send periodic heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);
  
  // Clean up on disconnect
  const cleanup = () => {
    clients.delete(res);
    clearInterval(heartbeatInterval);
    console.log(`SSE client disconnected (${clients.size} remaining)`);
  };
  
  req.on('close', cleanup);
  req.on('error', cleanup);
}

/**
 * Manually trigger a file change event (useful for testing)
 */
export function triggerFileChange(path) {
  broadcast({
    type: 'change',
    path: path,
    timestamp: Date.now()
  });
}