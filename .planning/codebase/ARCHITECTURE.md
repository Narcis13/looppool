# Architecture

**Analysis Date:** 2026-01-26

## Pattern Overview

**Overall:** Multi-layer command/workflow/agent orchestration with context engineering at core

**Key Characteristics:**
- Thin command layer delegates to workflows, workflows spawn specialized agents in fresh contexts
- Context isolation: agents write documents/results directly; orchestrators only receive confirmations and summaries
- Progressive disclosure: commands → workflows → agents → templates/references in layers
- Subagent spawning pattern: fresh 200k context per specialized agent to avoid token saturation
- File-based state management: all project state in `.planning/` directory

## Layers

**Command Layer:**
- Purpose: Thin user-facing interfaces with YAML frontmatter, minimal logic
- Location: `commands/gsd/*.md`
- Contains: YAML metadata (name, description, tools), objective, context references, process steps
- Depends on: Workflows, Bash, Read, Write, Task
- Used by: Claude Code users via `/gsd:command-name` slash commands

**Workflow Layer:**
- Purpose: Orchestration logic that coordinates subagents, handles state transitions, integrates results
- Location: `get-shit-done/workflows/*.md`
- Contains: Step-based processes, model profile resolution, agent spawning, verification loops, git operations
- Depends on: Agents (via Task tool), templates, references, Bash
- Used by: Commands; workflows delegate heavy work but stay lean themselves

**Agent Layer:**
- Purpose: Specialized autonomous workers with fresh context (200k each), no return to orchestrator
- Location: `agents/gsd-*.md` (e.g., gsd-planner.md, gsd-codebase-mapper.md)
- Contains: Role definition, discovery protocols, complete task logic, document/output generation
- Depends on: Templates, references, codebase files
- Used by: Workflows via Task tool with `run_in_background=true` for parallel execution

**Template Layer:**
- Purpose: Structured output formats (Markdown, JSON, YAML) with placeholders for agent/workflow outputs
- Location: `get-shit-done/templates/` (project.md, phase-prompt.md, etc.)
- Contains: `.planning/` artifact templates (PROJECT.md, STATE.md, PLAN.md, etc.)
- Depends on: Nothing; purely structural
- Used by: Agents and workflows when writing state/output files

**Reference Layer:**
- Purpose: Deep dives on specific concepts, patterns, decision frameworks
- Location: `get-shit-done/references/` (questioning.md, tdd.md, git-integration.md, etc.)
- Contains: How-to guides, decision frameworks, verification patterns, questioning guides
- Depends on: Nothing; purely informational
- Used by: Commands/workflows/agents to apply specific methodologies

## Data Flow

**User Initialization Flow:**

1. User runs `/gsd:new-project` (command)
2. Command orchestrates via questioning.md reference → builds PROJECT.md → writes config.json
3. User then runs `/gsd:plan-phase 1` (command)
4. Command spawns gsd-phase-researcher (fresh context) → writes RESEARCH.md
5. Command spawns gsd-planner (fresh context) → reads research, produces PLAN.md
6. Command spawns gsd-plan-checker (fresh context) → verifies PLAN.md, returns feedback
7. Loop until plans pass or max iterations

**Execution Flow:**

1. User runs `/gsd:execute-phase 1` (command)
2. Command discovers plans, groups by wave (pre-computed dependency graph)
3. Command spawns gsd-executor agents in parallel by wave (each with fresh context)
4. Executors write SUMMARY.md, commit code
5. Command spawns gsd-verifier (fresh context) → checks all SUMMARY.md against goals
6. If verification fails, suggests next phase for gap closure

**State Management:**
- `.planning/PROJECT.md` — Project vision, problem statement, constraints
- `.planning/ROADMAP.md` — Phase breakdown with descriptions
- `.planning/STATE.md` — Project memory (current phase, decisions, blockers)
- `.planning/config.json` — Workflow preferences (model profile, commit behavior)
- `.planning/phases/NN-*/` — Phase artifacts (PLAN.md, SUMMARY.md, research)
- `.planning/codebase/` — Codebase analysis (STACK.md, ARCHITECTURE.md, etc.)

## Key Abstractions

**Command Pattern:**
- Purpose: User-facing entry points with consistent interface
- Examples: `commands/gsd/plan-phase.md`, `commands/gsd/execute-phase.md`, `commands/gsd/new-project.md`
- Pattern: YAML frontmatter metadata + XML-structured process steps, delegates to workflows

**Agent Spawning Pattern:**
- Purpose: Isolate specialized work in fresh context windows
- Examples: Workflows use Task tool with `subagent_type="gsd-planner"`, `run_in_background=true`
- Pattern: Orchestrator stays lean; agents write final output directly; orchestrator only receives confirmations

**Document-Driven State:**
- Purpose: Project memory persists across commands in Markdown files
- Examples: PROJECT.md (input), ROADMAP.md (structure), PLAN.md (executable prompt), SUMMARY.md (output)
- Pattern: Read state before operations, write state after operations; all state is version-controlled

**Frontmatter Metadata:**
- Purpose: Machine-readable configuration for commands and plans
- Examples: `wave: 1`, `autonomous: true`, `gap_closure: false` in PLAN.md frontmatter
- Pattern: YAML after triple-dashes, parsed by workflows for orchestration decisions

## Entry Points

**User Entry (Commands):**
- Location: `commands/gsd/*.md`
- Triggers: `/gsd:command-name` in Claude Code
- Responsibilities: Parse arguments, validate environment, orchestrate workflows, present results

**Workflow Entry (Orchestration):**
- Location: `get-shit-done/workflows/map-codebase.md` (example)
- Triggers: Referenced from command execution_context
- Responsibilities: Resolve model profiles, spawn agents, collect results, handle loops, commit artifacts

**Agent Entry (Implementation):**
- Location: `agents/gsd-executor.md` (example)
- Triggers: Spawned via Task tool by workflow with prompt override
- Responsibilities: Read full context (references, templates, codebase), execute specialized work, write output directly

**Installation Entry:**
- Location: `bin/install.js`
- Triggers: `npx get-shit-done-cc`
- Responsibilities: Interactive/non-interactive setup, path management for Claude Code + OpenCode, hook registration

## Error Handling

**Strategy:** Layered validation with graceful degradation and user choice

**Patterns:**
- Pre-flight checks in commands before agent spawning (e.g., "Is .planning/ initialized?")
- Validation errors cause early exit with user guidance
- Agent failures (e.g., plan checker rejects plans) trigger revision loops with feedback
- Verification failures suggest next actions (gap closure phase)
- Missing files default to empty state (e.g., config.json defaults to balanced profile)

**Examples:**
- `commands/gsd/plan-phase.md` aborts if no PROJECT.md exists
- `commands/gsd/execute-phase.md` filters completed plans and skips them
- Workflows offer user choice on conflicts (e.g., "Refresh codebase map or skip?")

## Cross-Cutting Concerns

**Logging:** Console output in commands/workflows only; agents are silent (write artifacts instead)

**Validation:** Frontmatter parsing in workflows, schema validation implied in agent outputs (templates enforce structure)

**Authentication:** None required; system is local/file-based. Claude Code provides execution context.

**Context Management:** Model profile resolution (quality/balanced/budget) drives agent selection per workflow

**Git Integration:** Workflows handle commit operations based on config.json `commit_docs` flag; agents never commit

**Configuration:** `.planning/config.json` controls workflow behavior (model profile, commit behavior); can be edited by user

---

*Architecture analysis: 2026-01-26*
