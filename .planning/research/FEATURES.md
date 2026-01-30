# Feature Landscape: Web-Based IDE for Meta-Prompting

**Domain:** Web-based IDE for GSD meta-prompting system
**Researched:** 2026-01-30
**Overall Confidence:** HIGH (core IDE features), MEDIUM (meta-prompting specific differentiators)

## Context

GSD/LPL is a meta-prompting system for Claude Code. The IDE needs to help users:
- Browse and edit command/workflow/agent markdown files
- Understand relationships between components (Commands -> Workflows -> Agents -> Templates)
- Track project state and progress through .planning/ directory

This research focuses on features for the web IDE milestone, categorizing what is table stakes vs differentiating for this specific domain.

---

## Table Stakes

Features users expect from any web-based code/markdown editor. Missing these creates friction.

### File Navigation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **File tree with expand/collapse** | Standard IDE pattern (VS Code, JetBrains) | Low | Use hierarchical tree with folder/document icons |
| **Click to open file** | Universal expectation | Low | Single click opens in editor |
| **Visual unsaved indicator** | Users expect to know when changes exist | Low | Dot or asterisk in tab/tree |
| **Keyboard navigation in tree** | Power users expect arrow keys | Medium | Up/down/enter/escape |

### Editor Core

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Syntax highlighting** | Every modern editor has this | Low | Monaco or CodeMirror handles it |
| **Line numbers** | Standard code editor feature | Low | Built into editor libraries |
| **Auto-save with debounce** | Modern expectation (2s delay standard) | Low | Prevents data loss |
| **Undo/redo** | Fundamental editing capability | Low | Built into editor libraries |
| **Find in file (Ctrl/Cmd+F)** | Universal keyboard shortcut | Low | Built into editor libraries |
| **Scroll sync with preview** | Expected for markdown editors | Medium | StackEdit pattern |

### YAML Frontmatter Support

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Parse and display frontmatter** | Command files have YAML headers | Medium | gray-matter or similar parser |
| **Syntax highlighting in YAML** | Part of markdown+frontmatter format | Low | Editor mode configuration |

### Real-Time Updates

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **File watcher with WebSocket/SSE** | External changes should reflect immediately | Medium | Spec requires <1 second latency |
| **Save status indicator** | User needs feedback on save state | Low | "Saving...", "Saved", "Error" |

### Performance

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **<1 second initial load** | Modern web app expectation | Medium | Spec acceptance criteria |
| **Responsive with 50+ files** | Typical project size | Low | Virtual scrolling if needed |

### Table Stakes Detail

#### File Tree (Low Complexity)

**What:** Hierarchical tree showing commands/, looppool/, agents/ directories.

**Expected Behaviors:**
- Click folder to expand/collapse
- Click file to open in editor
- Icons distinguish folders from files (folder icon, document icon)
- Unsaved files show indicator (asterisk or dot)

**Why Universal:** Every IDE (VS Code, JetBrains, Sublime) has this pattern. Users navigate by reflex.

**Implementation Notes:**
- Use consistent icons for every node (Carbon Design System guideline)
- Arrow keys for navigation are expected by power users
- Context menu on right-click is nice-to-have, not required for MVP

#### Auto-Save with Debounce (Low Complexity)

**What:** Automatically save after 2 seconds of inactivity.

**Expected Behaviors:**
- User types -> status shows "Editing"
- User pauses 2+ seconds -> status shows "Saving..."
- Save completes -> status shows "Saved"
- If error -> status shows "Error saving" with retry option

**Why Universal:** Modern editors (Notion, Google Docs, VS Code with auto-save enabled) have trained users to expect this. Manual save feels archaic.

**Implementation Notes:**
- Debounce timeout: 2 seconds (industry standard)
- Show clear visual feedback for each state
- Queue saves if user types during save operation

#### Syntax Highlighting (Low Complexity)

**What:** Markdown and YAML highlighted with distinct colors.

**Expected Highlighting:**
- Markdown headers in bold/different color
- Code blocks with background
- Links underlined
- YAML keys vs values distinguished
- XML tags (common in looppool files) highlighted

**Why Universal:** Every code editor has syntax highlighting. Raw text feels broken.

---

## Differentiators

Features that make this IDE uniquely valuable for meta-prompting workflows. Not expected in general IDEs but provide significant value for GSD users.

