# Coding Conventions

**Analysis Date:** 2026-01-26

## Overview

GSD is a meta-prompting system where files are both implementation and specification. The codebase consists primarily of:

- **Markdown command/workflow/agent files** (`commands/gsd/*.md`, `get-shit-done/workflows/*.md`, `agents/*.md`) — Executable prompts with YAML frontmatter
- **JavaScript implementation** (`bin/*.js`, `hooks/*.js`, `scripts/*.js`) — Node.js utilities for installation and hooks
- **No frontend/backend code** — GSD is a system of specifications, not an application

All conventions serve the primary goal: **teaching Claude how to build software consistently**.

## Naming Patterns

### Files

**Commands:**
- Pattern: `kebab-case.md` in `commands/gsd/`
- Example: `gsd:command-name` → `commands/gsd/command-name.md`
- Convention: Single command per file, matches CLI invocation

**Workflows:**
- Pattern: `kebab-case.md` in `get-shit-done/workflows/`
- Example: `execute-phase.md`, `verify-phase.md`
- Convention: Orchestration logic, not executable directly

**Agents:**
- Pattern: `gsd-kebab-case.md` in `agents/`
- Example: `gsd-executor.md`, `gsd-plan-checker.md`
- Convention: Subagents spawned by orchestrators, prefixed with `gsd-`

**JavaScript:**
- Pattern: `kebab-case.js`
- Examples: `build-hooks.js`, `gsd-statusline.js`, `gsd-check-update.js`

### Functions (JavaScript)

- Pattern: `camelCase`
- Examples: `expandTilde()`, `copyWithPathReplacement()`, `buildHookCommand()`
- Convention: Standard Node.js conventions

### Variables (JavaScript)

- Pattern: `camelCase` for variables, `UPPER_SNAKE_CASE` for constants
- Examples:
  - Variables: `claudeDir`, `settingsPath`, `isGlobal`
  - Constants: `HOOKS_DIR`, `DIST_DIR`, `HOOKS_TO_COPY`

### XML Sections (Markdown)

- Pattern: Semantic tags describing purpose, not generic containers
- Examples: `<objective>`, `<role>`, `<task>`, `<process>`, `<step>`, `<verify>`, `<done>`
- Convention: Not `<section>`, `<content>`, `<item>`

## Code Style

### Formatting

**Markdown:**
- Standard markdown with semantic HTML comments for structure
- No tool enforces formatting (no Prettier/ESLint for markdown)
- Consistent indentation (2 spaces) in code blocks

**JavaScript:**
- No linter or formatter enforced
- Follows Node.js standard conventions
- Consistent with existing file style
- Comments for complex logic (see `/Users/narcisbrindusescu/newme/get-shit-done/bin/install.js` examples)

### JSDoc Comments

Function documentation uses block comments with descriptions:

```javascript
/**
 * Expand ~ to home directory (shell doesn't expand in env vars passed to node)
 */
function expandTilde(filePath) {
  // ...
}

/**
 * Get the global config directory for a runtime
 * @param {string} runtime - 'claude' or 'opencode'
 * @param {string|null} explicitDir - Explicit directory from --config-dir flag
 */
function getGlobalDir(runtime, explicitDir = null) {
  // ...
}
```

Pattern: One-line summary, then detailed explanation if needed. Parameters documented with type and purpose.

## Markdown Structure

### Command Files (`commands/gsd/*.md`)

**Frontmatter:**
```yaml
---
name: gsd:command-name
description: One-line description
argument-hint: "<required>" or "[optional]"
allowed-tools: [Read, Write, Bash, Glob, Grep, AskUserQuestion]
---
```

**Sections (in order):**
1. `<objective>` — What the command does
2. `<execution_context>` — External file references (optional)
3. `<context>` — Setup/environment
4. `<process>` — Numbered steps or detailed process
5. `<success_criteria>` — How to verify completion

Example: `/Users/narcisbrindusescu/newme/get-shit-done/commands/gsd/settings.md`

### Agent Files (`agents/*.md`)

