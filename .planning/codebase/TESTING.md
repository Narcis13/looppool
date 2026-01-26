# Testing Patterns

**Analysis Date:** 2026-01-26

## Overview

GSD does not use automated unit tests. The codebase is primarily:

1. **Markdown prompts** (`commands/gsd/*.md`, `agents/*.md`, `get-shit-done/workflows/*.md`) — Executed by Claude, verified through workflow outcomes
2. **JavaScript utilities** (`bin/install.js`, `hooks/*.js`, `scripts/*.js`) — Tested through manual integration and installation scripts

Testing follows the philosophy of **specification-driven verification** where:
- Commands and agents are specifications (their content defines expected behavior)
- Integration tests happen through actual GSD workflows (running `/gsd:new-project`, `/gsd:execute-phase`, etc.)
- JavaScript utilities are tested via end-to-end installation and execution

## Test Framework

**No automated test runner** — No Jest, Vitest, Mocha, or similar

**Manual testing approach:**
- Development: `npm link && npx get-shit-done-cc` for local testing
- Installation: `node bin/install.js --claude --local` or `--global`
- Hook execution: Hooks run during Claude Code sessions, output visible in statusline/console

**CI/CD:**
- No GitHub Actions running tests
- Releases are manual: `npm version patch`, update CHANGELOG.md, push with tags
- npm publish requires explicit `npm publish` command

## Test File Organization

**No test files exist** — No `.test.js`, `.spec.js`, or `__tests__/` directories

**Testing approach:**
1. **Specification tests** — Command/agent files are specifications tested by running them
2. **Integration tests** — GSD workflows (create project, plan phase, execute, verify) test multiple components together
3. **Manual testing** — Local installation and execution verify behavior
4. **Release validation** — Before releasing, test on macOS, Windows, Linux

## Testing Strategy by Component Type

### Markdown Commands (`commands/gsd/*.md`)

**How they're tested:**
- User runs the command: `/gsd:command-name`
- Expected output should match the documented process
- Success verified by:
  - Files created in expected locations
  - State changes (config.json, STATE.md updated)
  - Conversational output matches documented behavior

**Example test flow for `/gsd:settings`:**
1. Run command
2. Verify `.planning/config.json` updated with selected profile and workflow toggles
3. Verify interactive prompts appear for model selection

### Markdown Agents (`agents/*.md`)

**How they're tested:**
- Agent is spawned by orchestrator during workflow
- Expected behavior is documented in agent `<role>` and `<core_principle>`
- Success verified by:
  - Output files created (PLAN.md, SUMMARY.md, RESEARCH.md, etc.)
  - File contents match expected structure and quality
  - Orchestrator can consume agent's output without errors

**Example test flow for `gsd-executor`:**
1. Orchestrator spawns with PLAN.md file
2. Executor reads plan, executes tasks in order
3. Verify SUMMARY.md created with task completions
4. Verify commits created for each task
5. Verify STATE.md updated with phase completion

### JavaScript Utilities (`bin/install.js`, `hooks/*.js`)

**How they're tested:**

**Installation:**
1. `npm link` in project directory
2. `npx get-shit-done-cc --claude --local` (local install)
3. Verify files copied to `./.claude/`
4. Verify settings.json updated with hooks
5. `npx get-shit-done-cc --claude --global` (global install)
6. Verify files in `~/.claude/`
7. Verify hooks in `~/.claude/hooks/`

**Uninstall:**
1. `npx get-shit-done-cc --claude --global --uninstall`
2. Verify GSD files removed
3. Verify user files preserved (settings.json structure preserved)

**Cross-platform:**
- Test on macOS (primary development)
- Test on Windows (check path handling with backslashes)
- Test on Linux (verify bash compatibility)

**Hooks testing:**
- `gsd-statusline.js`: Pipe JSON input, verify colored output
- `gsd-check-update.js`: Verify cache file created in `~/.claude/cache/`
- Both hooks should run in background without blocking

## Manual Integration Tests

### Project Creation Workflow

**Test: `/gsd:new-project`**

Steps:
1. Initialize empty project directory
2. Run `/gsd:new-project` with domain description
3. Verify:
   - `.planning/` directory created with structure
   - `config.json` initialized
   - `ROADMAP.md` created with phases
   - `STATE.md` initialized
   - All research files present (STACK.md, FEATURES.md, ARCHITECTURE.md, etc.)

### Phase Planning Workflow

**Test: `/gsd:plan-phase`**

Steps:
1. Load project from previous test
2. Run `/gsd:plan-phase 1` (plan first phase)
3. Verify:
   - `.planning/phases/01-*/` directory created
   - PLAN.md files created with task breakdowns
   - Wave numbers assigned to plans
   - RESEARCH.md created if research needed

### Phase Execution Workflow

**Test: `/gsd:execute-phase`**

Steps:
1. Load planned phase
2. Run `/gsd:execute-phase 1`
3. Verify:
   - Code created (based on PLAN.md)
   - SUMMARY.md created for each plan
   - Commits created per task
   - STATE.md updated with completion

### Phase Verification Workflow

**Test: `/gsd:verify-phase`**

Steps:
1. Run after execution completes
2. Verify:
   - VERIFICATION.md created with goal-backward analysis
   - Issues detected if phase goal not met
   - Recommendations provided for gaps

## Testing Patterns for Markdown Prompts

### Structure Verification

