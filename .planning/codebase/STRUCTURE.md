# Codebase Structure

**Analysis Date:** 2026-01-26

## Directory Layout

```
get-shit-done/
├── bin/                    # Installation and setup
│   └── install.js          # Interactive/CLI installer, handles Claude Code and OpenCode
├── commands/gsd/           # User-facing slash commands (thin wrappers)
│   ├── new-project.md      # Initialize project with questioning → requirements → roadmap
│   ├── map-codebase.md     # Analyze existing codebase, write .planning/codebase/ docs
│   ├── plan-phase.md       # Create phase plans via research → planning → verification loop
│   ├── execute-phase.md    # Run plans in waves with parallel execution
│   ├── verify-work.md      # Verification loop after execution
│   ├── research-phase.md   # Research-only for a phase (dependency pre-work)
│   ├── add-phase.md        # Add unplanned phase mid-project
│   ├── progress.md         # Show project progress summary
│   ├── quick.md            # Quick feature implementation (lightweight flow)
│   ├── debug.md            # Troubleshoot failures and issues
│   ├── help.md             # Command reference and getting started
│   └── (25+ more commands)
├── get-shit-done/          # Core system files
│   ├── workflows/          # Orchestration logic
│   │   ├── map-codebase.md          # Spawn 4 parallel codebase-mapper agents
│   │   ├── execute-phase.md         # Wave-based execution orchestration
│   │   ├── execute-plan.md          # Single plan execution workflow
│   │   ├── verify-phase.md          # Post-execution verification
│   │   ├── discovery-phase.md       # Research workflow for new domains
│   │   ├── diagnose-issues.md       # Troubleshooting workflow
│   │   └── (7 more workflows)
│   ├── references/         # Methodology and decision frameworks
│   │   ├── questioning.md            # Deep questioning protocol for /gsd:new-project
│   │   ├── tdd.md                    # TDD pattern guidance
│   │   ├── ui-brand.md               # UI/UX conventions
│   │   ├── git-integration.md        # Git workflows and strategies
│   │   ├── verification-patterns.md  # Verification loop patterns
│   │   ├── model-profiles.md         # Model selection per task
│   │   ├── planning-config.md        # Configuration schema
│   │   ├── continuation-format.md    # Context continuation between sessions
│   │   └── checkpoints.md            # Checkpoint pattern usage
│   └── templates/          # Output structure templates
│       ├── project.md                # PROJECT.md template
│       ├── roadmap.md                # ROADMAP.md template
│       ├── phase-prompt.md           # Phase discovery template
│       ├── milestone.md              # Milestone checkpoint template
│       ├── state.md                  # STATE.md template (project memory)
│       ├── context.md                # Context continuation template
│       ├── discovery.md              # Research output template
│       ├── requirements.md           # Scoped requirements template
│       ├── research.md               # Phase research template
│       ├── UAT.md                    # User acceptance testing template
│       ├── verification-report.md    # Verification results template
│       ├── codebase/                 # Codebase analysis templates (used by gsd-codebase-mapper)
│       │   └── (templates referenced by STACK.md, ARCHITECTURE.md, etc.)
│       └── (18+ more templates)
├── agents/                 # Specialized subagents with fresh context
│   ├── gsd-codebase-mapper.md       # Maps codebase → writes STACK.md, ARCHITECTURE.md, etc.
│   ├── gsd-planner.md               # Plans phases → writes PLAN.md with task breakdown
│   ├── gsd-plan-checker.md          # Verifies plans → returns feedback or approval
│   ├── gsd-executor.md              # Executes plans → writes code + SUMMARY.md
│   ├── gsd-verifier.md              # Verifies execution → checks goals met
│   ├── gsd-phase-researcher.md      # Researches domain → writes RESEARCH.md
│   ├── gsd-debugger.md              # Debugs failures → suggests fixes
│   ├── gsd-project-researcher.md    # Deep project understanding for onboarding
│   ├── gsd-research-synthesizer.md  # Synthesizes research into requirements
│   ├── gsd-integration-checker.md   # Validates external integrations work
│   ├── gsd-roadmapper.md            # Creates roadmap from requirements
│   └── (other agents)
├── hooks/                  # Event hooks (executed by Claude Code)
│   ├── dist/               # Compiled hooks (bundled)
│   │   ├── gsd-statusline.js        # Shows context usage, current task, model
│   │   ├── gsd-check-update.js      # Checks for GSD updates at session start
│   │   └── gsd-check-update.sh      # (Shell script version for portability)
│   └── src/                # Hook source files (build → dist/)
├── scripts/                # Build and utility scripts
│   └── build-hooks.js      # esbuild bundler for hooks (produces hooks/dist/)
├── assets/                 # Graphics and media
│   └── terminal.svg        # Installation demo visualization
├── package.json            # NPM manifest (esbuild only, zero prod deps)
├── package-lock.json       # Dependency lock
├── bin/install.js          # Entry point executable
├── CLAUDE.md               # Project instructions for Claude
├── CONTRIBUTING.md         # Contribution guidelines
├── README.md               # User-facing documentation
├── CHANGELOG.md            # Version history (Keep a Changelog format)
├── LICENSE                 # MIT license
├── GSD-STYLE.md            # Writing style guide for GSD docs
└── MAINTAINERS.md          # Maintainer contact info
```

