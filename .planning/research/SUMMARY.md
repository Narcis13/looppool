# Project Research Summary

**Project:** GSD v2.0 IDE
**Domain:** Web-based IDE for meta-prompting system
**Researched:** 2026-01-30
**Confidence:** HIGH

## Executive Summary

The GSD v2.0 IDE is a web-based visual interface for browsing, editing, and understanding the meta-prompting system's command/workflow/agent relationships. The recommended approach is a **thin client architecture over the existing file system** using VanJS (1KB reactive framework) + CodeMirror 6 (300KB editor) + d3-force (15KB graph layout) + SSE for real-time updates. This yields a sub-100KB gzipped bundle meeting the <1 second load requirement while respecting GSD's zero-production-dependency philosophy.

The IDE does NOT replace the CLI workflow—it provides a visualization layer. All business logic remains in markdown files. The IDE parses and displays but does not transform or interpret beyond visualization needs. Changes in CLI appear in IDE (via file watcher), changes in IDE appear to CLI (files are source of truth). This parallel architecture avoids tight coupling while delivering immediate value through graph visualization and state dashboards.

Critical risks center on security (path traversal + DNS rebinding), performance (bundle size + file watcher exhaustion), and integration (edit conflicts with Claude Code). Prevention strategies: validate all paths with `path.resolve()` containment checks, enforce Host header validation, use CodeMirror over Monaco, scope file watching to specific directories, and detect external changes before saving. The modular architecture (5 phases) isolates risk: core editor failures don't affect graph visualization, and vice versa.

## Key Findings

### Recommended Stack

The stack prioritizes bundle size and simplicity while enabling rich features. VanJS provides reactive state at 1/40th React's size. CodeMirror 6 offers syntax highlighting without Monaco's 5MB overhead (Sourcegraph saw 43% JS reduction switching from Monaco to CodeMirror). d3-force handles force-directed graphs at 7x smaller footprint than Cytoscape.js. SSE replaces WebSocket for one-way updates (file watching) with native browser support and auto-reconnect.

**Core technologies:**
- **VanJS 1.5.x**: Reactive UI (1KB gzipped) — middle ground between React overhead and vanilla JS manual DOM manipulation
- **CodeMirror 6**: Editor (50KB gzipped) — modular markdown/YAML support without Monaco's 2MB+ bundle
- **d3-force 3.x**: Graph layout (15KB) — force simulation for 50-100 node visualization without Cytoscape's 110KB
- **chokidar 5.x**: File watching — cross-platform, ESM-only, requires Node 20+
- **esbuild**: Bundle frontend — already in devDependencies, 10-100x faster than alternatives

**Bundle size budget:** 95KB gzipped total (VanJS 1KB + CodeMirror 50KB + d3 modules 20KB + yaml 15KB + app code 10KB). Adds 4 production dependencies (dev only, bundled at build time), maintaining zero runtime dependencies.

**Node.js version bump:** Update from `>=16.7.0` to `>=20.0.0` (chokidar v5 requirement). Reasonable for dev tool targeting LTS.

### Expected Features

**Must have (table stakes):**
- File tree with expand/collapse — standard IDE pattern (VS Code, JetBrains)
- Markdown editor with syntax highlighting — every modern editor has this
- Auto-save with 2-second debounce — modern expectation (Notion, Google Docs)
- File watcher with <1 second latency — spec requirement
- YAML frontmatter parsing/display — command files have YAML headers

**Should have (competitive differentiators):**
- **Graph visualization** — command→workflow→agent→template relationships. No existing tool visualizes prompt engineering workflows this way. Killer feature for understanding looppool-cc codebase.
- **State panel** — .planning/ dashboard showing current milestone/phase, task progress, roadmap view. Turns IDE into project management view integrated with code.
- **Command viewer** — structured frontmatter card with copy command button, related workflow/agent links. Beats raw markdown for discoverability.

**Defer (v2+):**
- Multi-file tabs — adds UI complexity, file tree already provides navigation
- Git integration — out of scope, CLI handles this, users have terminal open
- Plugin system — maintenance burden, build core features well first
- Customizable themes — ship one good dark theme, avoid gold plating

