# LPL IDE - Product Requirements Document

A minimalist web-based IDE for managing the looppool-cc meta-prompting system.

---

## Project Setup

- [x] Create src/server/ directory structure
- [x] Create src/frontend/ directory structure
- [x] Add "ide" script to package.json: `node src/server/index.js`
- [ ] Configure esbuild for frontend bundling (if needed)

## Priority 1: Core Server Infrastructure

- [x] Create src/server/index.js with native http module (zero deps, no Express)
- [x] Implement localhost-only binding (127.0.0.1:3456)
- [x] Add path validation middleware using resolve() + startsWith() to prevent traversal
- [x] Implement GET /api/tree endpoint returning JSON for commands/, looppool/, agents/, specs/
- [x] Implement GET /api/file?path=... endpoint with streaming for large files
- [x] Implement PUT /api/file?path=... endpoint with atomic writes (temp file + rename)
- [x] Implement GET /api/state endpoint reading .planning/current-state.md
- [x] Set up SSE endpoint /api/events for real-time file change notifications
- [x] Implement fs.watch with 100ms debouncing and path filtering
- [x] Add static file serving with correct MIME types (html, css, js, svg)
- [x] Add browser auto-launch using platform-specific commands (open/xdg-open/start)
- [x] Add --port CLI argument for configurable port
- [x] Add --root CLI argument for configurable project root
- [x] Add --no-open flag to skip browser auto-launch
- [x] Implement rate limiting for API endpoints
- [x] Add Content Security Policy headers

## Priority 2: Frontend Foundation

- [x] Create src/frontend/index.html with semantic HTML5 structure
- [x] Implement CSS Grid layout: 250px sidebar, auto main panel, 40px top bar
- [x] Build collapsible file tree component
- [x] Implement virtual scrolling for 100+ files in file tree
- [x] Add collapse/expand directory toggle with icons
- [x] Add click-to-open file behavior
- [x] Add visual indicator (dot) for unsaved changes
- [x] Add file type icons using CSS classes
- [x] Create keyboard navigation for file tree (arrow keys, Enter to open)
- [x] Add project name display in top bar
- [x] Add connection status indicator (connected/reconnecting/disconnected)
- [x] Implement EventSource client for SSE with automatic reconnection
- [x] Add exponential backoff for reconnection attempts
- [ ] Queue operations during disconnection for retry

## Priority 3: Markdown Editor

- [x] Create editor component with native textarea (zero deps, no CodeMirror)
- [x] Implement line numbers with synchronized scrolling
- [x] Add Tab key inserts 2 spaces behavior
- [x] Implement auto-save with 2-second debounce
- [x] Add dirty state tracking with unsaved indicator
- [x] Create save status indicator (saved/unsaved/saving states)
- [x] Implement Cmd/Ctrl+S manual save shortcut
- [x] Add retry logic with exponential backoff for failed saves
- [x] Handle external file change detection via SSE
- [ ] Implement find functionality (Cmd/Ctrl+F)
- [ ] Implement replace functionality with regex support
- [ ] Add syntax highlighting overlay for markdown
- [ ] Add vim keybindings option

## Priority 4: Command Viewer

- [x] Create YAML frontmatter parser for --- delimited blocks (zero deps)
- [x] Support key-value pairs in parser
- [x] Support arrays (inline [a,b,c] and multiline format) in parser
- [x] Handle strings, numbers, booleans, null values in parser
- [x] Handle quoted strings and special characters in parser
- [x] Add graceful error recovery for malformed frontmatter
- [x] Create metadata card UI component
- [x] Display command name and description in card
- [x] Display argument-hint in card
- [x] Display agent name (if specified) in card
- [x] Add color-coded tool badges for allowed-tools
- [ ] Add hover tooltips for tool badges
- [ ] Implement "Copy as /lpl:command" button with Clipboard API
- [ ] Implement "Test in terminal" button with shell escaping
- [ ] Parse file references to identify delegated workflow
- [ ] Create "View workflow" navigation link
- [ ] List spawned agents as clickable links
- [ ] Show templates used as clickable links
- [ ] Build tabbed view: metadata card vs raw content

## Priority 5: State Panel

- [x] Create StatePanel component (src/frontend/state-panel.js)
- [x] Implement GET /api/state endpoint integration
- [x] Add auto-refresh every 5 seconds
- [x] Integrate with SSE for real-time updates
- [x] Add markdown parsing with section detection
- [x] Create progress bar visualization for percentage/fraction patterns
- [x] Build activity list rendering with timestamp support
- [x] Add milestone/task checkbox display
- [x] Implement hierarchical section rendering (h2/h3 levels)
- [x] Add error handling with retry button
- [x] Handle empty state with helpful guidance messages
- [ ] Parse and display PROJECT.md with markdown rendering
- [ ] Extract phase/milestone data from ROADMAP.md using heading parsing
- [ ] Calculate task completion percentage from PLAN.md checkboxes
- [ ] Build circular SVG progress indicators
- [ ] Create collapsible planning document tree
- [ ] Implement "Resume work" button opening CONTINUE_HERE.md
- [ ] Add "View decisions" button linking to DECISIONS.md
- [ ] Add progress summary quick action

