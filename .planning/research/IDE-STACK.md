# Stack Research: Web-Based IDE

**Researched:** 2026-01-30
**Focus:** Web-based IDE for GSD/LPL meta-prompting system
**Confidence:** HIGH (verified via official docs and npm)

## Executive Summary

The IDE requires a stack that respects GSD's zero-production-dependency philosophy while enabling rich features (code editing, graph visualization, real-time updates). The recommended approach: **VanJS for reactive UI + CodeMirror 6 for editing + d3-force for graphs + SSE for updates + native Node http for server**.

This stack adds **4 production dependencies** (VanJS, CodeMirror packages, d3-force, chokidar) while keeping total bundle size under 100KB gzipped. All dependencies are bundled at build time, maintaining zero runtime dependencies.

---

## Recommended Stack

### Frontend Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **VanJS** | 1.5.x | Reactive UI | 1.0KB gzipped, zero dependencies, pure vanilla JS, no build step required. Feels like React without JSX/transpiling. 5 functions total API. |

**Rationale:** The specs suggest "React or vanilla JavaScript (keep minimal)". VanJS is the perfect middle ground - reactive state binding without React's 40KB+ overhead. It runs directly in browsers without transpilation, aligning with the "no heavy frameworks" requirement.

**Alternatives rejected:**
- **React**: 40KB+ minified, requires build step, overkill for this use case
- **Pure vanilla JS**: Works but manual DOM manipulation becomes tedious for reactive UI (file tree updates, state changes)
- **Preact**: 3KB but still needs JSX/build step
- **Svelte**: Requires compiler, breaks "no build step for quick edits" goal

### Code Editor

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@codemirror/view** | 6.x | Editor view layer | Core rendering, event handling |
| **@codemirror/state** | 6.x | Editor state management | Document model, transactions |
| **@codemirror/commands** | 6.x | Keybindings | Standard editing commands |
| **@codemirror/lang-markdown** | 6.5.x | Markdown support | Syntax highlighting, folding |
| **@codemirror/language** | 6.x | Language infrastructure | Required for lang-markdown |

**Rationale:** CodeMirror 6 is the industry standard for browser-based code editing. The modular architecture means we only import what we need. Total: ~50KB minified. Supports YAML frontmatter highlighting within markdown.

**Alternatives rejected:**
- **Monaco**: 2MB+ bundle, massively overkill, designed for VS Code
- **Ace**: Legacy architecture, larger bundle than CM6
- **textarea**: No syntax highlighting, poor UX

### Graph Visualization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **d3-force** | 3.x | Force-directed layout | ~15KB minified, focused API for node positioning |
| **d3-selection** | 3.x | DOM manipulation | Required for SVG rendering |
| **d3-zoom** | 3.x | Pan/zoom | Interactive navigation |
| **d3-drag** | 3.x | Node dragging | Interactive repositioning |

**Rationale:** d3-force provides force-directed graph layout without the full Cytoscape overhead (110KB vs 15KB). Since we're building a hierarchical visualization (commands -> workflows -> agents -> templates), d3-force's force simulation is sufficient. We render to SVG ourselves for full control.

**Alternatives rejected:**
- **Cytoscape.js**: 110KB gzipped, includes features we don't need (compound graphs, biology-specific algorithms). Overkill for a 50-100 node visualization.
- **vis.js**: 170KB+, heavy
- **sigma.js**: Designed for massive graphs (10K+ nodes), wrong use case

### YAML Parsing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **yaml** (eemeli/yaml) | 2.x | Parse YAML frontmatter | Zero dependencies, works in browser + Node, 25KB minified |

**Rationale:** Needed for command viewer to parse YAML frontmatter. The `yaml` package is actively maintained, zero-dependency, and works identically in browser and Node.js.

**Alternatives rejected:**
- **js-yaml**: 30KB, slightly larger, less modern API
- **yamljs**: Unmaintained since 2019

### Real-time Updates

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **SSE (Server-Sent Events)** | native | File change notifications | Built into browsers and Node, simpler than WebSocket for one-way updates |

**Rationale:** SSE is native to browsers (EventSource API) and trivial to implement in Node.js (just HTTP with specific headers). Since file watching only sends server->client updates, SSE is simpler than WebSocket. Works through HTTP/2 multiplexing, no connection limits in modern browsers.

**Why not WebSocket:**
- Bidirectional not needed (client writes via REST, not WebSocket)
- SSE auto-reconnects
- Simpler server implementation
- No additional dependencies

### Backend Server

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Node.js native http** | Node 20+ | HTTP server | Zero dependencies, sufficient for localhost |
| **chokidar** | 5.x | File watching | Cross-platform file watching, 1 dependency, ESM-only |

**Rationale:** Native `http` module is sufficient for a localhost-only dev server. Express adds 500KB+ of dependencies for features we don't need. Chokidar v5 is ESM-only with Node 20+ requirement, which aligns with modern Node standards.

**Alternatives rejected:**
- **Express**: 500KB+ dependencies, overkill for 4 endpoints
- **Fastify**: 200KB+, still overkill
- **fs.watch**: Unreliable cross-platform, chokidar wraps it properly

### Build Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **esbuild** | 0.24+ | Bundle frontend | Already in devDependencies, 10-100x faster than alternatives |

**Rationale:** GSD already uses esbuild for hook building. Use it to bundle the IDE frontend as well. Single build command produces minified bundle.

---

## What NOT to Add