### Graph Visualization (Spec: ide-graph-view.md)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Relationship graph** (Commands, Workflows, Agents, Templates) | Visual understanding of system architecture | High | d3-force or cytoscape.js |
| **Click node to navigate** | Rapid codebase exploration | Medium | Bidirectional: graph <-> editor |
| **Filter by component type** | Focus on specific layer | Medium | Toggle visibility per type |
| **Hierarchical layout** | Shows system structure at a glance | Medium | Commands -> Workflows -> Agents -> Templates |

**Why This Differentiates:** Meta-prompting systems have complex relationships. VS Code cannot show "which agents does this command spawn?" visually. This is the killer feature for understanding a looppool-cc codebase.

#### Graph View Detail

**What:** Interactive visualization showing how components connect.

**Node Types:**
- Commands (blue) - Entry points
- Workflows (green) - Orchestration logic
- Agents (orange) - Specialized prompts
- Templates (gray) - Output structures

**Edge Types:**
- Command delegates to Workflow
- Workflow spawns Agent
- Agent uses Template

**Interactions:**
- Click node -> Highlight connections + scroll to file in tree
- Double-click node -> Open file in editor
- Zoom/pan for large graphs
- Filter buttons to show/hide component types

**Why Differentiated:** No existing tool visualizes prompt engineering workflows this way. This makes the invisible visible.

### State Panel (Spec: ide-state-panel.md)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Current milestone/phase display** | Know where you are in project | Low | Read from .planning/STATE.json |
| **Task progress visualization** | Track completion status | Medium | Progress bars from PLAN.md |
| **Roadmap view with phase status** | See full project trajectory | Medium | Parse ROADMAP.md |
| **"Resume work" quick action** | Jump to CONTINUE_HERE.md | Low | Single click to context |

**Why This Differentiates:** No general IDE shows project planning state. This turns the IDE into a project management view integrated with the code.

#### State Panel Detail

**What:** Dashboard showing current project state from .planning/ directory.

**Displays:**
- Current milestone name and phase
- Task completion percentage (e.g., "3/5 tasks complete")
- Phase progress bar
- Link to CONTINUE_HERE.md if exists

**Actions:**
- Click phase -> Navigate to PLAN.md for that phase
- Click "Resume" -> Open CONTINUE_HERE.md
- Click "Decisions" -> Open DECISIONS.md

**Why Differentiated:** GSD projects have structured state in .planning/. Surfacing this in the IDE removes cognitive load of navigating planning files manually.

### Command Viewer (Spec: ide-command-viewer.md)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Structured frontmatter card** | See command metadata at a glance | Medium | Parse YAML, render card |
| **Copy command button** | Quick `/lpl:command-name` copy | Low | Clipboard API |
| **Related workflows/agents links** | Navigate the delegation chain | Medium | Parse file references |
| **Visual badges for allowed-tools** | Understand command capabilities | Low | Badge components |

**Why This Differentiates:** Commands are the entry points to the system. Structured view beats raw markdown for discoverability and usability.

#### Command Viewer Detail

**What:** When viewing a command file, show structured card alongside raw markdown.

**Card Contents:**
- Command name (large, prominent)
- Description
- Argument hint
- Allowed tools (as badges)
- Link to workflow it delegates to
- List of agents it can spawn

**Actions:**
- "Copy Command" button -> `/lpl:command-name` to clipboard
- Click workflow link -> Navigate to workflow file
- Click agent link -> Navigate to agent file

**Why Differentiated:** Command files are densely packed with metadata. A card view makes this instantly scannable.

### Meta-Prompting Specific

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Prompt template variable highlighting** | See `{placeholders}` distinctly | Low | Custom syntax highlighting |
| **XML tag folding** | Collapse `<objective>`, `<process>` sections | Medium | Editor fold configuration |
| **Cross-file link validation** | Warn if referenced workflow/agent missing | High | Requires parsing all files |

---

## Anti-Features

Features that seem good but would add complexity without proportional value, or would harm the user experience.

### Over-Engineered Editor Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full VS Code extension support** | Massive complexity, feature bloat | Focus on markdown/YAML editing only |
| **Multi-file tabs** | Adds UI complexity, cognitive load | Single file open at a time (use tree to switch) |
| **Split editor views** | Scope creep for v1 | Single pane is sufficient for this use case |
| **Git integration** | Out of scope, CLI handles this | User runs git in terminal |
| **Terminal panel** | Complexity explosion | User has terminal open anyway |

