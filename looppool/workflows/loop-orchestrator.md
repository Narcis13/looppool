<purpose>
Orchestrate the autonomous loop for /lpl:loop start. Spawns iteration agents with fresh context, monitors exit signals, triggers verification on phase completion, handles gap closure.
</purpose>

<core_principle>
The orchestrator's job is coordination, not execution. Each iteration agent gets fresh 200k context, loads state from persistent files, executes one task, commits, and exits. The orchestrator spawns the next iteration, checks signals, and handles transitions.

One task per context. Quality stays at peak. The loop itself is the product.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
Read config.json for loop settings.
Read LOOP-STATE.md for current loop position.

@~/.claude/looppool/references/loop-mechanics.md
@~/.claude/looppool/references/autonomous.md
@~/.claude/looppool/templates/loop-iteration.md
</required_reading>

<process>

<step name="resolve_model_profile" priority="first">
Read model profile for agent spawning:

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| loop-iteration (lpl-executor) | opus | sonnet | sonnet |
| lpl-verifier | sonnet | sonnet | haiku |
| lpl-planner (gap closure) | opus | opus | sonnet |

Store resolved models for use in Task calls below.
</step>

<step name="load_loop_state">
Read loop state and configuration:

```bash
cat .planning/LOOP-STATE.md 2>/dev/null
cat .planning/config.json 2>/dev/null
cat .planning/STATE.md 2>/dev/null
cat .planning/LEARNINGS.md 2>/dev/null
```

Extract:
- `ITERATION` — current iteration count
- `MAX_ITER` — maximum iterations
- `STUCK_THRESHOLD` — consecutive failure limit
- `STATUS` — running, stopping, stopped, complete
- `CONSECUTIVE_FAILURES` — current failure count
- `PHASE` — target phase

If `STATUS = stopping` or `STATUS = stopped`: Exit immediately.

```
Loop stopped. Run /lpl:loop start to resume.
```
</step>

<step name="identify_next_task">
Determine what to execute next:

```bash
# Find current phase directory
PADDED_PHASE=$(printf "%02d" ${PHASE} 2>/dev/null || echo "${PHASE}")
PHASE_DIR=$(ls -d .planning/phases/${PADDED_PHASE}-* .planning/phases/${PHASE}-* 2>/dev/null | head -1)

# Count plans and summaries
PLAN_COUNT=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
SUMMARY_COUNT=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
```

**If all plans have summaries (`SUMMARY_COUNT >= PLAN_COUNT`):**
- Phase complete. Go to **verify_phase** step.

**If incomplete plans exist:**
- Find first PLAN.md without matching SUMMARY.md
- Read that plan to identify first unchecked task
- This becomes the target for next iteration
</step>

<step name="iteration_loop">
Execute iterations until phase complete, stuck, or max reached.

**Loop control:**

```
while ITERATION < MAX_ITER:
    1. Check stop signal
    2. Spawn iteration agent
    3. Parse exit signal
    4. Route based on signal
    5. Increment iteration
```

**For each iteration:**

**1. Check stop signal:**

```bash
grep -o 'Status: [a-z]*' .planning/LOOP-STATE.md | cut -d' ' -f2
```

If `stopping` → complete current task and exit loop.

**2. Read current context for iteration prompt:**

```bash
LOOP_STATE=$(cat .planning/LOOP-STATE.md)
LEARNINGS=$(cat .planning/LEARNINGS.md 2>/dev/null || echo "No learnings file found.")
STATE=$(cat .planning/STATE.md)
CURRENT_PLAN=$(cat "$PHASE_DIR"/${NEXT_PLAN}-PLAN.md)
CONFIG=$(cat .planning/config.json 2>/dev/null)
```

Extract validation commands:

```bash
VALIDATION_CMDS=$(cat .planning/config.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(' && '.join(d.get('loop',{}).get('validation_commands',[])))" 2>/dev/null || echo "")
```

If empty, fall back to LEARNINGS.md validation commands section.

**3. Spawn iteration agent:**

Fill loop-iteration template with current values and inline content:

```
Task(
  prompt="
# Loop Iteration ${ITERATION}

Phase: ${PHASE} — ${PHASE_NAME}

## Context

### LOOP-STATE.md
${LOOP_STATE}

### LEARNINGS.md
${LEARNINGS}

### STATE.md
${STATE}

### Current Plan
${CURRENT_PLAN}

## Instructions

1. Identify the next incomplete task in the plan above
2. Search codebase to understand existing patterns before writing code
3. Implement the task following patterns from LEARNINGS.md
4. Validate with: ${VALIDATION_CMDS}
5. Self-correct if validation fails (max 3 attempts)
6. Commit atomically (stage files individually, never git add .)
7. Update LOOP-STATE.md iteration count and task progress table
8. Update PLAN.md checkbox for completed task
9. If all tasks in plan complete: create SUMMARY.md using template
10. Output exit signal and EXIT

## Exit Signals

Output exactly ONE signal before exiting:
- TASK_COMPLETE — task done, more tasks remain
- PLAN_COMPLETE — all tasks in plan done, SUMMARY.md created
- PHASE_COMPLETE — all plans in phase done
- STUCK: [reason] — cannot proceed

## Exit Format

---
EXIT_SIGNAL: [signal]
ITERATION: ${ITERATION}
TASK: [task name]
COMMIT: [hash]
NEXT: [next task or plan]
---

After outputting exit signal: EXIT IMMEDIATELY.

## Commit Convention

Commit format: {type}(${PHASE}-${PLAN}): {task description}
Include: Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
",
  subagent_type="lpl-executor",
  model="${iteration_model}",
  description="Loop iter ${ITERATION}: ${PHASE}"
)
```

**4. Parse exit signal from agent response:**

Extract signal from agent output. Look for `EXIT_SIGNAL:` line.

| Signal | Action |
|--------|--------|
| `TASK_COMPLETE` | Reset failures to 0. Increment iteration. Continue loop. |
| `PLAN_COMPLETE` | Reset failures to 0. Increment iteration. Identify next plan. If no more plans: go to **verify_phase**. Otherwise continue loop. |
| `PHASE_COMPLETE` | Go to **verify_phase** step. |
| `STUCK: [reason]` | Go to **handle_stuck** step. |
| No signal / unclear | Increment failures. If >= threshold: go to **handle_stuck**. Otherwise retry. |

**5. Update LOOP-STATE.md:**

After each iteration, update:
- `Iteration: [new count]`
- `Consecutive failures: [count]`
- Append to Task Progress table

**6. Report iteration result:**

Brief output per iteration:

```
Iteration ${ITERATION}: ${TASK_NAME} — ${SIGNAL} [${COMMIT_HASH}]
```

</step>

<step name="verify_phase">
All plans complete. Trigger goal-backward verification.

**Spawn verifier:**

```bash
PHASE_GOAL=$(grep -A 5 "## Phase ${PHASE}" .planning/ROADMAP.md | grep -E "Goal:|Objective:" | head -1)
```

```
Task(
  prompt="Verify phase ${PHASE} goal achievement.

Phase directory: ${PHASE_DIR}
Phase goal: ${PHASE_GOAL}

Check must_haves against actual codebase. Create VERIFICATION.md.
Verify what actually exists in the code — do not trust SUMMARY claims.",
  subagent_type="lpl-verifier",
  model="${verifier_model}",
  description="Verify phase ${PHASE}"
)
```

**Read verification result:**

```bash
VERIFY_STATUS=$(grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md 2>/dev/null | tail -1 | cut -d: -f2 | tr -d ' ')
```

**Route by status:**

| Status | Action |
|--------|--------|
| `passed` | Go to **phase_complete** |
| `gaps_found` | Go to **gap_closure** |
| `human_needed` | Present items, proceed to **phase_complete** with notes |

</step>

<step name="gap_closure">
Verification found gaps. Create gap-closure plans and re-enter loop.

**Track gap closure cycles:**

```bash
GAP_CYCLE=$(grep -o 'Gap closure cycle: [0-9]*' .planning/LOOP-STATE.md | grep -o '[0-9]*' || echo "0")
```

If `GAP_CYCLE >= 2`:
- Max gap closure cycles reached
- Go to **handle_stuck** with reason "Persistent gaps after 2 closure cycles"

**Spawn planner for gap closure:**

```bash
VERIFICATION=$(cat "$PHASE_DIR"/*-VERIFICATION.md)
```