## Priority 6: Graph Visualization

- [ ] Create graph data parser extracting relationships from file content
- [ ] Parse command files to identify workflow delegation
- [ ] Parse workflow files to identify agent spawning
- [ ] Parse agent files to identify template usage
- [ ] Implement d3-force or cytoscape.js with hierarchical positioning
- [ ] Configure force simulation: charge -300, link distance by type
- [ ] Style command nodes as blue
- [ ] Style workflow nodes as green
- [ ] Style agent nodes as orange
- [ ] Style template nodes as gray
- [ ] Add node labels with file names
- [ ] Render directional arrow edges
- [ ] Implement zoom behavior (min=0.1, max=4)
- [ ] Implement pan with drag behavior
- [ ] Add click-to-highlight connected nodes and edges
- [ ] Add double-click to open file in editor
- [ ] Add hover for node details tooltip
- [ ] Create type filter checkboxes for node visibility
- [ ] Add search/filter by node name
- [ ] Ensure performant rendering for 50+ nodes
- [ ] Optimize for 100+ nodes
- [ ] Add canvas fallback for 200+ nodes if SVG degrades
- [ ] Implement layout persistence in localStorage

## Priority 7: Polish and Performance

- [ ] Implement request debouncing for file tree operations
- [ ] Add file content caching with ETag validation
- [ ] Create Cmd/Ctrl+P quick open file shortcut
- [ ] Build error boundary components with user-friendly messages
- [ ] Create loading skeletons for async operations
- [ ] Add telemetry-free analytics using localStorage
- [ ] Build settings panel for editor preferences
- [ ] Package as single executable using Node.js SEA

## Priority 8: Accessibility and Error Handling

- [ ] Add ARIA labels for all interactive elements
- [ ] Add ARIA roles for all interactive elements
- [ ] Implement high contrast mode toggle
- [ ] Ensure visible focus indicators on all focusable elements
- [ ] Add screen reader support
- [ ] Create error recovery for corrupted YAML frontmatter
- [ ] Add fallback rendering for invalid markdown files
- [ ] Implement network interruption recovery with queued operations
- [ ] Add file locking mechanism for concurrent edit detection
- [ ] Create conflict resolution UI for simultaneous edits

## Priority 9: Testing Infrastructure

- [ ] Set up Playwright for cross-browser E2E testing
- [ ] Create test: server starts and binds to port
- [ ] Create test: file tree loads all directories
- [ ] Create test: open and edit file with auto-save
- [ ] Create test: path traversal attack blocked
- [ ] Create test: large file (2,379 lines) opens in <50ms
- [ ] Create performance benchmarking suite with thresholds
- [ ] Implement visual regression testing for UI components
- [ ] Add integration tests for all API endpoints
- [ ] Create mock file system for unit testing

## Security Checklist

- [x] All paths validated with resolve() + startsWith()
- [x] Server binds to 127.0.0.1, not 0.0.0.0
- [ ] No eval() or Function() constructor usage verified
- [ ] Content Security Policy headers set
- [ ] All user input escaped in HTML rendering verified
- [ ] File write permissions checked before operations
- [ ] Input validation on all API endpoints verified
- [ ] Rate limiting implemented

## Manual QA Checklist

- [ ] Verify all 426 files appear in file tree
- [ ] Open best-practices.md (2,379 lines) - verify performance
- [ ] Edit file and verify auto-save works
- [ ] Test graph with all nodes visible
- [ ] Verify state panel shows real planning data
- [ ] Verify command viewer parses all frontmatter variations
- [ ] Test keyboard navigation throughout entire UI
- [ ] Test in Chrome 100+
- [ ] Test in Firefox 100+
- [ ] Test in Safari 15+
- [ ] Test atomic writes don't corrupt on simulated crash
- [ ] Verify path traversal attacks are blocked

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial page load | < 500ms |
| File tree render (100 files) | < 100ms |
| File open (350 lines avg) | < 50ms |
| File save | < 100ms |
| Graph render (100 nodes) | < 200ms |
| Full interface load | < 1 second |

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 100+ |
| Firefox | 100+ |
| Safari | 15+ |

---

## Usage

```bash
# Start the IDE
npm run ide

# Or with arguments (future)
npm run ide -- --port 8080 --root /path/to/project
```

## Notes

- Tasks marked [x] are complete
- Zero-dependency philosophy: prefer native APIs over libraries
- Atomic writes: always use temp file + rename pattern
- Security critical: all file paths must be validated
