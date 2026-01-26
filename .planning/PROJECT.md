# GSD Autonomous Mode

## What This Is

A milestone to make GSD fully autonomous by adding an "inner voice" system that answers its own questions based on project context, while resolving technical debt and adding missing features identified in the codebase analysis. When enabled via config, Claude reasons through every decision point without human intervention.

## Core Value

Full autonomous execution from `/gsd:new-project` through `/gsd:execute-phase` with zero human input — Claude decides everything based on context.

## Requirements

### Validated

- ✓ Multi-layer command/workflow/agent architecture — existing
- ✓ Context isolation via subagent spawning (fresh 200k contexts) — existing
- ✓ File-based state management (.planning/ directory) — existing
- ✓ Model profile system (quality/balanced/budget) — existing
- ✓ Git integration for committing artifacts — existing
- ✓ Parallel execution via wave-based agent spawning — existing
- ✓ Document-driven state (PROJECT.md, ROADMAP.md, PLAN.md, STATE.md) — existing
- ✓ Installation system for Claude Code and OpenCode — existing
- ✓ Hooks system (statusline, update checking) — existing

### Active

**Inner Voice System:**
- [ ] Config flag to enable autonomous mode (`autonomous: true` in config.json)
- [ ] Inner voice reasoning that answers AskUserQuestion calls based on context
- [ ] Context sources: PROJECT.md, REQUIREMENTS.md, research outputs, codebase state, decision history
- [ ] Brief decision traces: `Auto-decided: [choice] — [reason]`
- [ ] Decision history tracking for consistency across session
- [ ] All workflows respect autonomous flag (commands, workflows, agents)

**Tech Debt (from CONCERNS.md):**
- [ ] Extract monolithic agent files into smaller focused modules
- [ ] Refactor install.js — extract path utils, config manager, file ops
- [ ] State file validation with schema and auto-recovery
- [ ] Atomic file operations (write-temp, verify, move) for JSON files

**Missing Features (from CONCERNS.md):**
- [ ] Rollback mechanism — revert phase commits if verification fails
- [ ] Plan revision without full re-planning — inline task modifications
- [ ] Cross-phase dependency tracking — cascade invalidation warnings
- [ ] Automated environment setup validation — check env vars before execution

### Out of Scope

- Known bugs (Windows paths, orphaned hooks, JSON parse failures) — lower priority than architecture changes
- Security hardening (path validation, schema validation) — future milestone
- Performance optimizations (agent-history pruning, verifier grep filtering) — future milestone
- Test coverage gaps — future milestone after architecture stabilizes

## Context

GSD is a meta-prompting system for Claude Code. The codebase analysis (`.planning/codebase/`) identified significant technical debt in monolithic files and missing features that prevent truly autonomous operation.

Current state:
- Workflows use AskUserQuestion at every decision point
- Users must approve roadmaps, plans, and execution checkpoints
- No way to run end-to-end without human input
- Large files (execute-plan.md at 1844 lines, gsd-planner.md at 1386 lines) are hard to maintain

Target state:
- Config flag enables full autonomy
- Inner voice reasons through every question using full project context
- Modular architecture with focused files
- Critical missing features (rollback, plan revision) enable safer autonomous operation

## Constraints

- **Tech stack**: JavaScript/Node.js only, zero production dependencies — maintain this philosophy
- **Compatibility**: Must work with both Claude Code and OpenCode installations
- **Context budget**: Agents must stay under 50% context usage for quality — affects how inner voice is implemented
- **Backwards compatible**: Interactive mode must still work when autonomous is disabled

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Inner voice as reasoning layer, not rule engine | Context-based reasoning is more flexible than predefined rules | — Pending |
| Brief traces over verbose logging | Users need visibility without noise | — Pending |
| Config-driven, not flag-driven | Consistent with existing config.json pattern | — Pending |
| Skip known bugs for this milestone | Architecture changes may obsolete some bugs | — Pending |

---
*Last updated: 2026-01-26 after initialization*
