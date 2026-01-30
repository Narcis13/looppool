/**
 * File watcher library using chokidar
 * Watches specified directories and emits events for file changes
 */

import chokidar from 'chokidar';
import { EventEmitter } from 'node:events';

/**
 * Create a file watcher for the specified directories
 *
 * @param {string[]} directories - Array of absolute directory paths to watch
 * @returns {{ emitter: EventEmitter, close: () => Promise<void> }} Watcher interface
 */
export function createWatcher(directories) {
  const emitter = new EventEmitter();

  const watcher = chokidar.watch(directories, {
    ignored: /(^|[\/\\])\./, // Ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
    depth: 10,
  });

  watcher
    .on('change', (path) => emitter.emit('change', { event: 'change', path }))
    .on('add', (path) => emitter.emit('change', { event: 'add', path }))
    .on('unlink', (path) => emitter.emit('change', { event: 'unlink', path }))
    .on('error', (error) => console.error('Watcher error:', error));

  return {
    emitter,
    close: () => watcher.close(),
  };
}
