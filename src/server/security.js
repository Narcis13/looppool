import { resolve, relative, normalize, join, dirname } from 'node:path';
import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

// Allowed directories that can be accessed via the API
const ALLOWED_DIRS = [
  'commands',
  'looppool',
  'agents',
  'specs',
  '.planning',
  'src'
];

// Allowed files in the root directory
const ALLOWED_ROOT_FILES = [
  'CLAUDE.md',
  'README.md',
  'CHANGELOG.md',
  'package.json'
];

/**
 * Validates a file path to prevent directory traversal attacks
 * Returns the canonical path if valid, throws error if invalid
 */
export async function validatePath(requestedPath) {
  try {
    // Step 1: Decode URL-encoded characters
    let decoded;
    try {
      decoded = decodeURIComponent(requestedPath);
    } catch (e) {
      throw new Error('Invalid URL encoding');
    }
    
    // Step 2: Normalize the path (resolve . and ..)
    const normalized = normalize(decoded);
    
    // Step 3: Resolve to absolute path within project
    const absolute = resolve(PROJECT_ROOT, normalized);
    
    // Step 4: Get canonical path (resolves symlinks)
    let canonical;
    try {
      canonical = await realpath(absolute);
    } catch (err) {
      // File doesn't exist yet, but path might be valid for writing
      // Just use the absolute path
      canonical = absolute;
    }
    
    // Step 5: Ensure path is within project root
    if (!canonical.startsWith(PROJECT_ROOT)) {
      throw new Error('Path escapes project root');
    }
    
    // Step 6: Check if path is in allowed directories
    const relativePath = relative(PROJECT_ROOT, canonical);
    if (relativePath === '') {
      // Root directory access
      throw new Error('Cannot access project root directly');
    }
    
    // Get the path parts
    const pathParts = relativePath.split(/[\\/]/);
    
    // Check if it's a root file
    if (pathParts.length === 1 && ALLOWED_ROOT_FILES.includes(pathParts[0])) {
      return canonical; // Allow specific root files
    }
    
    // Otherwise, check if it's in an allowed directory
    const topDir = pathParts[0];
    if (!ALLOWED_DIRS.includes(topDir)) {
      throw new Error(`Path not in allowed directories. Allowed: ${ALLOWED_DIRS.join(', ')}`);
    }
    
    return canonical;
  } catch (error) {
    console.error('Path validation error:', error.message);
    throw error;
  }
}

/**
 * Sanitizes a path for use in responses (removes absolute path info)
 */
export function sanitizePath(absolutePath) {
  return relative(PROJECT_ROOT, absolutePath);
}