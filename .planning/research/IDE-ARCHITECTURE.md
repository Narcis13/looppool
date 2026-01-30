# Architecture Research: Web-Based IDE

**Researched:** 2026-01-30
**Focus:** Web-based IDE for GSD/LPL meta-prompting system
**Confidence:** HIGH

---

## Executive Summary

The web-based IDE integrates with GSD's existing file-based architecture as a **read-write visualization layer**. The IDE does NOT replace the CLI workflow — it provides a visual interface for browsing, editing, and understanding the relationship between commands, workflows, agents, and templates.

**Key architectural decision:** The IDE is a thin client over the existing file system. All business logic remains in the markdown files. The IDE parses and displays, but does not transform or interpret beyond what's needed for visualization.

---

## Integration Points

### Existing File System Structure

The IDE reads from these directories:

| Directory | Content Type | IDE Display |
|-----------|--------------|-------------|
| `commands/lpl/*.md` | YAML frontmatter + XML process | Command cards, relationship links |
| `looppool/workflows/*.md` | Orchestration logic | Workflow viewer, agent connections |
| `agents/*.md` | Specialized prompts | Agent cards, tool lists |
| `looppool/templates/*.md` | Output structures | Template reference |
| `looppool/references/*.md` | Deep dives | Reference viewer |
| `.planning/` | Project state | State dashboard |

### File Format Parsing Requirements

**1. YAML Frontmatter (commands and agents)**

```yaml
---
name: lpl:plan-phase
description: Create detailed execution plan
argument-hint: "[phase] [--research]"
agent: lpl-planner
allowed-tools:
  - Read
  - Write
  - Bash
---
```

