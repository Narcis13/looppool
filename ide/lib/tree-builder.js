/**
 * Tree builder for IDE directory structure
 * Recursively builds JSON tree of markdown files
 */

import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Build a tree structure for a directory.
 * Only includes directories and .md files.
 *
 * @param {string} dir - Absolute path to directory to scan
 * @param {string} baseDir - Base directory for relative path calculation
 * @returns {Promise<Array>} Array of tree nodes
 */
export async function buildTree(dir, baseDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const tree = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // Skip hidden directories
      if (entry.name.startsWith('.')) {
        continue;
      }

      tree.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children: await buildTree(fullPath, baseDir),
      });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      tree.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
      });
    }
  }

  // Sort: directories first, then alphabetical by name
  return tree.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