**Anti-features (avoid):**
- Full VS Code extension support — massive complexity, feature bloat
- Monaco Editor — 5-10MB uncompressed destroys <1 second load requirement
- LSP/IntelliSense — overkill for markdown prose
- Terminal panel — complexity explosion, user has terminal anyway
- Collaborative editing — single user tool

### Architecture Approach

The IDE is a **read-write visualization layer** over GSD's existing file-based architecture. It parses commands/, looppool/, agents/, .planning/ directories but does NOT change file formats or require new conventions. The frontend (VanJS components) calls a minimal Express server (native http sufficient for localhost) which reads/writes files and broadcasts changes via SSE. chokidar watches specific directories (not entire project) to avoid EMFILE errors.

**Major components:**
1. **IDE Core** (file-tree.js, editor.js) — Foundation for browsing and editing markdown files
2. **Command Viewer** (frontmatter-card.js, relationship-links.js) — YAML parsing, structured display, workflow/agent navigation
3. **Graph View** (graph-canvas.js, build-graph.js) — d3-force layout, click-to-navigate, filter by component type
4. **State Panel** (state-panel.js, phase-progress.js) — .planning/ dashboard, roadmap visualization, task tracking
5. **IDE Server** (index.js, watcher/websocket.js) — File API (GET/PUT /api/file), SSE broadcast, path validation

**Integration with existing GSD:**
- No changes to command/workflow/agent/template formats
- IDE reads what already exists
- Files are source of truth (no IDE-specific state)
- CLI and IDE operate on same files simultaneously

**Parsing requirements:**
- YAML frontmatter: gray-matter library (battle-tested, used by Gatsby/Astro/VitePress)
- @ reference syntax: regex extraction `/@([~\w\/./-]+\.md)/g`
- XML tags: lightweight parser or DOMParser for well-formed fragments
- .planning/ state: parse STATE.md, ROADMAP.md, PLAN.md for progress tracking

### Critical Pitfalls

1. **Path traversal via directory escapes** — Attackers use `../` or URL-encoded `%2e%2e%2f` to read arbitrary files. Prevention: `path.resolve()` + containment check (`!resolved.startsWith(baseDir + path.sep)`), validate BEFORE and AFTER decoding. **Phase 1 blocker.** Sources: Node.js CVE-2025-23084, StackHawk path traversal guide.

2. **DNS rebinding on localhost** — Binding to 127.0.0.1 provides false security. Attackers use DNS rebinding to bypass same-origin policy and access local server. Prevention: validate Host header (`localhost:3456`, `127.0.0.1:3456` only), validate Origin header on WebSocket. **Phase 1 non-negotiable.** Sources: MCP SDK CVE-2025-66416, NCC Group protection bypasses.

3. **Monaco bundle size destroying load time** — Monaco ships 5-10MB uncompressed, violates <1 second requirement. Even optimized Monaco bundles exceed 2.4MB. Prevention: Use CodeMirror 6 (~300KB core). Sourcegraph achieved 43% JS reduction switching Monaco→CodeMirror. Replit saw 70% mobile retention improvement. **Phase 2 wrong choice = full rewrite.**

4. **File watcher resource exhaustion** — Watching too many files causes EMFILE errors, high CPU from polling fallback. GSD has 57,000+ lines across markdown files. Prevention: scope watching to `commands/**/*.md`, `looppool/**/*.md`, `agents/**/*.md` only. Set `usePolling: false`, use `ignored` patterns for node_modules/.git. **Phase 1 test on real codebase size.**

5. **Edit conflicts between IDE and Claude Code** — User edits in web IDE while Claude Code modifies files. Without coordination, changes are lost or files corrupted. Prevention: detect external changes via file watcher, show "file modified externally" banner with reload option, compare mtime before saving. **Phase 2 critical for real-world usage.**

## Implications for Roadmap

Research suggests 5 phases matching component modularity and dependency order:

### Phase 1: IDE Core (Foundation)
**Rationale:** All features depend on file tree navigation and editor. Must work before anything else. Includes file watching to meet spec requirement (<1 second file change reflection).
**Delivers:** Browse file tree, edit markdown files, auto-save with status indicator, real-time updates via SSE.
**Addresses:** File tree navigation (table stakes), markdown editor (table stakes), auto-save (table stakes), file watcher (spec requirement).
**Avoids:** Path traversal (pitfall #1), DNS rebinding (pitfall #2), file watcher exhaustion (pitfall #4).
**Stack:** VanJS (file-tree.js, editor.js), CodeMirror 6 (markdown syntax), chokidar (watching), SSE (updates).
**Needs research:** No — standard patterns for file tree, editor, auto-save.

### Phase 2: Command Viewer (GSD-Specific Value)
**Rationale:** Lowest complexity differentiator. Builds on Phase 1 editor. Introduces YAML parsing infrastructure reused by graph view. Quick win demonstrating GSD-specific value.
**Delivers:** Structured frontmatter cards, copy command button, related workflow/agent links, tool badges.
**Addresses:** Command viewer (competitive differentiator), frontmatter parsing (table stakes for GSD).
**Avoids:** YAML frontmatter corruption (pitfall #7), edit conflicts (pitfall #5 via mtime checks).
**Stack:** gray-matter (frontmatter parsing), VanJS (frontmatter-card.js, relationship-links.js).
**Needs research:** No — frontmatter parsing is well-documented.

### Phase 3: State Panel (Planning Dashboard)
**Rationale:** Independent feature, lower priority than command viewer. Depends on .planning/ structure being stable. Provides project management integration.
**Delivers:** Current milestone/phase display, task progress bars, roadmap view, "resume work" quick action.
**Addresses:** State panel (competitive differentiator), .planning/ integration (table stakes for GSD).
**Avoids:** Hardcoded paths (pitfall #6 via dynamic detection), polling overhead (use SSE push not polling).
**Stack:** VanJS (state-panel.js, phase-progress.js), gray-matter (parse PLAN.md frontmatter).
**Needs research:** No — .planning/ format is internal and stable.

### Phase 4: Graph View (Highest Complexity, Highest Value)
**Rationale:** Highest differentiation but also highest complexity. Requires relationship extraction built in Phase 2 (frontmatter parsing). Separate from core editor so failures don't affect basic editing.
**Delivers:** Interactive command→workflow→agent→template visualization, click-to-navigate, filter by type, hierarchical layout.
**Addresses:** Graph visualization (killer feature), relationship understanding (differentiator).
**Avoids:** Browser freeze (pitfall #9 via Web Worker + Canvas for 100+ nodes), performance issues (d3-force not Cytoscape).
**Stack:** d3-force (layout), d3-selection/zoom/drag (interaction), VanJS (graph-canvas.js), build-graph.js (relationship extraction).
**Needs research:** **Yes** — complex force layout optimization, Web Worker integration patterns for large graphs.

### Phase 5: Polish and Optimization
**Rationale:** Enhancements to existing features. Can be deferred if timeline pressure.
**Delivers:** Performance tuning, bundle optimization, accessibility improvements, mobile responsiveness.
**Addresses:** <1 second load requirement verification, large file performance (pitfall #11).
**Avoids:** Premature optimization (only optimize based on real measurements).
**Stack:** esbuild (bundle analysis), Lighthouse (performance auditing).
**Needs research:** No — standard web performance optimization.

### Phase Ordering Rationale

- **Dependencies:** Phase 2 reuses Phase 1 editor infrastructure. Phase 4 reuses Phase 2 frontmatter parsing. Phases 3 and 4 are independent (can be parallel if resources available).
- **Risk isolation:** Core editor (Phase 1) must be rock-solid. Graph view (Phase 4) is highest complexity, isolate to prevent destabilizing core functionality.
- **Value delivery:** Phase 1 delivers usable IDE. Phase 2 adds first differentiator. Phase 3 provides project management view. Phase 4 adds killer feature (graph visualization).
- **Pitfall avoidance:** Security pitfalls (#1, #2) addressed in Phase 1 before any public-facing features. Bundle size pitfall (#3) avoided by editor choice in Phase 2. Performance pitfalls (#4, #9) addressed in phases where they occur.

### Research Flags

**Needs research during planning:**
- **Phase 4 (Graph View):** Complex force layout optimization for 100+ nodes, Web Worker integration patterns, Canvas vs SVG rendering tradeoffs. Niche domain (meta-prompting visualization), no established patterns.

**Standard patterns (skip research-phase):**
- **Phase 1 (IDE Core):** File tree, CodeMirror editor, auto-save — well-documented, established patterns.
- **Phase 2 (Command Viewer):** YAML frontmatter parsing — battle-tested libraries (gray-matter).
- **Phase 3 (State Panel):** Markdown parsing, dashboard UI — standard web development.
- **Phase 5 (Polish):** Performance optimization — standard tooling (Lighthouse, esbuild analysis).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | VanJS/CodeMirror/d3-force verified via official docs and npm. Bundle size numbers from Sourcegraph/Replit real-world migrations. chokidar battle-tested (30M repos). |
| Features | HIGH | Table stakes confirmed by spec requirements. Differentiators align with "graph view" and "state panel" specs. Anti-features based on "keep minimal" philosophy. |
| Architecture | HIGH | Thin client over file system aligns with GSD's file-based design. Parallel CLI/IDE architecture avoids tight coupling. Component boundaries match spec's 5-component structure. |
| Pitfalls | HIGH | Security pitfalls verified via CVEs (DNS rebinding CVE-2025-66416, path traversal CVE-2025-23084). Performance data from Sourcegraph/Replit production experiences. |

**Overall confidence:** HIGH

### Gaps to Address

- **Graph layout for 100+ nodes:** Research recommends Web Worker + Canvas, but concrete implementation pattern needs validation during Phase 4 planning. Consider `/lpl:research-phase` for force layout optimization.
- **External change conflict resolution:** Mtime comparison strategy is solid, but exact UX flow (reload vs merge vs overwrite) needs design decision during Phase 2 implementation.
- **Node.js version bump impact:** Updating requirement to >=20.0.0 is low-risk (Node 20 is LTS), but confirm no GSD users stuck on Node 16/18 before committing.

## Sources

### Primary (HIGH confidence)

**Stack:**
- [VanJS Official Site](https://vanjs.org/) — 1.0KB reactive framework, API documentation
- [CodeMirror 6 Documentation](https://codemirror.net/) — modular architecture, bundle size
- [d3-force Documentation](https://d3js.org/d3-force) — force simulation API (version 3.x)
- [chokidar GitHub](https://github.com/paulmillr/chokidar) — v5 ESM-only, Node 20+ requirement
- [esbuild Documentation](https://esbuild.github.io/) — bundler configuration

**Features:**
- [Sourcegraph: Monaco to CodeMirror Migration](https://sourcegraph.com/blog/migrating-monaco-codemirror) — 43% JS reduction
- [Replit: Code Editors Comparison](https://blog.replit.com/code-editors) — 70% mobile retention improvement
- [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview) — tree view patterns
- [Carbon Design System: Tree View](https://carbondesignsystem.com/components/tree-view/usage/) — accessibility

**Architecture:**
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) — frontmatter parser (used by Gatsby/Astro/VitePress)
- [Cytoscape.js Documentation](https://js.cytoscape.org/) — graph visualization (rejected for size)

**Pitfalls:**
- [Node.js Path Traversal Guide - StackHawk](https://www.stackhawk.com/blog/node-js-path-traversal-guide-examples-and-prevention/)
- [CVE-2025-23084 Node.js](https://security.snyk.io/vuln/SNYK-UPSTREAM-NODE-8651420) — path traversal vulnerability
- [CVE-2025-66416 MCP SDK](https://www.miggo.io/vulnerability-database/cve/CVE-2025-66416) — DNS rebinding attack
- [MCP Python SDK Advisory](https://github.com/modelcontextprotocol/python-sdk/security/advisories/GHSA-9h52-p55h-vw2f)
- [DNS Rebinding Protection Bypasses](https://github.com/nccgroup/singularity/wiki/Protection-Bypasses)

### Secondary (MEDIUM confidence)

- [CodeMirror vs Monaco Comparison - PARA Garden](https://agenthicks.com/research/codemirror-vs-monaco-editor-comparison)
- [D3 Force Layout Optimization - Nebula Graph](https://www.nebula-graph.io/posts/d3-force-layout-optimization)
- [VSCode duplicate events issue](https://github.com/microsoft/vscode-remote-release/issues/9805)
- [Vite: fs.watch vs chokidar](https://github.com/vitejs/vite/issues/12495)
- [OS file change detection](https://dev.to/asoseil/how-macos-linux-and-windows-detect-file-changes-and-why-it-isnt-easy-194m)

### Tertiary (LOW confidence, needs validation)

- None — all findings verified through official docs or multiple sources

---
*Research completed: 2026-01-30*
*Ready for roadmap: yes*