| Exclusion | Reason |
|-----------|--------|
| **React/Vue/Angular** | Violates minimal dependency philosophy, VanJS provides reactive state at 1/40th the size |
| **Express** | Native http is sufficient for localhost dev server |
| **Monaco Editor** | 2MB+ bundle for features we don't use |
| **Cytoscape.js** | 110KB for a 50-node graph is wasteful, d3-force is 7x smaller |
| **WebSocket libraries (ws, socket.io)** | SSE is native and sufficient for one-way updates |
| **Tailwind/CSS frameworks** | Custom CSS is fine for a dev tool, no need for framework |
| **TypeScript** | GSD is JavaScript-only, maintain consistency |
| **Testing frameworks** | Not needed for initial IDE implementation |

---

## Integration Points

### Existing GSD Infrastructure

| Integration | Approach |
|-------------|----------|
| **esbuild** | Extend scripts/build-hooks.js to also build IDE frontend |
| **package.json scripts** | Add `npm run ide` to start server + open browser |
| **File structure** | IDE reads commands/, looppool/, agents/ - same directories GSD uses |
| **State files** | IDE reads .planning/STATE.json - existing state management |
| **Zero prod deps** | All IDE dependencies are devDependencies, bundled into dist |

### New Files Structure

```
ide/
  src/
    index.html        # Entry point
    main.js           # VanJS app initialization
    components/
      file-tree.js    # File tree component
      editor.js       # CodeMirror wrapper
      graph.js        # d3-force graph
      state-panel.js
    styles.css        # Single CSS file
  server/
    index.js          # Native http server
  dist/               # Built output (gitignored)
```

### Build Integration

```javascript
// Add to scripts/build-hooks.js or create scripts/build-ide.js
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['ide/src/main.js'],
  bundle: true,
  minify: true,
  outfile: 'ide/dist/bundle.js',
  format: 'esm',
});
```

---

## Installation Commands

```bash
# All installed as devDependencies (bundled, not runtime deps)
npm install -D vanjs-core@^1.5
npm install -D @codemirror/view @codemirror/state @codemirror/commands
npm install -D @codemirror/lang-markdown @codemirror/language
npm install -D d3-force d3-selection d3-zoom d3-drag
npm install -D yaml
npm install -D chokidar@^5
```

Note: All installed as devDependencies since they're bundled. Runtime has zero new dependencies.

---

## Bundle Size Budget

| Component | Minified | Gzipped |
|-----------|----------|---------|
| VanJS | 3KB | 1KB |
| CodeMirror (core + markdown) | 150KB | 50KB |
| d3-force + selection + zoom + drag | 60KB | 20KB |
| yaml | 40KB | 15KB |
| Application code | ~30KB | ~10KB |
| **Total** | **~280KB** | **~95KB** |

Target: Under 100KB gzipped for sub-1-second load on localhost.

---

## Node.js Version Requirement

Current GSD requirement: `>=16.7.0`
Recommended update: `>=20.0.0`

**Rationale:** chokidar v5 requires Node 20+. Since GSD is a dev tool, requiring Node 20 (LTS) is reasonable. Update engines field in package.json.

---

## Comparison Summary: Why This Stack

| Dimension | This Stack | React-Based Alternative | Pure Vanilla |
|-----------|-----------|------------------------|--------------|
| Bundle size | ~95KB gzip | ~200KB+ gzip | ~80KB gzip |
| Dev complexity | Low | High (JSX, build) | Medium (manual DOM) |
| Reactivity | Built-in (VanJS state) | Built-in | Manual |
| Load time | <500ms | <1s | <500ms |
| Dependencies added | 4 (dev only) | 5+ | 3 |
| Maintenance | Low | Medium | Low |

**Winner: This Stack** - Best balance of features, size, and simplicity.

---

## Sources

**Official Documentation:**
- [d3-force](https://d3js.org/d3-force) - D3 force simulation module (version 7.9.0, d3-force module is v3.x)
- [Cytoscape.js](https://js.cytoscape.org/) - v3.33.1, used for size comparison
- [CodeMirror](https://codemirror.net/) - CodeMirror 6 official site
- [CodeMirror System Guide](https://codemirror.net/docs/guide/) - modular architecture explanation
- [VanJS](https://vanjs.org/) - 1.0KB reactive framework
- [chokidar](https://github.com/paulmillr/chokidar) - v5, Node 20+, ESM-only
- [esbuild](https://esbuild.github.io/) - v0.27.2, fast bundler
- [yaml](https://github.com/eemeli/yaml) - zero-dependency YAML parser

**Bundle Size References:**
- [Cytoscape.js .size-snapshot.json](https://github.com/cytoscape/cytoscape.js/blob/unstable/.size-snapshot.json) - 110KB gzipped
- d3-force: ~15KB minified (modular import)
- VanJS: 1.0KB gzipped (official claim verified)

**Architecture Decisions:**
- [SSE vs WebSocket comparison](https://ably.com/blog/websockets-vs-sse) - SSE for unidirectional updates
- [SSE beats WebSockets for 95% of real-time apps](https://medium.com/codetodeploy/why-server-sent-events-beat-websockets-for-95-of-real-time-cloud-applications-830eff5a1d7c)
- [Vanilla JavaScript vs React 2026](https://dev.to/purushoth_26/react-vs-vanilla-javascript-what-to-choose-in-2025-5ejb)
- [VanJS GitHub](https://github.com/vanjs-org/van) - World's smallest reactive UI framework