**Frontmatter:**
```yaml
---
name: gsd-agent-name
description: One-line description
tools: Read, Write, Bash, Grep, Glob, WebSearch
color: cyan
---
```

**Sections (in order):**
1. `<role>` — Agent identity and responsibilities
2. `<core_principle>` — Critical mindset or methodology
3. `<philosophy>` — Design rationale (if complex)
4. `<inputs>` / `<outputs>` — Data contract
5. Implementation-specific sections (varies by agent)

Example: `/Users/narcisbrindusescu/newme/get-shit-done/agents/gsd-executor.md`

### Workflow Files (`get-shit-done/workflows/*.md`)

**No frontmatter** — Workflows are internal, not commands

**Sections:**
1. `<purpose>` — What this workflow does
2. `<core_principle>` — Key insight
3. `<required_reading>` — Files to load first
4. `<process>` — Numbered steps with `<step>` tags

Example: `/Users/narcisbrindusescu/newme/get-shit-done/get-shit-done/workflows/execute-phase.md`

## Import Organization

### JavaScript

**Node.js modules before local code:**
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
```

**No path aliases** — Standard relative paths used throughout

**Lazy loading for expensive operations:**
- JSON parsing deferred until needed
- File reads in functions, not at module level
- Subprocess spawning in callbacks

### Markdown

**External file references use `@` notation:**
```
@.planning/STATE.md
@~/.claude/get-shit-done/workflows/list-phase-assumptions.md
```

**Execution context sections load dependency files:**
```
<execution_context>
@~/.claude/get-shit-done/workflows/verify-phase.md
</execution_context>
```

## Error Handling

### JavaScript

**Pattern: Early returns with console output**

```javascript
if (!fs.existsSync(src)) {
  console.warn(`Warning: ${hook} not found, skipping`);
  continue;
}

if (!fs.existsSync(settingsPath)) {
  return {}; // Return empty object, let caller handle
}

if (!value) {
  console.error(`  ${yellow}--config-dir requires a non-empty path${reset}`);
  process.exit(1);
}
```

**Convention:**
- Warnings printed to console (non-fatal)
- Errors printed to console + exit (fatal)
- Silent failures where appropriate (e.g., JSON parse in hooks — don't break statusline)
- Try/catch blocks used sparingly, fail-safe defaults preferred

### Markdown

**Pattern: Explicit error branches in process steps**

```
**If file exists:** Parse and use.

**If file missing but .planning/ exists:**
Option 1: Reconstruct from artifacts
Option 2: Continue without state

**If .planning/ doesn't exist:** Error - project not initialized.
```

**Convention:** Decision trees, not exception handling. Process explicitly handles "happy path" and common failure cases.

## Logging

### JavaScript

**Style: Colored output with semantic markers**

```javascript
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';

console.log(`  ${cyan}Verbose info${reset} — key details`);
console.log(`  ${green}✓${reset} Success message`);
console.log(`  ${yellow}⚠${reset} Warning or prompt`);
console.log(`  ${yellow}✗${reset} Failure message`);
```

**Convention:** Indentation (2 spaces), status markers (`✓`, `⚠`, `✗`), color for semantic grouping

**When to log:**
- Install/uninstall operations (progress tracking)
- Config changes (confirmation)
- Warnings and errors (always)
- Debug: Disabled by default (no verbose flag)

### Markdown

**Pattern: No logging directives in prompts**

GSD commands don't mandate logging. Agents and executors output to console naturally as they work.

## Comments

### When to Comment

**JavaScript:**

- Explain WHY, not WHAT: "Spawn background process to avoid blocking UI" not "Start child process"
- Document non-obvious behavior: "shell doesn't expand ~ in env vars passed to node"
- Explain regexes and path manipulations: Complex patterns get block comments
- Mark version-specific code: "Removed in v1.6.x", "Windows path handling"

**Markdown:**

- Minimal comments in prompts (files are self-documenting)
- Use semantic headers instead of section comments
- Inline code examples over prose explanation

## Function Design

### Size Guidelines

**JavaScript:**
- Target: 20-50 lines per function
- Max: 100 lines (refactor if larger)
- Examples: `install()` is 200 lines (orchestrator), `expandTilde()` is 5 lines (utility)

**Pattern:** Orchestrator functions longer (20-50 tasks), utility functions shorter (1-10)

### Parameters

**Convention: Few parameters, accept objects for config**

```javascript
// Bad
function installAllRuntimes(runtimes, isGlobal, isInteractive) { }

