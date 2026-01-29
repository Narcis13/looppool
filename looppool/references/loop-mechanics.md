# Loop Mechanics

Deep-dive reference on how the autonomous loop works, why each design decision was made, and how to diagnose issues.

<overview>

The LPL loop combines two proven patterns:

1. **Ralph's fresh-context iteration** — Exit after each task, restart with clean 200k context. Prevents context rot (quality degradation as context fills).

2. **LPL's goal-backward verification** — After phase completion, verify outcomes not just task completion. Create gap-closure plans if verification reveals gaps.

The loop is the execution engine. Plans define what to build. LEARNINGS.md defines how to build it. The loop connects them through autonomous iteration.

</overview>

<fresh_context_pattern>

## Fresh Context Pattern

**The problem:** Claude's output quality degrades as context fills. At 0-30% context, output is peak quality. At 50-70%, quality noticeably degrades. Above 70%, quality is poor and hallucinations increase.

**The solution:** Exit after each task. The loop orchestrator spawns a new agent with fresh 200k context for the next task. Each iteration loads only what it needs from persistent files.

**Why this works:**

```
Traditional approach:
┌──────────────────────────────────────────┐
│ Context: [Task 1][Task 2][Task 3][Task 4]│
│ Quality: ████▓▓▓▓░░░░                   │
│          Peak  Degrading  Poor           │
└──────────────────────────────────────────┘

Loop approach:
Iteration 1: [Load State][Task 1][Exit]  Quality: ████
Iteration 2: [Load State][Task 2][Exit]  Quality: ████
Iteration 3: [Load State][Task 3][Exit]  Quality: ████
Iteration 4: [Load State][Task 4][Exit]  Quality: ████
```

**Context budget per iteration:**
- State loading: ~5% (LOOP-STATE, LEARNINGS, STATE, PLAN)
- Codebase reading: ~15% (search, read existing files)
- Implementation: ~10% (writing code, running commands)
- Total: ~30% — well within peak quality zone

**Trade-off:** Higher API cost (more agent spawns). Worth it for consistent quality on larger projects.

</fresh_context_pattern>

<backpressure_steering>

## Backpressure Steering

Backpressure is the self-correcting feedback loop within each iteration. Validation commands act as guardrails — if the code doesn't pass, the iteration fixes it before committing.

**How it works:**

```
Implement task
    │
    ▼
Run validation commands
    │
    ├── All pass → Commit → Exit
    │
    └── Failure → Analyze error
                      │
                      ▼
                  Apply fix
                      │
                      ▼
                  Re-validate
                      │
                      ├── Pass → Commit → Exit
                      │
                      └── Fail → Retry (max 3)
                                    │
                                    └── 3rd fail → Increment failure counter
                                                   │
                                                   └── Counter >= threshold → STUCK
```

**Validation command ordering:**

1. **Tests** — Do the tests pass? Catches logic errors.
2. **Build** — Does it compile/transpile? Catches type errors, import issues.
3. **Lint** — Does it follow style rules? Catches formatting, convention violations.

Run in this order because test failures are more informative than build failures, and build failures are more informative than lint failures.

**Self-correction strategies:**

| Failure Type | Strategy |
|-------------|----------|
| Test failure | Read test expectations, fix implementation logic |
| Build/type error | Read error message, fix types or imports |
| Lint error | Apply formatter, fix style violations |
| Import not found | Search codebase for correct import path |
| Runtime error | Read stack trace, fix root cause |

**When backpressure fails:** After 3 consecutive self-correction attempts on the same task, the iteration increments the consecutive failure counter in LOOP-STATE.md and exits. If the counter reaches the stuck threshold, the loop halts.

</backpressure_steering>

<stuck_detection>

## Stuck Detection

Stuck detection prevents infinite loops when the system cannot make progress.

**Mechanism:**

```
consecutive_failures counter in LOOP-STATE.md
    │
    ├── Reset to 0 on every successful task commit
    │
    └── Increment by 1 when iteration exits without commit
            │
            └── If >= stuck_threshold (default: 3) → HALT
```

**Stuck signals and causes:**

| Signal | Cause | Resolution |
|--------|-------|------------|
| `STUCK: N consecutive validation failures` | Code changes keep breaking tests/build | Human reviews LEARNINGS.md constraints, fixes root cause |
| `STUCK: No actionable task found` | Task dependencies unclear or all tasks blocked | Human reviews PLAN.md, clarifies task order |
| `STUCK: Plan structure invalid` | PLAN.md malformed or missing sections | Human regenerates plan via `/lpl:plan-phase` |

**Recovery from stuck:**

1. Read LOOP-STATE.md to understand what failed
2. Read LEARNINGS.md Discovered Issues for context
3. Fix the root cause (update code, LEARNINGS.md, or PLAN.md)
4. Reset consecutive failures to 0 in LOOP-STATE.md
5. Resume with `/lpl:loop start`

**Stuck threshold tuning:**

- `stuck_threshold: 1` — Cautious. Stops on first failure. Good for unfamiliar codebases.
- `stuck_threshold: 3` — Default. Allows self-correction attempts.
- `stuck_threshold: 5` — Aggressive. More retries before stopping. Good for codebases with flaky tests.

</stuck_detection>

<exit_signals>