**Pattern: Check XML sections and required fields**

For commands, verify:
- `<objective>` explains what command does
- `<process>` has numbered steps or clear flow
- `<success_criteria>` or final section confirms completion

For agents, verify:
- `<role>` is clear about responsibilities
- Implementation follows role description
- Output format matches downstream consumers

### Content Verification

**Pattern: Manual execution and output inspection**

1. Run the command/agent
2. Read generated files
3. Verify against documented structure
4. Check downstream usage (does orchestrator parse output correctly?)

**Example:** After `gsd-planner` creates PLAN.md, verify:
- All `<task>` elements have required sections (Files, Action, Verify, Done)
- Wave numbers are assigned (needed for parallel execution)
- Task descriptions are specific enough for executor to implement

### Dependency Testing

**Pattern: Trace data flow between files**

For phase workflows:
1. ROADMAP.md defines phase goal and requirements
2. Planner creates PLAN.md addressing requirements
3. Plan checker verifies coverage
4. Executor implements tasks in PLAN.md
5. Verifier confirms phase goal achieved

Verify each step consumes previous output correctly:
- Can planner parse ROADMAP.md?
- Can checker parse PLAN.md and ROADMAP.md together?
- Can executor parse PLAN.md and create files?
- Can verifier parse SUMMARY.md and codebase?

## Testing Hook Behavior

### Statusline Hook (`hooks/gsd-statusline.js`)

**Manual test:**
```bash
echo '{"model":{"display_name":"Claude 3.5 Sonnet"},"context_window":{"remaining_percentage":75}}' | node hooks/gsd-statusline.js
```

**Expected:** Colored output showing model, context usage

**Test cases:**
- Low usage (< 50%) → Green
- Medium usage (50-65%) → Yellow
- High usage (65-80%) → Orange
- Critical usage (> 80%) → Red flashing

### Update Check Hook (`hooks/gsd-check-update.js`)

**Manual test:**
```bash
node hooks/gsd-check-update.js
```

**Expected:**
- Cache file created at `~/.claude/cache/gsd-update-check.json`
- File contains JSON with `update_available`, `installed`, `latest`, `checked`
- Hook runs in background (returns immediately)

## Testing Checklist for Release

Before publishing new version:

- [ ] **macOS installation**
  - `npm link && npx get-shit-done-cc --claude --local`
  - Verify `.claude/` directory created with files
  - Launch Claude Code, run `/gsd:help`
  - Verify statusline appears and updates

- [ ] **Windows installation**
  - Same steps in PowerShell or CMD
  - Verify path handling (backslashes in paths.js logic)
  - Test with custom config-dir containing spaces

- [ ] **Linux installation**
  - Verify bash hooks work
  - Test XDG Base Directory handling for OpenCode

- [ ] **Global vs Local install**
  - Global: `npx get-shit-done-cc --claude --global`
  - Local: `cd test-project && npx get-shit-done-cc --claude --local`
  - Verify both work independently

- [ ] **Uninstall**
  - `npx get-shit-done-cc --claude --global --uninstall`
  - Verify GSD files removed
  - Verify user's settings.json untouched

- [ ] **Project workflow end-to-end**
  - Create new test project
  - Run `/gsd:new-project`
  - Run `/gsd:plan-phase 1`
  - Run `/gsd:execute-phase 1` with simple phase
  - Run `/gsd:verify-phase 1`
  - Verify all files created and state correct

- [ ] **OpenCode compatibility** (if changed)
  - Test frontmatter conversion (Claude → OpenCode format)
  - Test command flattening (commands/gsd/help.md → command/gsd-help.md)
  - Test permission configuration

## Continuous Testing Through Usage

**Philosophy:** GSD is tested continuously through real usage. Every time a developer:
- Creates a new project with `/gsd:new-project`
- Plans a phase with `/gsd:plan-phase`
- Executes with `/gsd:execute-phase`
- Verifies with `/gsd:verify-phase`

...they are running integration tests of the entire system.

**Bug detection:**
- User reports issue with `/gsd:debug`
- Agent investigates, identifies root cause
- Fix applied to specification (agent prompt or command)
- Change shipped in next release

This continuous feedback loop is intentional — GSD specification drives its own improvement.

## Anti-Patterns: What NOT to Do

### ❌ Unit Tests for Markdown Prompts

Don't create `.test.md` files or test harnesses for agent prompts. Prompts are specifications — test by running them.

### ❌ Heavy Mocking in JavaScript

Don't mock filesystem or subprocess calls. Test real behavior: actual file creation, actual subprocess execution.

### ❌ Test Data Fixtures

No need for fixtures — test data is created by running workflows. Real project state is better than mocks.

### ❌ Snapshot Testing

Don't store snapshots of PLAN.md or SUMMARY.md output. Outputs change; test the structure, not exact content.

## Known Testing Gaps

**Not Tested Automatically:**
1. Claude Code UI integration (statusline rendering, command execution)
2. OpenCode compatibility (needs OpenCode environment)
3. Multi-user scenarios (assumed solo developer + Claude)
4. Network errors in WebFetch/WebSearch (hooks run in background, network optional)
5. Large projects (testing focused on typical-size projects)

**Why:**
- Most gaps require human feedback or external environments
- GSD's core value is flexibility — many scenarios should be caught by human usage
- CI/CD overhead would slow development more than it catches bugs

---

*Testing analysis: 2026-01-26*