## Directory Purposes

**bin/:**
- Purpose: Installation and setup entry point
- Contains: JavaScript CLI tool
- Key files: `install.js` (interactive installer with Claude/OpenCode support)

**commands/gsd/:**
- Purpose: User-facing command definitions
- Contains: Markdown files with YAML frontmatter + process definitions
- Key files: `new-project.md` (init), `plan-phase.md` (planning), `execute-phase.md` (execution)
- Pattern: Each command is a thin orchestrator that delegates to workflows

**get-shit-done/workflows/:**
- Purpose: Orchestration logic between agents and state management
- Contains: Step-based processes, model profile resolution, agent spawning
- Key files: `map-codebase.md` (spawns 4 mapper agents), `execute-phase.md` (wave execution)
- Pattern: Workflows stay lean; agents do heavy lifting in fresh contexts

**get-shit-done/agents/:**
- Purpose: Specialized autonomous workers
- Contains: Full task logic, document generation, no return to orchestrator
- Key files: `gsd-planner.md` (creates PLAN.md), `gsd-executor.md` (implements code)
- Pattern: Each agent gets fresh 200k context; writes output directly

**get-shit-done/templates/:**
- Purpose: Output structure definitions
- Contains: Markdown templates with placeholders
- Key files: `project.md` (PROJECT.md), `phase-prompt.md` (PLAN.md), `state.md` (STATE.md)
- Pattern: Templates define structure; agents/workflows fill placeholders

**get-shit-done/references/:**
- Purpose: Methodology guidance and decision frameworks
- Contains: How-to guides, questioning protocols, verification patterns
- Key files: `questioning.md` (deep questioning protocol), `tdd.md` (TDD patterns)
- Pattern: Referenced from commands/workflows/agents via `@path` notation

**hooks/:**
- Purpose: Claude Code session hooks (executed by Claude Code UI)
- Contains: JavaScript files executed at session start/stop
- Key files: `gsd-statusline.js` (shows context usage), `gsd-check-update.js` (version check)
- Pattern: Source in `src/`, compiled to `dist/` via esbuild

## Key File Locations

**Entry Points:**
- `bin/install.js`: Installation CLI (user runs `npx get-shit-done-cc`)
- `commands/gsd/help.md`: User help page (accessible via `/gsd:help`)
- `commands/gsd/new-project.md`: Project initialization entry point

**Configuration:**
- `package.json`: NPM package metadata (zero production dependencies)
- `.claude/settings.json`: Claude Code configuration (generated during install)
- `.planning/config.json`: Per-project workflow preferences (created by /gsd:new-project)

