import { readFile, writeFile, stat, rename, mkdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { validatePath, sanitizePath } from '../security.js';
import { randomBytes } from 'node:crypto';

/**
 * Parse request body as text
 */
async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * GET /api/file?path=... - Read file content
 */
export async function handleFileGet(req, res, url) {
  try {
    const path = url.searchParams.get('path');
    if (!path) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing path parameter' }));
      return;
    }
    
    // Validate path
    const canonicalPath = await validatePath(path);
    
    // Read file content
    try {
      const content = await readFile(canonicalPath, 'utf-8');
      const stats = await stat(canonicalPath);
      
      res.writeHead(200, { 
        'Content-Type': 'text/plain; charset=utf-8',
        'X-File-Size': stats.size.toString(),
        'X-File-Modified': stats.mtime.toISOString(),
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
      } else if (err.code === 'EISDIR') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Path is a directory' }));
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('File read error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: error.message || 'Failed to read file' 
    }));
  }
}

/**
 * PUT /api/file?path=... - Write file content with atomic writes
 */
export async function handleFilePut(req, res, url) {
  try {
    const path = url.searchParams.get('path');
    if (!path) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing path parameter' }));
      return;
    }
    
    // Validate path
    const canonicalPath = await validatePath(path);
    
    // Parse request body
    const content = await parseBody(req);
    
    // Ensure directory exists
    const dir = dirname(canonicalPath);
    await mkdir(dir, { recursive: true });
    
    // Atomic write: write to temp file then rename
    const tempPath = `${canonicalPath}.${randomBytes(8).toString('hex')}.tmp`;
    
    try {
      // Write to temporary file
      await writeFile(tempPath, content, 'utf-8');
      
      // Atomically rename temp file to target
      await rename(tempPath, canonicalPath);
      
      // Get file stats for response
      const stats = await stat(canonicalPath);
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'X-File-Size': stats.size.toString(),
        'X-File-Modified': stats.mtime.toISOString()
      });
      res.end(JSON.stringify({ 
        success: true,
        path: sanitizePath(canonicalPath),
        size: stats.size,
        modified: stats.mtime.toISOString()
      }));
    } catch (err) {
      // Clean up temp file if it exists
      try {
        await unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      throw err;
    }
  } catch (error) {
    console.error('File write error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: error.message || 'Failed to write file' 
    }));
  }
}