### Heavy IDE Patterns

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Language Server Protocol (LSP)** | Overkill for markdown files | Simple syntax highlighting suffices |
| **IntelliSense/autocomplete** | Not needed for markdown prose | Focus on clean editing |
| **Debugging support** | No code to debug | N/A |
| **Build system integration** | Not a build tool | N/A |

### Premature Optimization

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Offline-first PWA** | Adds complexity, unclear value | Online-only is fine for local dev tool |
| **Complex caching strategies** | YAGNI for local file system | Simple file read/write |
| **Microservice architecture** | Single user, local tool | Single Node.js server |

### Gold Plating

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Customizable themes** | Nice-to-have, not core value | Ship one good dark theme |
| **Plugin system** | Maintenance burden, complexity | Build core features well |
| **Collaborative editing** | Single user tool | N/A |
| **AI assistant integration** | Out of scope (Claude Code is the assistant) | Focus on visualization |
| **Cloud sync** | Local-first tool | Files on disk |
| **Mobile-responsive design** | Desktop tool for developers | Desktop-first is fine |

### Anti-Feature Detail

#### Multi-File Tabs (Avoid)

**The Trap:** "Every IDE has tabs, we should too."

**Problems:**
- Tabs add UI complexity (close buttons, overflow handling, reordering)
- Users accumulate many tabs, lose track of what's open
- Increases state management complexity
- File tree already provides navigation

**Instead:** Single file view. Click file in tree to switch. Previous file saves automatically. Simple mental model.

#### Git Integration (Avoid)

**The Trap:** "Users need to commit from the IDE."

**Problems:**
- Git UX is complex (staging, conflicts, branches)
- Claude Code already handles git operations
- Users have terminal open alongside IDE
- Adds significant development scope

**Instead:** User runs git commands in terminal. IDE focuses on editing and visualization.

#### Full Monaco/IntelliSense (Avoid)

**The Trap:** "Monaco gives us VS Code features for free."

**Problems:**
- Monaco is 5-10MB uncompressed (vs 300KB for CodeMirror core)
- IntelliSense is wasted on markdown prose
- Slower initial load (violates <1 second requirement)
- TypeScript services unnecessary

**Instead:** Use CodeMirror 6. Lighter, faster, sufficient for markdown with syntax highlighting.

---

## Feature Dependencies

```
File Tree (core)
    |
    v
Editor Panel (core) ---------> Markdown Syntax Highlighting
    |                                    |
    v                                    v
Auto-Save -----------------> Save Status Indicator
    |
    v
File Watcher --------------> WebSocket Updates --> Real-time Sync

YAML Frontmatter Parsing
    |
    +---> Command Viewer Card
    |
    +---> Graph View (edge extraction from frontmatter)

Graph View
    |
    +---> Requires: All files parsed for relationships
    |
    +---> Node click --> Editor navigation

State Panel
    |
    +---> Requires: .planning/ directory structure
    |
    +---> Reads: STATE.json, ROADMAP.md, PLAN.md files
```

### Build Order Recommendation

1. **Phase 1: Core Editor** - File tree + editor + auto-save (foundation)
2. **Phase 2: Real-time Updates** - File watcher + WebSocket (spec requirement)
3. **Phase 3: Command Viewer** - YAML parsing + structured display (domain value)
4. **Phase 4: State Panel** - Planning file parsing + progress display (domain value)
5. **Phase 5: Graph View** - Relationship extraction + visualization (highest complexity, highest differentiation)

**Rationale:**
- Core editor must work before anything else
- Real-time updates are spec requirement (<1 second file change reflection)
- Command viewer is low-complexity differentiator, good early win
- State panel depends on .planning/ structure being stable
- Graph view is highest value but also highest complexity, save for last

---

## MVP Recommendation

For MVP, prioritize:

1. **File tree with navigation** (table stakes)
2. **Markdown editor with syntax highlighting** (table stakes)
3. **Auto-save with status indicator** (table stakes)
4. **File watcher with WebSocket updates** (spec requirement: <1 second)
5. **YAML frontmatter card for commands** (first differentiator, low complexity)

Defer to post-MVP:
- **Graph view** - High complexity, requires all relationship parsing
- **State panel** - Depends on .planning/ structure being stable
- **Cross-file validation** - Nice-to-have, not critical for initial value

