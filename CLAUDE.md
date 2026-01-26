# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GSD (Get Shit Done) is a meta-prompting and context engineering system for Claude Code. Every file is both implementation and specification—files teach Claude how to build software systematically. The system solves context rot (quality degradation as Claude fills its context window) through atomic plans and fresh subagent contexts.

## Build & Development Commands

```bash
# Install dependencies (esbuild only, zero production deps)
npm install

# Build hooks (copies hook files to hooks/dist/)
npm run build:hooks

# Local development testing
npm link
npx get-shit-done-cc

# Test local installation
node bin/install.js --claude --local
```

## Release Workflow

```bash
# Standard release
npm version minor  # or patch, or major
# Update CHANGELOG.md (Keep a Changelog format)
git add package.json CHANGELOG.md
git commit -m "chore: release v1.X.0"
git tag -a v1.X.0 -m "Release v1.X.0"
git push origin main --tags
npm publish

# Hotfix (skip changelog ceremony)
git commit -m "fix(scope): description"
npm version patch
git push origin main --tags
```

## Architecture

### Layer Hierarchy (Progressive Disclosure)

1. **Commands** (`commands/gsd/*.md`) — Thin wrappers with YAML frontmatter, delegate to workflows
2. **Workflows** (`get-shit-done/workflows/*.md`) — Orchestration logic, spawn agents
3. **Agents** (`agents/*.md`) — Autonomous specialized prompts executed in fresh 200k contexts
4. **Templates** (`get-shit-done/templates/*.md`) — Output structures with placeholders
5. **References** (`get-shit-done/references/*.md`) — Deep dives on specific concepts

### Multi-Agent Orchestration Pattern

Orchestrators never do heavy lifting—they spawn specialized agents, wait, and integrate results:
- **Research stage:** 4 parallel researchers investigate stack, features, architecture, pitfalls
- **Planning stage:** Planner creates plans, checker verifies, loop until pass
- **Execution stage:** Executors implement in parallel, each with fresh context
- **Verification stage:** Verifier checks codebase against goals

### Context Engineering

Plans are capped at 2-3 tasks maximum. Quality curve: 0-30% context = peak, 50-70% = degrading, 70%+ = poor. Split triggers: >3 tasks, multiple subsystems, >5 files per task.

## File Conventions

### Command Structure
```yaml
---
name: gsd:command-name
description: One-line description
argument-hint: "<required>" or "[optional]"
allowed-tools: [Read, Write, Bash, Glob, Grep, AskUserQuestion]
---
```

Sections: `<objective>` → `<execution_context>` → `<context>` → `<process>` → `<success_criteria>`

### XML Conventions
- Use semantic tags (`<objective>`, `<task>`, `<verify>`), not generic (`<section>`, `<item>`, `<content>`)
- Use Markdown headers for hierarchy within XML containers
- Task types: `type="auto"` (autonomous), `type="checkpoint:human-verify"`, `type="checkpoint:decision"`

### Naming
| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `execute-phase.md` |
| Commands | `gsd:kebab-case` | `gsd:execute-phase` |
| Step names | snake_case | `name="load_project_state"` |

## Writing Style

- **Imperative voice:** "Execute tasks", "Create file" (not "Execution is performed")
- **No filler:** Absent: "Let me", "Just", "Simply", "I'd be happy to"
- **No sycophancy:** Absent: "Great!", "Awesome!", "Excellent!"
- **Brevity with substance:** "JWT auth with refresh rotation using jose library" (not "Authentication implemented")

## Anti-Patterns (Banned)

- **Enterprise patterns:** Story points, sprint ceremonies, RACI matrices, dev time estimates
- **Temporal language in docs:** "We changed X to Y", "Previously", "No longer" (exception: CHANGELOG.md, commits)
- **Generic XML:** `<section>`, `<item>`, `<content>`
- **Vague tasks:** Tasks must have specific files, actions, verify steps, and done criteria

## Commit Conventions

Format: `{type}({scope}): {description}`

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `revert`

During execution: one commit per task, stage files individually (never `git add .`), include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

## Branch Strategy

- `main` — Production, always installable via `npx get-shit-done-cc`
- Feature branches: `feat/description`, `fix/description`, `docs/description`, `hotfix/version-description`
- Branch → PR → Merge (no `develop` branch, no release branches)
