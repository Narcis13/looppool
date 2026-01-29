---
name: lpl:loop
description: Autonomous execution loop with fresh-context iterations
argument-hint: "<init|start|stop|status> [phase] [--max N]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

<objective>
Run LPL's structured workflow through an autonomous loop where each iteration gets fresh context. Combines Ralph's fresh-context iteration pattern with LPL's goal-backward verification.

Each loop iteration: load context → select next task → execute → validate → commit → exit. Fresh context on next iteration prevents context rot.

Subcommands:
- `init` — Generate LEARNINGS.md and loop config from project
- `start [phase]` — Begin autonomous loop for phase
- `stop` — Graceful stop after current task
- `status` — Show loop state and progress
</objective>

<execution_context>
@~/.claude/looppool/workflows/loop-orchestrator.md
@~/.claude/looppool/references/loop-mechanics.md
@~/.claude/looppool/references/autonomous.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/config.json
</context>

<process>

<step name="parse_subcommand">
**Parse subcommand from argument.**

Extract subcommand: `init`, `start`, `stop`, or `status`.

If no argument provided:

```
Usage: /lpl:loop <init|start|stop|status> [phase] [--max N]

  init           Generate LEARNINGS.md and loop config
  start [phase]  Begin autonomous loop for phase
  stop           Graceful stop after current task
  status         Show loop state and progress

Options:
  --max N        Maximum iterations (default: from config, fallback: 50)
```

Exit.

Parse optional flags:
- `--max N` — Override max iterations
- Phase number — Target phase for `start`
</step>

<step name="verify_project">
**Verify LPL project exists.**

```bash
test -d .planning && test -f .planning/ROADMAP.md && echo "exists" || echo "missing"
```

If missing:

```
No active LPL project found.
Run /lpl:new-project first.
```

Exit.
</step>

<step name="load_config">
**Load loop configuration.**

```bash
cat .planning/config.json 2>/dev/null
```

Extract loop settings:

```bash
MAX_ITER=$(cat .planning/config.json 2>/dev/null | grep -o '"max_iterations"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' || echo "50")
STUCK_THRESHOLD=$(cat .planning/config.json 2>/dev/null | grep -o '"stuck_threshold"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' || echo "3")
PARALLEL_WAVES=$(cat .planning/config.json 2>/dev/null | grep -o '"parallel_waves"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "false")
```

If `--max N` flag provided, override `MAX_ITER`.
</step>

<step name="route_subcommand">
**Route to subcommand handler.**

| Subcommand | Handler |
|------------|---------|
| `init` | Go to **init_handler** |
| `start` | Go to **start_handler** |
| `stop` | Go to **stop_handler** |
| `status` | Go to **status_handler** |
| other | Show usage and exit |

</step>

<step name="init_handler">
**Initialize loop infrastructure for project.**

**Step 1: Detect project stack**

```bash
# Detect package manager and test framework
cat package.json 2>/dev/null | head -50
cat requirements.txt 2>/dev/null | head -20
cat Gemfile 2>/dev/null | head -20
cat go.mod 2>/dev/null | head -10
cat Cargo.toml 2>/dev/null | head -10
```

Extract:
- Language/runtime
- Package manager
- Test framework
- Build tool
- Lint tool

**Step 2: Detect validation commands**

```bash
# Check for common test/build/lint scripts
cat package.json 2>/dev/null | grep -E '"(test|build|lint|typecheck|check)"'
```

Build validation command list from detected scripts.

**Step 3: Generate LEARNINGS.md**

Use template: @~/.claude/looppool/templates/learnings.md

Write to `.planning/LEARNINGS.md` with:
- Detected validation commands
- Empty Patterns section (populated during loop)
- Empty Constraints section (populated during loop)
- Empty Session Decisions table
- Empty Discovered Issues table

**Step 4: Update config.json with loop settings**

Read existing config.json, add loop section:

```json
{
  "loop": {
    "enabled": true,
    "max_iterations": 50,
    "stuck_threshold": 3,
    "parallel_waves": false,
    "validation_commands": ["npm test", "npm run build"]
  }
}
```

Validation commands populated from Step 2 detection.

**Step 5: Report**

