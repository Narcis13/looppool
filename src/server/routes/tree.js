import { readdir, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

// Directories to include in the tree
const TREE_DIRS = ['commands', 'looppool', 'agents', 'specs'];

// Files/directories to ignore
const IGNORE_PATTERNS = [
  '.git',
  'node_modules',
  '.DS_Store',
  'dist',
  'build',
  '.cache'
];

/**
 * Recursively builds a directory tree structure
 */
async function buildTree(dirPath, basePath = PROJECT_ROOT) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const tree = [];
  
  for (const entry of entries) {
    // Skip ignored files/directories
    if (IGNORE_PATTERNS.includes(entry.name)) continue;
    
    const fullPath = join(dirPath, entry.name);
    const relativePath = relative(basePath, fullPath);
    
    if (entry.isDirectory()) {
      // Recursively build subtree
      const children = await buildTree(fullPath, basePath);
      tree.push({
        name: entry.name,
        type: 'directory',
        path: relativePath,
        children
      });
    } else if (entry.isFile()) {
      // Only include markdown files
      if (entry.name.endsWith('.md')) {
        const stats = await stat(fullPath);
        tree.push({
          name: entry.name,
          type: 'file',
          path: relativePath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      }
    }
  }
  
  // Sort: directories first, then files, alphabetically
  tree.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  
  return tree;
}

/**
 * GET /api/tree - Returns directory tree structure
 */
export async function handleTree(req, res) {
  try {
    const trees = {};
    
    // Build tree for each allowed directory
    for (const dir of TREE_DIRS) {
      const dirPath = join(PROJECT_ROOT, dir);
      try {
        trees[dir] = await buildTree(dirPath);
      } catch (err) {
        // Directory might not exist
        console.warn(`Directory ${dir} not found:`, err.message);
        trees[dir] = [];
      }
    }
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(trees, null, 2));
  } catch (error) {
    console.error('Tree endpoint error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to build directory tree' }));
  }
}