**MVP Acceptance Criteria (from specs):**
- [ ] Interface loads <1 second
- [ ] Can browse file tree
- [ ] Can edit markdown files
- [ ] Changes persist to disk
- [ ] File changes reflected in <1 second

---

## Technology Recommendations

Based on research, for this use case:

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **Editor** | CodeMirror 6 | Smaller bundle (300KB vs 5MB Monaco), better mobile support, sufficient for markdown |
| **Graph** | cytoscape.js or d3-force | Lightweight, SVG-based, good for 50+ nodes |
| **Server** | Express + chokidar | Minimal deps, mature file watching |
| **Frontend** | Vanilla JS or Preact | Keep bundle small, <1 second load |
| **YAML Parser** | gray-matter | Standard for frontmatter extraction |

### Why CodeMirror over Monaco

Monaco is overkill for this use case:
- **Bundle size:** Monaco is 5-10MB uncompressed; CodeMirror 6 core is ~300KB
- **Load time:** Sourcegraph saw 43% reduction in JS download by switching from Monaco to CodeMirror
- **Features unused:** IntelliSense, TypeScript services, debugging - none needed for markdown
- **Mobile support:** CodeMirror 6 has superior mobile support; Monaco is "unusable on mobile"
- **Documentation:** CodeMirror has "fantastic documentation"; Monaco has "no official guides"

CodeMirror provides everything needed: syntax highlighting, line numbers, find/replace, undo/redo.

---

## Sources

### IDE/Editor Fundamentals
- [Monaco Editor - GitHub](https://github.com/microsoft/monaco-editor)
- [CodeMirror vs Monaco Comparison - PARA Garden](https://agenthicks.com/research/codemirror-vs-monaco-editor-comparison)
- [Sourcegraph Migration from Monaco to CodeMirror](https://sourcegraph.com/blog/migrating-monaco-codemirror)
- [Replit Code Editor Comparison](https://blog.replit.com/code-editors)
- [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)

### Tree View Patterns
- [Carbon Design System - Tree View](https://carbondesignsystem.com/components/tree-view/usage/)
- [JetBrains IDE Navigation Best Practices](https://blog.jetbrains.com/webide/2013/02/navigating-between-files-in-the-ide-best-practices/)
- [GitHub File Navigation Improvements](https://github.blog/changelog/2025-09-04-improved-file-navigation-and-editing-in-the-web-ui/)

### Graph Visualization
- [Software Dependency Graphs - PuppyGraph](https://www.puppygraph.com/blog/software-dependency-graph)
- [Code Visualization Types - CodeSee](https://www.codesee.io/learning-center/code-visualization)
- [Dependency Graph Best Practices - Tom Sawyer](https://blog.tomsawyer.com/dependency-graph-visualization)

### Markdown Editors
- [StackEdit Features](https://stackedit.io/)
- [Editor.md Capabilities](https://pandao.github.io/editor.md/en.html)

### Anti-Patterns
- [Coding Anti-Patterns - FreeCodeCamp](https://www.freecodecamp.org/news/antipatterns-to-avoid-in-code/)
- [9 Anti-Patterns Programmers Should Know](https://sahandsaba.com/nine-anti-patterns-every-programmer-should-be-aware-of-with-examples.html)

### File Watching
- [Docker Compose Watch - File Sync Patterns](https://docs.docker.com/compose/how-tos/file-watch/)
- [Browsersync Options](https://browsersync.io/docs/options)

### Meta-Prompting Tools (Competitive Landscape)
- [Promptmetheus - Prompt IDE](https://promptmetheus.com/)
- [MetaPrompt Studio](https://metaprompt.pages.dev/)
- [Meta Prompting Guide](https://www.promptingguide.ai/techniques/meta-prompting)

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Table Stakes | HIGH | Universal IDE patterns well-documented, confirmed by spec requirements |
| Differentiators | MEDIUM | Domain-specific value propositions; spec confirms features but real-world validation pending |
| Anti-Features | HIGH | Clear consensus on complexity traps; aligns with "keep minimal" philosophy in specs |
| MVP Scope | HIGH | Directly maps to spec acceptance criteria |
| Technology Recommendations | HIGH | CodeMirror vs Monaco comparison well-documented with concrete numbers |