Parser: [gray-matter](https://github.com/jonschlinkert/gray-matter) — battle-tested, used by Gatsby, Astro, VitePress, and 30+ major projects.

**2. @ Reference Syntax**

```markdown
<execution_context>
@~/.claude/looppool/references/ui-brand.md
@~/.claude/looppool/references/decision-policies.md
</execution_context>
```

Pattern: `@` followed by path (relative or with `~/.claude/` prefix)
- Extract with regex: `/@([~\w\/./-]+\.md)/g`
- Resolve `~/.claude/` to looppool installation directory
- Build dependency edges for graph view

**3. XML Tags (semantic structure)**

Commands use semantic XML tags:
- `<objective>` — what the command does
- `<execution_context>` — @ references to load
- `<context>` — runtime context
- `<process>` — step-by-step execution
- `<success_criteria>` — completion conditions

Parser: Simple regex extraction or lightweight XML parser (DOMParser works for well-formed fragments).

**4. Planning State Files**

| File | Format | IDE Use |
|------|--------|---------|
| `.planning/STATE.md` | Markdown with structured sections | State panel current position |
| `.planning/ROADMAP.md` | Markdown with phase headers | Phase progress display |
| `.planning/config.json` | JSON | IDE settings sync |
| `.planning/phases/*-PLAN.md` | YAML frontmatter + XML tasks | Task completion tracking |

---

## New Components

### Frontend Components

```
ide/
├── src/
│   ├── components/
│   │   ├── FileTree/              # Left sidebar file browser
│   │   │   ├── FileTree.tsx       # Recursive tree component
│   │   │   ├── FileNode.tsx       # Individual file/folder node
│   │   │   └── useFileTree.ts     # Tree state management
│   │   │
│   │   ├── Editor/                # Main content area
│   │   │   ├── MarkdownEditor.tsx # CodeMirror wrapper
│   │   │   ├── FrontmatterCard.tsx # Parsed YAML display
│   │   │   └── useAutoSave.ts     # Debounced save hook
│   │   │
│   │   ├── CommandViewer/         # Command-specific display
│   │   │   ├── CommandCard.tsx    # Frontmatter visualization
│   │   │   ├── RelationshipLinks.tsx # Workflow/agent links
│   │   │   └── ToolBadges.tsx     # allowed-tools display
│   │   │
│   │   ├── GraphView/             # Relationship visualization
│   │   │   ├── GraphCanvas.tsx    # Cytoscape wrapper
│   │   │   ├── useGraphData.ts    # Build graph from files
│   │   │   └── layouts.ts         # Hierarchical layout config
│   │   │
│   │   ├── StatePanel/            # Planning state dashboard
│   │   │   ├── StatePanel.tsx     # Main dashboard
│   │   │   ├── PhaseProgress.tsx  # Roadmap visualization
│   │   │   └── TaskList.tsx       # Current plan tasks
│   │   │
│   │   └── Layout/                # App shell
│   │       ├── Header.tsx         # Top bar
│   │       ├── Sidebar.tsx        # Left panel container
│   │       └── MainPanel.tsx      # Right panel container
│   │
│   ├── lib/
│   │   ├── parser/
│   │   │   ├── frontmatter.ts     # gray-matter wrapper
│   │   │   ├── references.ts      # @ syntax extractor
│   │   │   └── xmlTags.ts         # XML section parser
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts          # API client
│   │   │   └── websocket.ts       # File change subscription
│   │   │
│   │   └── graph/
│   │       ├── buildGraph.ts      # Convert files to graph data
│   │       └── relationships.ts   # Extract component relationships
│   │
│   ├── hooks/
│   │   ├── useFile.ts             # Single file read/write
│   │   ├── useFileWatcher.ts      # WebSocket subscription
│   │   └── useProjectState.ts     # .planning/ state reader
│   │
│   └── App.tsx                    # Root component
│
├── index.html
└── vite.config.ts
```

### Backend Components

```
ide/
├── server/
│   ├── index.ts                   # Express server entry
│   ├── routes/
│   │   ├── tree.ts                # GET /api/tree
│   │   ├── file.ts                # GET/PUT /api/file
│   │   └── state.ts               # GET /api/state
│   │
│   ├── watcher/
│   │   ├── index.ts               # chokidar setup
│   │   └── websocket.ts           # WebSocket server
│   │
│   └── security/
│       └── pathValidator.ts       # Prevent directory traversal
│
└── package.json
```

---

## Data Flow

### 1. File Tree Loading

```
Browser                    Server                     File System
   │                          │                           │
   │──GET /api/tree──────────>│                           │
   │                          │──fs.readdir (recursive)───>│
   │                          │<──directory contents───────│
   │<──JSON tree structure────│                           │
   │                          │                           │
   │  Parse: filter to        │                           │
   │  commands/, looppool/,   │                           │
   │  agents/, .planning/     │                           │
```

### 2. File Edit Flow

```
User types in editor
       │
       v
Debounce (2 seconds)
       │
       v
PUT /api/file?path=...
       │
       v
Server writes to disk
       │
       v
chokidar detects change
       │
       v
WebSocket broadcast to all clients
       │
       v
Other tabs/windows update
```

### 3. Graph Building Flow

```
On app load or file change:

1. Fetch all files in commands/, looppool/, agents/
2. Parse each file:
   - Extract frontmatter (name, agent, allowed-tools)
   - Extract @ references
   - Extract XML sections
3. Build nodes:
   - Commands (type: "command", from frontmatter.name)
   - Workflows (type: "workflow", from filename)
   - Agents (type: "agent", from frontmatter.name or filename)
   - Templates (type: "template", from filename)
4. Build edges:
   - command -> workflow (from @execution_context references)
   - command -> agent (from frontmatter.agent)
   - workflow -> agent (from Task() calls mentioning agent names)
   - agent -> template (from @ references)
5. Apply hierarchical layout (top to bottom):
   Commands -> Workflows -> Agents -> Templates
```

### 4. State Panel Flow

```
On app load:

1. GET /api/state
2. Server reads:
   - .planning/STATE.md (current position)
   - .planning/ROADMAP.md (phase list)
   - .planning/phases/*-PLAN.md (task status)
3. Parse and aggregate:
   - Current phase
   - Completed phases
   - Task completion per phase
4. Display dashboard
5. Subscribe to .planning/ changes via WebSocket
```

---

## Component Relationships

### Existing GSD Layer Hierarchy

```
User via Claude CLI
       │
       v
Commands (commands/lpl/*.md)
   │ delegate via @references
   v
Workflows (looppool/workflows/*.md)
   │ spawn via Task()
   v
Agents (agents/*.md)
   │ use
   v
Templates + References (looppool/templates/, looppool/references/)
```

### New IDE Layer (Parallel, Not Replacing)

```
User via Browser
       │
       v
IDE Frontend (React + CodeMirror)
   │ API calls
   v
IDE Server (Express + chokidar)
   │ file operations
   v
Same File System (commands/, looppool/, agents/, .planning/)
       ^
       │ also used by
Claude CLI (existing workflow)
```

**The IDE and CLI operate on the same files.** Changes in CLI appear in IDE (via file watcher). Changes in IDE appear to CLI (files are the source of truth).

---

## Technology Recommendations

### Editor: CodeMirror 6

**Why CodeMirror over Monaco:**

| Factor | CodeMirror 6 | Monaco |
|--------|--------------|--------|
| Bundle size | ~300KB (modular) | 2.4-5MB |
| Mobile support | Excellent | Poor |
| Customization | Highly modular | VS Code-like but rigid |
| Documentation | Excellent guides | Sparse |
| Load speed | Fast | Slower |

Spec requirement: "Interface loads in under 1 second" — CodeMirror's smaller bundle supports this.

**CodeMirror extensions needed:**
- `@codemirror/lang-markdown` — Markdown syntax
- `@codemirror/lang-yaml` — YAML in frontmatter
- `@codemirror/lang-xml` — XML tags in commands
- `@codemirror/view` — Line numbers, basic view

### File Tree: react-complex-tree or Custom

**Option A: react-complex-tree**
- Keyboard navigation (search by typing)
- Rename with F2
- Drag-and-drop (if needed later)
- Accessibility built-in

**Option B: Custom recursive component**
- Simpler, no dependencies
- ~100 lines of code
- Good enough for read-heavy use case

**Recommendation:** Start with custom component. Add react-complex-tree if drag-and-drop or advanced features needed.

### Graph View: Cytoscape.js

**Why Cytoscape:**
- Hierarchical layouts (dagre) built-in
- Excellent performance with 50+ nodes
- Good React integration patterns
- Interactive (zoom, pan, click)

**Layout configuration:**
```typescript
const layout = {
  name: 'dagre',
  rankDir: 'TB', // top to bottom
  nodeSep: 50,
  rankSep: 100,
  align: 'UL'
};
```

### Backend: Express + chokidar

**Minimal dependencies (aligns with GSD philosophy):**
- `express` — HTTP server
- `chokidar` — File watching (used by 30M repos)
- `ws` — WebSocket server
- `gray-matter` — Frontmatter parsing (server-side for validation)

### Frontend: React + Vite

**Why Vite:**
- Fast dev server (spec: "loads in under 1 second")
- Built-in TypeScript support
- Tree-shaking for production
- Simple configuration

---

## Security Considerations

### Path Traversal Prevention

```typescript
// server/security/pathValidator.ts
const PROJECT_ROOT = process.cwd();

function validatePath(requestedPath: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  return resolved.startsWith(PROJECT_ROOT);
}
```

### Allowed Directories

Only serve files within:
- `commands/`
- `looppool/`
- `agents/`
- `.planning/`

Reject requests to:
- Parent directories (`../`)
- Hidden files (except `.planning/`)
- `node_modules/`
- `.git/`

### Localhost Only

```typescript
app.listen(3456, '127.0.0.1', () => {
  console.log('IDE server running on http://localhost:3456');
});
```

---

## Suggested Build Order

### Phase 1: Core IDE (Foundation)

**Build first — enables all other features:**

1. **Server skeleton**
   - Express server with `/api/tree`, `/api/file`
   - Path validation
   - Serve static frontend

2. **File tree component**
   - Recursive tree display
   - Collapse/expand
   - Click to select file

3. **Editor component**
   - CodeMirror with markdown support
   - Display selected file content
   - Auto-save with debounce

**Deliverable:** Can browse and edit markdown files.

### Phase 2: Command Viewer (Relationships)

**Build second — adds GSD-specific value:**

1. **Frontmatter parser**
   - gray-matter integration
   - Display as structured card above editor

2. **Relationship extraction**
   - Parse @ references
   - Extract agent from frontmatter
   - Show as clickable links

**Deliverable:** Command files show metadata card with links to related files.

### Phase 3: Graph View (Visualization)

**Build third — requires relationship data from Phase 2:**

1. **Graph data builder**
   - Scan all files
   - Extract nodes and edges
   - Memoize for performance

2. **Cytoscape integration**
   - Hierarchical layout
   - Node coloring by type
   - Click to navigate

**Deliverable:** Visual graph of command/workflow/agent/template relationships.

### Phase 4: State Panel (Planning Dashboard)

**Build fourth — independent feature, lower priority:**

1. **State file readers**
   - Parse STATE.md
   - Parse ROADMAP.md
   - Parse PLAN.md files

2. **Dashboard display**
   - Current phase indicator
   - Phase completion progress
   - Task checklist

**Deliverable:** Dashboard showing project planning state.

### Phase 5: Real-time Updates (Polish)

**Build last — enhances existing features:**

1. **File watcher**
   - chokidar setup
   - WebSocket server

2. **Client subscription**
   - WebSocket client
   - Update UI on file change

**Deliverable:** Changes from CLI appear in IDE automatically.

---

## Integration with Existing Architecture

### No Changes to Existing Files

The IDE does NOT require changes to:
- Command format
- Workflow format
- Agent format
- Template format
- Planning file format

The IDE reads what already exists.

### New Files Added

```
ide/                         # New directory at project root
├── src/                     # Frontend source
├── server/                  # Backend source
├── package.json             # IDE dependencies (separate from main)
└── vite.config.ts           # Build configuration

scripts/
└── ide.js                   # Start script (or package.json script)
```

### Startup Integration

Option A: Separate package.json script
```json
{
  "scripts": {
    "ide": "node ide/server/index.js"
  }
}
```

Option B: Shell script
```bash
#!/bin/bash
# ide.sh
cd "$(dirname "$0")/ide"
node server/index.js
```

---

## Anti-Patterns to Avoid

### 1. Transforming Business Logic

**Bad:** IDE interprets command logic, runs validation, executes tasks
**Good:** IDE displays files, CLI executes

### 2. Caching File Content

**Bad:** IDE maintains in-memory file cache, gets out of sync
**Good:** Always read from disk, trust file system as source of truth

### 3. Complex State Management

**Bad:** Redux store mirroring entire file system
**Good:** React Query or SWR for API calls, local state for UI

### 4. Heavy Initial Load

**Bad:** Load and parse all files on startup
**Good:** Lazy load files on demand, build graph incrementally

---

## Sources

### HIGH Confidence (Authoritative)

- [Cytoscape.js Documentation](https://js.cytoscape.org/) — Graph visualization API
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) — Frontmatter parser
- [chokidar GitHub](https://github.com/paulmillr/chokidar) — File watching library

### MEDIUM Confidence (Multi-Source Verified)

- [CodeMirror vs Monaco Comparison - PARA Garden](https://agenthicks.com/research/codemirror-vs-monaco-editor-comparison) — Editor comparison
- [Sourcegraph: Migrating from Monaco to CodeMirror](https://sourcegraph.com/blog/migrating-monaco-codemirror) — Real-world bundle size data
- [Replit Code Editors Comparison](https://blog.replit.com/code-editors) — Performance and mobile analysis
- [react-complex-tree GitHub](https://github.com/lukasbach/react-complex-tree) — File tree component

### Supporting Research

- [React Architecture Patterns - GeeksforGeeks](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/)
- [Cambridge Intelligence: React Graph Visualization](https://cambridge-intelligence.com/react-graph-visualization-library/)
- [npm-compare: Visualization Libraries](https://npm-compare.com/chart.js,cytoscape,d3,d3-hierarchy,react-d3-tree,react-vis,vis-network)

---

*Architecture research: 2026-01-30*
