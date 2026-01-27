# GSD (Get Shit Done)

## What This Is

A meta-prompting and context engineering system for Claude Code that enables fully autonomous software development. GSD solves context rot (quality degradation as Claude fills its context window) through atomic plans and fresh subagent contexts. When `autonomous: true` is set, Claude reasons through every decision point without human intervention.

## Core Value

Full autonomous execution from `/gsd:new-project` through `/gsd:execute-phase` with zero human input — Claude decides everything based on project context.

## Requirements

### Validated

- ✓ Multi-layer command/workflow/agent architecture — v1.0
- ✓ Context isolation via subagent spawning (fresh 200k contexts) — v1.0
- ✓ File-based state management (.planning/ directory) — v1.0
- ✓ Model profile system (quality/balanced/budget) — v1.0
- ✓ Git integration for committing artifacts — v1.0
- ✓ Parallel execution via wave-based agent spawning — v1.0
- ✓ Document-driven state (PROJECT.md, ROADMAP.md, PLAN.md, STATE.md) — v1.0
- ✓ Installation system for Claude Code and OpenCode — v1.0
- ✓ Hooks system (statusline, update checking) — v1.0
- ✓ Config flag to enable autonomous mode — v1.0
- ✓ Inner voice reasoning with context assembly — v1.0
- ✓ Decision traces: `Auto-decided: [choice] — [reason]` — v1.0
- ✓ Decision history tracking within session — v1.0
- ✓ Audit trail in DECISIONS.md — v1.0
- ✓ 7 decision policies (POLICY-01 through POLICY-07) — v1.0
- ✓ All workflows respect autonomous flag — v1.0
- ✓ Modular architecture with reference extraction — v1.0
- ✓ STATE.md schema and auto-recovery — v1.0
- ✓ Atomic JSON operations — v1.0
- ✓ Rollback mechanism with `/gsd:rollback-phase` — v1.0
- ✓ Inline task modifications during execution — v1.0

### Active

(To be defined in next milestone)

### Out of Scope

- Learning from outcomes — requires outcome tracking infrastructure, high complexity
- Autonomous tool expansion — autonomy applies to decisions, not expanding tool permissions
- Memory across sessions — each session fresh unless explicitly loaded
- Partial autonomy mode — anti-pattern, creates unpredictable UX

## Context

GSD is a meta-prompting system for Claude Code. v1.0 delivered full autonomous execution capability.

Current state:
- 35,000+ lines of markdown across workflows, references, templates
- 6 phases completed, 17 plans executed, ~60 tasks
- Config flag enables full autonomy
- Inner voice reasons through every question using full project context
- Modular architecture with 9 extracted reference modules
- Safety features: rollback capability, inline task modifications

Tech stack:
- JavaScript/Node.js (installer only)
- Zero production dependencies
- Works with Claude Code and OpenCode

## Constraints

- **Tech stack**: JavaScript/Node.js only, zero production dependencies
- **Compatibility**: Must work with both Claude Code and OpenCode installations
- **Context budget**: Agents must stay under 50% context usage for quality
- **Backwards compatible**: Interactive mode must still work when autonomous is disabled

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Inner voice as reasoning layer | Context-based reasoning more flexible than rules | ✓ Good — enables nuanced decisions |
| Brief traces over verbose logging | Users need visibility without noise | ✓ Good — auditable without clutter |
| Config-driven, not flag-driven | Consistent with existing config.json pattern | ✓ Good — clean integration |
| Policies as declarative rules | IF/THEN/BECAUSE ensures deterministic decisions | ✓ Good — auditable and predictable |
| Observable conditions only | File checks, counts, patterns — no "seems like" | ✓ Good — reproducible decisions |
| git revert over git reset | Preserves history, safe for shared repos | ✓ Good — no lost commits |
| Full commitment mode | All or nothing autonomy | ✓ Good — predictable UX |
| Skip known bugs for v1 | Architecture changes may obsolete some | — Pending review |

---
*Last updated: 2026-01-27 after v1.0 milestone*