// Good (shown in code)
function install(isGlobal, runtime = 'claude') { }

// Complex case: pass result object
const result = install(isGlobal, runtime);
const { settingsPath, settings, statuslineCommand, runtime } = result;
```

**Pattern:** Required parameters positional, optional parameters as object or default values

### Return Values

**Conventions:**
- Functions return meaningful values (not always void)
- Configuration functions return updated object: `{ settingsPath, settings, ... }`
- Verification functions return boolean or object with details
- Void functions used for side effects (file writes, console output)

## Module Design

### File Organization

**JavaScript:**
- One function per concern
- Helper functions group near usage
- Constants at module top
- Main logic at bottom (matches Node.js convention)

**Markdown:**
- One command/agent/workflow per file
- Frontmatter at top
- Role/philosophy before implementation
- Implementation sections in execution order

### Exports

**JavaScript:**
- No formal exports in scripts (scripts are executable, not libraries)
- `bin/install.js` exports nothing (entry point)
- Helper functions are file-scoped, called sequentially

**Markdown:**
- Files are self-contained prompts
- External references use `@` notation
- No "importing" between files — orchestrators call agents

### Barrel Files

**Not used** — No index files or re-exports

GSD is primarily markdown prompts. Files are discoverable by directory structure, not through central imports.

## Special Patterns

### YAML Frontmatter in Markdown

**Command files only:**
```yaml
---
name: gsd:command-name
description: One-line purpose
argument-hint: "<required>" or "[optional]"
allowed-tools: [Tool1, Tool2, Tool3]
---
```

**Agent files only:**
```yaml
---
name: gsd-agent-name
description: One-line purpose
tools: Read, Write, Bash
color: cyan
---
```

**Never:**
- YAML frontmatter in workflows
- Multiple commands per file
- Complex nested YAML (keep it simple)

### Path References

**In markdown files, use `~` shortcuts:**
- `~/.claude/` → Claude Code config directory
- `~/.config/opencode/` → OpenCode config directory
- `./.claude/` → Local project install
- `@~/.claude/get-shit-done/workflows/` → File reference syntax

**In JavaScript, use `path` module:**
```javascript
const claudeDir = path.join(os.homedir(), '.claude');
const configPath = path.join(claudeDir, 'settings.json');
```

**Rationale:** Markdown communicates to users/Claude, JS runs in Node.js where path module is safer

### Async Patterns

**Minimal async in main code:**
- `install.js` uses synchronous file operations (intentional — keep installer simple)
- Hooks use background spawning: `spawn()` with `stdio: 'ignore'` and `.unref()`

**Pattern:** Fire-and-forget for non-critical tasks (update checks)

```javascript
const child = spawn(process.execPath, ['-e', `...`], {
  stdio: 'ignore',
  windowsHide: true
});
child.unref();
```

## Cross-Cutting Patterns

### Validation

**Pattern: Fail fast with clear error messages**

```javascript
if (configDirIndex !== -1) {
  const nextArg = args[configDirIndex + 1];
  if (!nextArg || nextArg.startsWith('-')) {
    console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
    process.exit(1);
  }
}
```

**Convention:** User-facing errors printed to console with color. Validation early in functions.

### Configuration

**Pattern: Config files as JSON**

- `.planning/config.json` — GSD workflow settings
- `settings.json` — Claude Code/OpenCode settings
- `package.json` — NPM metadata

**Convention:** Config read once, updated with `JSON.stringify()` and written back

### State Management

**Pattern: State files track progress across contexts**

- `.planning/STATE.md` — Project position and decisions
- `.planning/debug/*.md` — Debug session state
- `.planning/phases/*/SUMMARY.md` — Completed plans

**Convention:** State files written by agents, read by orchestrators. State drives decisions.

---

*Conventions analysis: 2026-01-26*
