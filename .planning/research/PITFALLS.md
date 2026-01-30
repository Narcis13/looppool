# Pitfall Research: IDE

**Researched:** 2026-01-30
**Focus:** Web-based IDE for GSD/LPL meta-prompting system
**Confidence:** HIGH (verified through multiple sources, official documentation, and real-world issue reports)

## Critical Pitfalls

These mistakes cause rewrites or major issues. Address in early phases.

### 1. Directory Traversal via Path Manipulation

**What goes wrong:** Attackers use `../` sequences or URL-encoded variants (`%2e%2e%2f`) to escape the project directory and read/write arbitrary files.

**Warning signs:**
- Using simple string concatenation for paths (`baseDir + userInput`)
- Not decoding URL-encoded input before validation
- Relying on `path.normalize()` alone for security
- Windows-specific exploits through drive letter handling

**Prevention:**
```javascript
// WRONG: Vulnerable to traversal
const filePath = path.join(baseDir, userInput);

// RIGHT: Resolve and validate containment
const resolved = path.resolve(baseDir, decodeURIComponent(userInput));
if (!resolved.startsWith(path.resolve(baseDir) + path.sep)) {
  throw new Error('Access denied');
}
```

**Phase:** Server implementation (Phase 1). Must be correct from day one.

**Sources:**
- [Node.js Path Traversal Guide](https://www.stackhawk.com/blog/node-js-path-traversal-guide-examples-and-prevention/)
- [CVE-2025-23084 in Node.js](https://security.snyk.io/vuln/SNYK-UPSTREAM-NODE-8651420)

---

### 2. DNS Rebinding Attack on Localhost Services

**What goes wrong:** Binding to `127.0.0.1` provides false security. Attackers use DNS rebinding to make a malicious domain resolve to `127.0.0.1`, bypassing same-origin policy and accessing your local server through victim's browser.

**Warning signs:**
- No Host header validation
- No Origin header checking
- Assuming "localhost-only" means "secure"
- Not requiring authentication for sensitive operations

**Prevention:**
```javascript
// Validate Host header on every request
const host = req.headers.host;
if (!host || !['localhost:3456', '127.0.0.1:3456'].includes(host)) {
  res.status(403).send('Invalid host');
  return;
}

// Also validate Origin for WebSocket connections
const origin = req.headers.origin;
if (origin && !origin.startsWith('http://localhost:') &&
    !origin.startsWith('http://127.0.0.1:')) {
  res.status(403).send('Invalid origin');
  return;
}
```

**Phase:** Server implementation (Phase 1). Non-negotiable security baseline.

**Sources:**
- [DNS Rebinding Protection Bypasses](https://github.com/nccgroup/singularity/wiki/Protection-Bypasses)
- [CVE-2025-66416: MCP SDK DNS Rebinding](https://www.miggo.io/vulnerability-database/cve/CVE-2025-66416)
- [MCP Python SDK Advisory](https://github.com/modelcontextprotocol/python-sdk/security/advisories/GHSA-9h52-p55h-vw2f)

---

### 3. Editor Bundle Size Destroying Load Time

**What goes wrong:** Monaco Editor ships at 5-10MB uncompressed. With the `<1 second` load requirement, this is a project killer. Even optimized Monaco bundles run 2.4MB+.

**Warning signs:**
- Choosing Monaco because "it's what VS Code uses"
- Not measuring First Contentful Paint during development
- Loading editor library synchronously in main bundle
- Ignoring mobile performance entirely (Monaco is unusable on mobile)

**Prevention:**
- Use CodeMirror 6 instead (~300KB core vs 5MB+)
- Lazy-load editor only when file is opened
- Measure FCP target (1.8s or less) during CI
- Test on throttled connections

**Phase:** Editor selection (Phase 2). Wrong choice here requires full rewrite.

**Sources:**
- [Sourcegraph: Migrating from Monaco to CodeMirror](https://sourcegraph.com/blog/migrating-monaco-codemirror) - 43% JS reduction
- [Replit: Code Editors Comparison](https://blog.replit.com/code-editors) - 70% retention improvement on mobile

---

### 4. File Watcher Resource Exhaustion

**What goes wrong:** Watching too many files causes EMFILE errors (too many open files), high CPU from polling fallback, or memory exhaustion. GSD has 57,000+ lines across markdown files.

**Warning signs:**
- Watching entire project directory recursively
- Using `fs.watchFile` (polling) instead of `fs.watch` (events)
- Not setting system file descriptor limits
- macOS fsevents silently falling back to polling

**Prevention:**
- Watch only specific directories: `commands/`, `looppool/`, `agents/`
- Set `usePolling: false` explicitly (chokidar)
- Detect fsevents availability on macOS, warn if missing
- Use `ignored` patterns for node_modules, .git

```javascript
// Watch only necessary directories
const watcher = chokidar.watch([
  'commands/**/*.md',
  'looppool/**/*.md',
  'agents/**/*.md'
], {
  usePolling: false,
  ignoreInitial: true,
  ignored: /(^|[\/\\])\../ // Ignore dotfiles
});
```

**Phase:** File watching (Phase 1). Test on real codebase size.

**Sources:**
- [Chokidar documentation](https://github.com/paulmillr/chokidar)
- [Vite issue: fs.watch vs chokidar](https://github.com/vitejs/vite/issues/12495)

---

## Integration Pitfalls

Specific to integrating with existing GSD/LPL file-based system.

### 5. Edit Conflicts Between IDE and Claude Code

**What goes wrong:** User edits file in web IDE while Claude Code is also modifying files. Without coordination, changes are lost or files become corrupted.

**Warning signs:**
- No lock mechanism or conflict detection
- WebSocket not receiving external changes
- Auto-save overwriting Claude's changes
- No "file changed externally" warning

**Prevention:**
- Detect external changes via file watcher, prompt user before overwriting
- Show "file modified externally" banner with reload option
- Consider optimistic locking with file mtime comparison
- Disable auto-save when file has external modifications

```javascript
// Before saving, check if file changed externally
const currentMtime = fs.statSync(filePath).mtimeMs;
if (currentMtime !== lastKnownMtime) {
  // Warn user: "File changed externally. Reload or overwrite?"
}
```

**Phase:** Editor implementation (Phase 2). Critical for real-world usage.

---

### 6. Hardcoded Paths Breaking Portability

**What goes wrong:** IDE assumes project structure (`commands/`, `looppool/`, `agents/`) but user installs LPL differently, or directories don't exist yet.

**Warning signs:**
- Crashing when directory doesn't exist
- Not detecting LPL installation dynamically
- Assuming CWD is project root

**Prevention:**
- Read from CLAUDE.md or package.json to detect project structure
- Gracefully handle missing directories (create or hide in UI)
- Use relative paths from server's working directory
- Support custom directory configuration

**Phase:** Server setup (Phase 1). Foundation for all file operations.

---

### 7. YAML Frontmatter Corruption

**What goes wrong:** GSD command files use YAML frontmatter. Generic markdown editing corrupts frontmatter delimiters, breaks required fields, or mangles multi-line strings.

**Warning signs:**
- Editor treating `---` as horizontal rule instead of frontmatter delimiter
- Not validating frontmatter schema on save
- Breaking allowed-tools array formatting

**Prevention:**
- Parse frontmatter separately from content
- Validate against command schema before save
- Show frontmatter in structured form (optional)
- Syntax highlight YAML differently than markdown body

**Phase:** Editor implementation (Phase 2). GSD-specific requirement.

---

## Performance Pitfalls

Load time, file watching, graph rendering issues.

### 8. Duplicate File Watcher Events

**What goes wrong:** Single save operation fires 6+ events (temp file create, write, rename). Each triggers WebSocket update, causing UI flicker and wasted renders.

**Warning signs:**
- UI flickering on save
- Multiple "file changed" toasts per save
- Network tab showing burst of WebSocket messages
- High CPU on frontend during saves

**Prevention:**
- Debounce file events (200-500ms window)
- Batch related changes
- Track mtime to filter duplicate CHANGED events
- Use `awaitWriteFinish` option in chokidar

```javascript
const watcher = chokidar.watch(paths, {
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
});
```

**Phase:** File watching (Phase 1). Test with actual editor save behavior.

**Sources:**
- [VSCode duplicate events issue](https://github.com/microsoft/vscode-remote-release/issues/9805)
- [How OS file change detection works](https://dev.to/asoseil/how-macos-linux-and-windows-detect-file-changes-and-why-it-isnt-easy-194m)

---

### 9. Graph Visualization Freezing Browser

**What goes wrong:** D3 force layout with 50+ nodes runs O(n log n) per tick. With GSD's structure (commands -> workflows -> agents -> templates), graph computation blocks main thread.

**Warning signs:**
- Graph takes >1 second to appear
- Browser becomes unresponsive during pan/zoom
- Cannot interact with nodes after 100+ items

**Prevention:**
- Use Web Workers for layout computation
- Consider hierarchical layout (d3.tree) instead of force-directed
- Render via Canvas/WebGL instead of SVG for large graphs
- Lazy-load graph view (not on initial page load)
- Set iteration limits on force simulation

```javascript
// Limit force simulation iterations
simulation.alphaDecay(0.05) // Faster convergence
  .alphaMin(0.1)  // Stop sooner
  .on('tick', () => {
    // Throttle rendering
  });
```

**Phase:** Graph view (Phase 4). Separate from core editor.

**Sources:**
- [D3 Force Layout Optimization](https://www.nebula-graph.io/posts/d3-force-layout-optimization)
- [Scaling D3 Graph Visualization](https://medium.com/neo4j/scale-up-your-d3-graph-visualisation-part-2-2726a57301ec)

---

### 10. WebSocket Connection Instability

**What goes wrong:** WebSocket closes on tab blur, browser throttling kills connection, reconnection logic missing, or stale connections pile up.

**Warning signs:**
- File changes stop appearing after browser sits idle
- Memory growing from unclosed connections
- No reconnection after network hiccup

**Prevention:**
- Implement heartbeat/ping-pong
- Auto-reconnect with exponential backoff
- Clean up connections on close events
- Consider SSE as simpler alternative (auto-reconnects)

**Phase:** Real-time updates (Phase 1). Core infrastructure.

---

### 11. Large Markdown File Performance

**What goes wrong:** GSD files average 200-600 lines, but some references exceed 1000 lines. Syntax highlighting and preview rendering bog down.

**Warning signs:**
- Typing lag in large files
- Preview scroll sync breaking
- Memory increasing over editing session

**Prevention:**
- CodeMirror 6 handles large documents via viewport rendering
- Lazy-load syntax highlighters via dynamic import
- Skip live preview for files >1000 lines (show on demand)
- Consider chunked rendering for preview

**Phase:** Editor implementation (Phase 2). Test with largest GSD files.

---

## Security Pitfalls

Beyond directory traversal - other security considerations.

### 12. Symlink Escape from Project Directory

**What goes wrong:** Symlink inside project points outside. Path validation passes (it's inside project), but resolved path is elsewhere.

**Warning signs:**
- Only checking logical path, not resolved path
- Allowing symlink creation via API
- Not following symlinks during validation

**Prevention:**
```javascript
// Resolve symlinks before validation
const realPath = fs.realpathSync(requestedPath);
const realBase = fs.realpathSync(baseDir);
if (!realPath.startsWith(realBase + path.sep)) {
  throw new Error('Access denied');
}
```

**Phase:** Server implementation (Phase 1). Part of path validation.

**Sources:**
- [Webpack symlink infinite loop](https://github.com/webpack/webpack/issues/18688)
- [fs.watch symlink behavior](https://github.com/nodejs/node/issues/25440)

---

### 13. Missing Content-Type Headers

**What goes wrong:** Serving markdown files without proper Content-Type lets browser interpret as HTML, enabling XSS if file contains malicious content.

**Warning signs:**
- Browser rendering markdown as HTML
- No Content-Type header on API responses
- Serving raw file contents without sanitization

**Prevention:**
```javascript
// Always set explicit Content-Type
res.setHeader('Content-Type', 'text/plain; charset=utf-8');
// Or for JSON API
res.setHeader('Content-Type', 'application/json');
```

**Phase:** Server implementation (Phase 1). Basic HTTP hygiene.

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| 1 | Server | Path traversal + DNS rebinding | Validate all paths, check Host header |
| 1 | File watching | EMFILE + duplicate events | Scoped watching + debounce |
| 2 | Editor | Bundle size + load time | Use CodeMirror, lazy load |
| 2 | Editor | Frontmatter corruption | YAML-aware parsing |
| 2 | Editor | External change conflicts | Mtime comparison |
| 3 | State panel | Polling overhead | WebSocket push instead |
| 4 | Graph | Browser freeze | Web Worker + Canvas |

## Checklist for Implementation

Before each phase, verify:

- [ ] Path validation handles URL encoding and symlinks
- [ ] Host/Origin headers validated on all endpoints
- [ ] File watcher scoped to necessary directories only
- [ ] Debouncing prevents duplicate event processing
- [ ] Editor bundle under 500KB for initial load
- [ ] External file changes detected before save
- [ ] Large file performance tested with real GSD files
- [ ] Graph computation offloaded from main thread

## Sources

**Security:**
- [Node.js Path Traversal Guide](https://www.stackhawk.com/blog/node-js-path-traversal-guide-examples-and-prevention/)
- [DNS Rebinding Protection Bypasses](https://github.com/nccgroup/singularity/wiki/Protection-Bypasses)
- [MCP SDK DNS Rebinding CVE](https://www.miggo.io/vulnerability-database/cve/CVE-2025-66416)
- [Secure Coding Practices for Path Traversal](https://www.nodejs-security.com/blog/secure-coding-practices-nodejs-path-traversal-vulnerabilities)

**Performance:**
- [Sourcegraph: Monaco to CodeMirror Migration](https://sourcegraph.com/blog/migrating-monaco-codemirror)
- [Replit: Code Editor Comparison](https://blog.replit.com/code-editors)
- [Chokidar Documentation](https://github.com/paulmillr/chokidar)
- [D3 Force Layout Optimization](https://www.nebula-graph.io/posts/d3-force-layout-optimization)
- [First Contentful Paint Guide](https://web.dev/articles/fcp)

**File Watching:**
- [Vite: fs.watch vs chokidar](https://github.com/vitejs/vite/issues/12495)
- [VSCode duplicate events issue](https://github.com/microsoft/vscode-remote-release/issues/9805)
- [OS file change detection](https://dev.to/asoseil/how-macos-linux-and-windows-detect-file-changes-and-why-it-isnt-easy-194m)

**Node.js WebSocket:**
- [ws library documentation](https://github.com/websockets/ws)
- [Node.js 22 WebSocket improvements](https://blog.risingstack.com/nodejs-22/)