## Exit Signals

Each iteration outputs exactly one exit signal before terminating. The loop orchestrator parses this signal to determine the next action.

**Signal format:**

```
---
EXIT_SIGNAL: TASK_COMPLETE
ITERATION: 7
TASK: Create user model
COMMIT: a1b2c3d
NEXT: Task 2: Add validation
---
```

**Signal types:**

### TASK_COMPLETE

Task implemented, validated, and committed. More tasks remain in current plan.

**Orchestrator action:** Spawn next iteration for next task.

### PLAN_COMPLETE

All tasks in current PLAN.md completed. SUMMARY.md created.

**Orchestrator action:** Check for next plan in phase. If exists, spawn iteration for first task. If not, signal PHASE_COMPLETE.

### PHASE_COMPLETE

All plans in current phase completed. All SUMMARYs created.

**Orchestrator action:** Spawn lpl-verifier agent for goal-backward verification. If verification passes, mark phase complete. If gaps found, create gap-closure plans and re-enter loop.

### STUCK: [reason]

Cannot proceed without human intervention.

**Orchestrator action:** Halt loop. Display reason and LEARNINGS.md issues. Wait for human fix.

</exit_signals>

<human_observation_role>

## Human Observation Role

In the loop pattern, the human sits ON the loop, not IN it. The human's job is environment engineering — shaping the loop's behavior by updating persistent files.

**What the human observes:**

- Terminal output from each iteration
- Commit messages and diffs
- LOOP-STATE.md progress table
- LEARNINGS.md growing knowledge base

**What the human does:**

| Observation | Action |
|-------------|--------|
| Iteration uses wrong pattern | Add to LEARNINGS.md `## Patterns` |
| Iteration makes avoidable mistake | Add to LEARNINGS.md `## Constraints > Do NOT` |
| Iteration takes too long on lint | Remove lint from validation or adjust lint rules |
| Loop stuck on flaky test | Fix flaky test, reset failure counter |
| Code quality declining | Add specific constraints to LEARNINGS.md |
| Wrong architectural direction | Update LEARNINGS.md `## Constraints > Do` with correct approach |

**What the human does NOT do:**

- Write code (the loop does that)
- Run commands (the loop does that)
- Make task-level decisions (the loop does that)
- Manage git (the loop does that)

**Emergency controls:**

| Control | Effect |
|---------|--------|
| Ctrl+C | Immediate stop. May leave uncommitted changes. |
| `/lpl:loop stop` | Graceful stop after current task commits. |
| Edit LOOP-STATE.md `Status: stopping` | Same as `/lpl:loop stop`. |
| `git reset --hard` | Revert uncommitted changes from interrupted iteration. |

</human_observation_role>

<gap_closure_loop>

## Gap Closure Loop

When lpl-verifier reports gaps after PHASE_COMPLETE, the loop creates gap-closure plans and re-enters the iteration cycle.

**Flow:**

```
PHASE_COMPLETE
    │
    ▼
Spawn lpl-verifier
    │
    ├── PASS → Phase complete, update ROADMAP.md
    │
    └── GAPS_FOUND
            │
            ▼
        Create gap-closure plans
        (spawn lpl-planner with gap descriptions)
            │
            ▼
        Re-enter loop with gap-closure plans
            │
            ▼
        After gap-closure → Re-verify
            │
            ├── PASS → Phase complete
            │
            └── GAPS_FOUND → Create more gap plans (max 2 cycles)
                                │
                                └── After 2 cycles → STUCK: Persistent gaps
```

**Gap-closure plan naming:**

Gap-closure plans use the pattern `{phase}-{plan+1}-PLAN.md`:
- Original plans: `03-01-PLAN.md`, `03-02-PLAN.md`
- Gap-closure: `03-03-PLAN.md` (next sequential number)

**Max gap cycles:** 2. If gaps persist after 2 verification-and-fix cycles, the loop halts with STUCK signal. This prevents infinite gap-closure loops.

</gap_closure_loop>

<configuration>

## Configuration

Loop settings live in `.planning/config.json` under the `loop` key:

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

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Enable loop functionality |
| `max_iterations` | number | `50` | Maximum iterations before forced stop |
| `stuck_threshold` | number | `3` | Consecutive failures before STUCK signal |
| `parallel_waves` | boolean | `false` | Execute same-wave plans concurrently |
| `validation_commands` | string[] | `[]` | Commands that must pass before commit |

**Override via CLI:** `--max N` overrides `max_iterations` for a single run.

</configuration>

<state_files>

## State File Reference

| File | Purpose | Updated By | Read By |
|------|---------|------------|---------|
| `LOOP-STATE.md` | Loop position, iteration count, failures | Each iteration, orchestrator | Orchestrator, each iteration |
| `LEARNINGS.md` | Patterns, constraints, decisions, issues | Human + auto-capture | Each iteration |
| `STATE.md` | Project state, overall position | Each iteration (position) | Each iteration |
| `PLAN.md` | Task definitions, checkboxes | Each iteration (checkboxes) | Each iteration |
| `SUMMARY.md` | Plan completion records | Iteration on PLAN_COMPLETE | Orchestrator, verifier |
| `config.json` | Loop configuration | `init` subcommand, human | Orchestrator, each iteration |

</state_files>