```
LPL > LOOP INITIALIZED

LEARNINGS.md: .planning/LEARNINGS.md
Config: .planning/config.json (loop section added)

Detected stack:
- Runtime: [detected]
- Tests: [detected command]
- Build: [detected command]
- Lint: [detected command]

Next: /lpl:loop start [phase]
```

</step>

<step name="start_handler">
**Begin autonomous loop execution.**

Delegates to loop orchestrator workflow:
@~/.claude/looppool/workflows/loop-orchestrator.md

**Step 1: Resolve phase**

If phase argument provided, use it.

If not provided, read STATE.md for current phase:

```bash
grep -E "^Phase:" .planning/STATE.md | head -1
```

Extract current phase number.

**Step 2: Verify plans exist**

```bash
ls .planning/phases/[phase-dir]/*-PLAN.md 2>/dev/null | wc -l
```

If no plans exist:

```
No plans found for phase [N].

Run /lpl:plan-phase [N] first, or use /lpl:loop init if starting fresh.
```

Exit.

**Step 3: Check for LEARNINGS.md**

```bash
test -f .planning/LEARNINGS.md && echo "exists" || echo "missing"
```

If missing, warn and offer to run init:

```
LEARNINGS.md not found. Run /lpl:loop init first for optimal results.
Continuing without operational learnings...
```

**Step 4: Create loop state file**

Write `.planning/LOOP-STATE.md`:

```markdown
# Loop State

Started: [timestamp]
Phase: [phase number]
Status: running
Iteration: 0
Max iterations: [MAX_ITER]
Consecutive failures: 0

## Task Progress

| Iteration | Plan | Task | Status | Commit | Signal |
|-----------|------|------|--------|--------|--------|
```

**Step 5: Enter loop**

Execute loop orchestrator workflow. The orchestrator handles:
- Spawning iteration agents
- Monitoring exit signals
- Updating LOOP-STATE.md
- Triggering verification on PHASE_COMPLETE
- Handling gap closure

Report:

```
LPL > LOOP STARTED

Phase: [N] — [phase name]
Plans: [count]
Max iterations: [MAX_ITER]

Loop running... (Ctrl+C or /lpl:loop stop to halt)
```

</step>

<step name="stop_handler">
**Graceful stop of running loop.**

**Step 1: Check if loop is running**

```bash
test -f .planning/LOOP-STATE.md && grep -q "Status: running" .planning/LOOP-STATE.md && echo "running" || echo "stopped"
```

If not running:

```
No active loop found.
```

Exit.

**Step 2: Set stop signal**

Update LOOP-STATE.md:

```markdown
Status: stopping
```

The loop orchestrator checks this before each iteration and exits gracefully after current task completes.

**Step 3: Report**

```
LPL > LOOP STOP REQUESTED

Loop will stop after current task completes.
Run /lpl:loop status to check final state.
```

</step>

<step name="status_handler">
**Show current loop state and progress.**

**Step 1: Check for loop state**

```bash
test -f .planning/LOOP-STATE.md && echo "exists" || echo "missing"
```

If missing:

```
No loop state found. Run /lpl:loop start to begin.
```

Exit.

**Step 2: Read and display state**

Read `.planning/LOOP-STATE.md` and `.planning/STATE.md`.

```
LPL > LOOP STATUS

Phase: [N] — [phase name]
Status: [running | stopping | stopped | complete]
Iteration: [current] / [max]
Consecutive failures: [count] / [stuck_threshold]

## Progress

Plans: [completed] / [total]
Tasks: [completed] / [total]

## Recent Iterations

| # | Plan | Task | Status | Signal |
|---|------|------|--------|--------|
| [last 5 iterations from LOOP-STATE.md] |

## LEARNINGS.md

Patterns: [count]
Constraints: [count]
Decisions: [count]
Issues: [count]

Next: [what happens next based on state]
```

</step>

</process>

<success_criteria>
- [ ] Subcommand parsed and routed correctly
- [ ] `init` detects stack and generates LEARNINGS.md
- [ ] `init` adds loop config to config.json
- [ ] `start` verifies plans exist before looping
- [ ] `start` creates LOOP-STATE.md and enters loop
- [ ] `stop` sets graceful stop signal
- [ ] `status` displays loop progress and state
- [ ] Fresh context per iteration (exit after each task)
- [ ] Backpressure validation (tests/build/lint) before commits
- [ ] STUCK signal after configured failure threshold
</success_criteria>