```
Task(
  prompt="Create gap-closure plans for phase ${PHASE}.

Verification report:
${VERIFICATION}

Phase directory: ${PHASE_DIR}
Existing plans: ${PLAN_COUNT}

Create new plans (numbered sequentially after existing) with gap_closure: true in frontmatter.
Each plan targets specific gaps from verification report.
Plans should have 1-2 tasks each — focused and atomic.",
  subagent_type="lpl-planner",
  model="${planner_model}",
  description="Gap closure plans: phase ${PHASE}"
)
```

**After planner returns:**
1. Verify new PLAN.md files created
2. Increment `Gap closure cycle` in LOOP-STATE.md
3. Re-enter **iteration_loop** with new plans

Report:

```
Gap closure cycle ${GAP_CYCLE + 1}: ${NEW_PLAN_COUNT} plans created
Re-entering loop...
```
</step>

<step name="phase_complete">
Phase verified and complete.

**Update LOOP-STATE.md:**

```markdown
Status: complete
```

**Update ROADMAP.md:**

Mark phase complete with date.

**Update STATE.md:**

Update current position to next phase.

**Commit planning docs:**

```bash
COMMIT_PLANNING_DOCS=$(cat .planning/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .planning 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

If `COMMIT_PLANNING_DOCS=true`:
```bash
git add .planning/LOOP-STATE.md .planning/ROADMAP.md .planning/STATE.md
git add "$PHASE_DIR"/*-VERIFICATION.md 2>/dev/null
git commit -m "$(cat <<'EOF'
docs(${PHASE}): complete phase via loop

Loop iterations: ${ITERATION}
Verification: passed

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**Report:**

```
---

LPL > LOOP PHASE COMPLETE

Phase: ${PHASE} — ${PHASE_NAME}
Iterations: ${ITERATION}
Plans: ${PLAN_COUNT} completed
Verification: passed

---

## Next Up

[If more phases in milestone:]
/lpl:loop start [next phase]

[If milestone complete:]
/lpl:complete-milestone

---
```
</step>

<step name="handle_stuck">
Loop cannot proceed without human intervention.

**Update LOOP-STATE.md:**

```markdown
Status: stuck
Stuck reason: ${REASON}
```

**Report:**

```
---

LPL > LOOP STUCK

Phase: ${PHASE} — ${PHASE_NAME}
Iteration: ${ITERATION}
Reason: ${REASON}
Consecutive failures: ${CONSECUTIVE_FAILURES}

## Recent Issues

[Extract from LEARNINGS.md Discovered Issues table — last 3 entries]

## Recovery Steps

1. Review the failure reason above
2. Check LEARNINGS.md for related constraints
3. Fix the root cause (code, tests, or plan)
4. Reset: Edit LOOP-STATE.md → Status: running, Consecutive failures: 0
5. Resume: /lpl:loop start ${PHASE}

---
```
</step>

</process>

<success_criteria>
- Each iteration spawns fresh agent with full context
- Exit signals parsed and routed correctly
- TASK_COMPLETE continues loop
- PLAN_COMPLETE transitions to next plan or phase verification
- PHASE_COMPLETE triggers lpl-verifier
- Gap closure creates new plans and re-enters loop
- Stuck detection halts loop with actionable report
- Max iterations enforced as safety limit
- Graceful stop via LOOP-STATE.md status change
- All state persisted for recovery after crash
</success_criteria>

<context_efficiency>
Orchestrator: ~15-20% context (state management, spawning, signal routing).
Iteration agents: Fresh 200k each (one task per context).
No polling — Task tool blocks until agent completes.
No context bleed between iterations.
</context_efficiency>

<failure_handling>
**Iteration agent fails to return:**
- No exit signal found in response
- Increment consecutive failures
- Log issue in LOOP-STATE.md
- Continue if under threshold, stuck if over

**Git state corrupted:**
- Uncommitted changes from crashed iteration
- Recovery: `git reset --hard` to last commit
- Resume from LOOP-STATE.md position

**LEARNINGS.md grows too large:**
- Iteration context loading exceeds budget
- Human consolidates LEARNINGS.md (merge duplicates, archive resolved)
- Keep under 150 lines

**Max iterations reached:**
- Safety limit hit
- Update LOOP-STATE.md status to "max_reached"
- Report progress and remaining work
</failure_handling>
