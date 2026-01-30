# Roadmap: GSD v2.0 IDE

## Milestones

- v1.0 Autonomous Mode (Shipped: 2026-01-27) - Phases 1-6
- v2.0 IDE - Phases 7-11 (in progress)

## Overview

The v2.0 IDE delivers a web-based visual interface for browsing, editing, and understanding GSD meta-prompting files. The build order follows natural dependencies: IDE Server provides the backend API, IDE Core delivers file navigation and editing, Command Viewer adds GSD-specific frontmatter display, State Panel provides project planning visibility, and Graph View visualizes component relationships. Each phase delivers a complete, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (7, 8, 9, 10, 11): Planned v2.0 IDE work
- Decimal phases (e.g., 7.1): Urgent insertions if needed

- [ ] **Phase 7: IDE Server** - Backend API with file operations, security, and real-time updates
- [ ] **Phase 8: IDE Core** - File tree navigation and markdown editor with auto-save
- [ ] **Phase 9: Command Viewer** - YAML frontmatter parsing and GSD-specific display
- [ ] **Phase 10: State Panel** - Planning dashboard for .planning/ files
- [ ] **Phase 11: Graph View** - Interactive visualization of component relationships

## Phase Details

### Phase 7: IDE Server
**Goal**: Backend API serves files securely and pushes real-time updates to frontend
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: SRV-01, SRV-02, SRV-03, SRV-04, SRV-05, SRV-06, SRV-07, SRV-08
**Success Criteria** (what must be TRUE):
  1. Running `npm run ide` starts server and opens browser to localhost:3456
  2. GET /api/tree returns JSON directory tree of commands/, looppool/, agents/
  3. GET /api/file?path=... returns file content for valid paths within allowed directories
  4. PUT /api/file?path=... writes content and returns success for valid paths
  5. Attempts to access paths outside allowed directories (../ attacks) return 403
  6. File changes in watched directories trigger SSE events within 1 second
**Plans:** 2 plans

Plans:
- [ ] 07-01-PLAN.md — Security libs and file operation routes (path validation, tree builder, file API)
- [ ] 07-02-PLAN.md — File watcher, SSE events, server entry point, npm script

### Phase 8: IDE Core
**Goal**: Users can browse file tree and edit markdown files with syntax highlighting
**Depends on**: Phase 7 (IDE Server)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, CORE-08, CORE-09, CORE-10
**Success Criteria** (what must be TRUE):
  1. Left sidebar shows expandable/collapsible file tree of commands/, looppool/, agents/
  2. Clicking a file opens it in the editor panel with markdown syntax highlighting
  3. YAML frontmatter blocks display with distinct syntax highlighting
  4. Editor shows line numbers in left gutter
  5. Editing a file shows "unsaved" indicator; 2 seconds after last keystroke, file auto-saves and indicator clears
  6. Page load completes in under 1 second (measured via Performance API)
  7. Editor works in Chrome, Firefox, and Safari
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Command Viewer
**Goal**: Command files display structured frontmatter card with navigation and quick actions
**Depends on**: Phase 8 (IDE Core)
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06
**Success Criteria** (what must be TRUE):
  1. Opening a command file shows frontmatter card above editor with name, description, argument-hint
  2. Card displays allowed-tools as visual badges
  3. Clicking "Copy command" button copies /lpl:command-name to clipboard
  4. Card shows "View workflow" link that navigates to the referenced workflow file
  5. Related agents extracted from file content appear as clickable links
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

### Phase 10: State Panel
**Goal**: Dashboard shows project planning state with progress tracking and navigation
**Depends on**: Phase 8 (IDE Core)
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04, STATE-05, STATE-06, STATE-07
**Success Criteria** (what must be TRUE):
  1. State panel shows current milestone and phase parsed from STATE.md
  2. Task completion progress displays from current PLAN.md file
  3. Roadmap view shows all phases from ROADMAP.md with visual progress bars
  4. Clicking a phase in roadmap navigates to its plan file
  5. If CONTINUE_HERE.md exists, "Resume work" section displays with link to file
  6. Panel updates automatically when planning files change (via SSE)
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

### Phase 11: Graph View
**Goal**: Interactive visualization shows command/workflow/agent/template relationships
**Depends on**: Phase 9 (Command Viewer - reuses frontmatter parsing)
**Requirements**: GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-05, GRAPH-06, GRAPH-07, GRAPH-08, GRAPH-09, GRAPH-10, GRAPH-11
**Research Flag**: Complex force layout for 100+ nodes, Web Worker integration patterns
**Success Criteria** (what must be TRUE):
  1. Graph renders nodes with distinct colors: blue (commands), green (workflows), orange (agents), gray (templates)
  2. Edges connect nodes showing delegation/spawning relationships extracted from @ references
  3. Clicking or double-clicking a node opens the file in the editor
  4. Mouse wheel zooms, click-drag pans the viewport
  5. Filter controls hide/show nodes by component type
  6. Layout shows hierarchy: commands at top, workflows below, agents below, templates at bottom
  7. Graph remains readable and responsive with 50+ nodes visible
**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD
- [ ] 11-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 -> 8 -> 9 -> 10 -> 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 7. IDE Server | v2.0 | 0/2 | Planned | - |
| 8. IDE Core | v2.0 | 0/3 | Not started | - |
| 9. Command Viewer | v2.0 | 0/2 | Not started | - |
| 10. State Panel | v2.0 | 0/2 | Not started | - |
| 11. Graph View | v2.0 | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-30*
*v2.0 IDE milestone: 42 requirements across 5 phases*