**Core Logic:**
- `agents/gsd-planner.md`: Planning logic (goal-backward verification, wave computation)
- `agents/gsd-executor.md`: Execution logic (task implementation, verification)
- `get-shit-done/workflows/execute-phase.md`: Wave-based execution orchestration

**Testing:**
- Not detected (system is procedural; no test suite)

## Naming Conventions

**Files:**
- Commands: `kebab-case.md` (plan-phase.md, execute-phase.md)
- Agents: `gsd-kebab-case.md` (gsd-planner.md, gsd-executor.md)
- Templates: `PascalCase.md` (PROJECT.md, PLAN.md, STATE.md)
- References: `kebab-case.md` (questioning.md, tdd.md)

**Directories:**
- Core system: `lowercase` (commands, agents, templates)
- User artifacts: `.planning/` prefix (hidden from version control by default)
- Feature phases: `NN-feature-name/` (01-core-auth/, 02-api-setup/)

## Where to Add New Code

**New Command:**
- Location: `commands/gsd/new-command-name.md`
- Structure: YAML frontmatter → `<objective>` → `<execution_context>` → `<process>` → `<success_criteria>`
- Reference workflows, not implementation details
- Example: `commands/gsd/quick.md` (lightweight feature flow)

**New Workflow:**
- Location: `get-shit-done/workflows/workflow-name.md`
- Structure: `<purpose>` → `<process>` with numbered steps → `<success_criteria>`
- Each step uses bash, Task tool (for agent spawning), or file operations
- Example: `get-shit-done/workflows/map-codebase.md` (parallel agent orchestration)

**New Agent:**
- Location: `agents/gsd-agent-name.md`
- Structure: `<role>` → `<process>` with implementation steps → templates for output
- Write final output directly; return only confirmation to orchestrator
- Example: `agents/gsd-codebase-mapper.md` (writes .planning/codebase/*.md)

**New Template:**
- Location: `get-shit-done/templates/NAME.md` (e.g., discovery.md)
- Use markdown with `[PLACEHOLDER]` for dynamic content
- Placeholders replaced by agents/workflows during execution
- Example: `get-shit-done/templates/project.md` (PROJECT.md structure)

**New Reference:**
- Location: `get-shit-done/references/topic.md`
- Format: Methodology guide or decision framework (no placeholders)
- Referenced from commands/workflows/agents via `@path` notation
- Example: `get-shit-done/references/questioning.md` (deep questioning protocol)

**New Hook:**
- Location: `hooks/src/hook-name.js`
- Run `npm run build:hooks` to compile to `hooks/dist/`
- Must be idempotent (safe to run multiple times)
- Example: `hooks/src/gsd-statusline.js` (session startup display)

## Special Directories

**.planning/:**
- Purpose: Project state and artifacts (user per-project)
- Generated: Yes (created by /gsd:new-project, populated by commands)
- Committed: Yes (by default; controlled by config.json `commit_docs` flag)
- Contents: PROJECT.md, ROADMAP.md, STATE.md, phases/, codebase/

**commands/gsd/**
- Purpose: User-accessible commands
- Generated: No (part of source)
- Committed: Yes
- Structure: Each .md file is one command

**agents/**
- Purpose: Subagents spawned by workflows
- Generated: No (part of source)
- Committed: Yes
- Pattern: Agent name must start with `gsd-` to be recognized as GSD agent

**get-shit-done/templates/codebase/**
- Purpose: Templates for codebase analysis documents
- Generated: No (part of source)
- Committed: Yes
- Note: These are meta-templates defining structure for STACK.md, ARCHITECTURE.md, etc.

**hooks/dist/**
- Purpose: Compiled hooks (esbuild output)
- Generated: Yes (by `npm run build:hooks`)
- Committed: Yes (but is build output; could be .gitignored if regenerated during install)
- Pattern: JavaScript bundles; installed to Claude Code config directory

---

*Structure analysis: 2026-01-26*
