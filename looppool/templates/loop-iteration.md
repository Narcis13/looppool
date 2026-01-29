# Loop Iteration Template

Template for the prompt spawned on each loop iteration. Each iteration runs in a fresh 200k context — load state, execute one task, commit, exit.

---

## Prompt Template

```markdown
# Loop Iteration {{ITERATION_NUMBER}}

Phase: {{PHASE_NUMBER}} — {{PHASE_NAME}}

## Context Loading

Read these files IN ORDER before any action:

1. `.planning/LOOP-STATE.md` — Current position, iteration count, failure tracking
2. `.planning/LEARNINGS.md` — Operational patterns, constraints, validation commands
3. `.planning/STATE.md` — Project state, decisions, blockers
4. Current PLAN.md — Task definitions and verification criteria

```bash
cat .planning/LOOP-STATE.md
cat .planning/LEARNINGS.md
cat .planning/STATE.md
```

Identify the next incomplete task from PLAN.md. A task is incomplete when:
- PLAN.md checkbox is unchecked `- [ ]`
- No matching commit exists for this task

## Task Selection

Parse PLAN.md tasks in order. Select the FIRST task where:
1. All prior tasks are complete (checked or committed)
2. Task verification has not passed

If all tasks in current PLAN.md are complete:
- Create SUMMARY.md for this plan
- Output signal: `PLAN_COMPLETE`
- Exit

If all plans in phase are complete:
- Output signal: `PHASE_COMPLETE`
- Exit

If no actionable task found (dependency blocked, unclear):
- Output signal: `STUCK: No actionable task found`
- Exit

## Execution

Execute the selected task following LPL executor conventions:

1. **Read context files** listed in PLAN.md `<context>` section
2. **Search codebase first** — understand existing patterns before writing code
3. **Implement** following patterns from LEARNINGS.md
4. **Validate** using validation commands from LEARNINGS.md:

```bash
{{VALIDATION_COMMANDS}}
```

5. **Self-correct** if validation fails:
   - Analyze failure output
   - Apply fix
   - Re-validate
   - Max 3 self-correction attempts per task
   - After 3 failures: increment `Consecutive failures` in LOOP-STATE.md

## Stuck Detection

Track consecutive validation failures:

```bash
FAILURES=$(grep -o 'Consecutive failures: [0-9]*' .planning/LOOP-STATE.md | grep -o '[0-9]*')
THRESHOLD={{STUCK_THRESHOLD}}
```

If `FAILURES >= THRESHOLD`:
- Output signal: `STUCK: {{FAILURES}} consecutive validation failures`
- Exit (loop halts, needs human intervention)

## Commit

After task passes validation:

```bash
# Stage task files individually (never git add .)
git add [specific files]

# Atomic commit
git commit -m "$(cat <<'EOF'
{{COMMIT_TYPE}}({{PHASE}}-{{PLAN}}): {{TASK_NAME}}

Loop iteration {{ITERATION_NUMBER}}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"

COMMIT_HASH=$(git rev-parse --short HEAD)
```

## State Update

Update `.planning/LOOP-STATE.md`:

```markdown
Iteration: {{ITERATION_NUMBER}}
Consecutive failures: 0  # Reset on success
```

Append to Task Progress table:

```markdown
| {{ITERATION_NUMBER}} | {{PLAN}} | {{TASK_NAME}} | complete | {{COMMIT_HASH}} | TASK_COMPLETE |
```

Update PLAN.md checkbox for completed task: `- [x]`

## Auto-Capture Learnings

If this iteration discovered something worth capturing:

**Patterns discovered** — append to LEARNINGS.md `## Patterns`:
- File naming conventions encountered
- API patterns used
- Code structure patterns followed

**Constraints discovered** — append to LEARNINGS.md `## Constraints`:
- Things that broke and why
- Anti-patterns to avoid

**Decisions made** — append to LEARNINGS.md `## Session Decisions`:
- Architectural choices
- Library selections
- Trade-off resolutions

Only append if genuinely new information. Do not repeat existing entries.

## Exit

Output exactly ONE exit signal and stop:

| Signal | Meaning | Loop Action |
|--------|---------|-------------|
| `TASK_COMPLETE` | Task done, more tasks remain | Continue loop |
| `PLAN_COMPLETE` | All tasks in plan done, SUMMARY.md created | Continue to next plan |
| `PHASE_COMPLETE` | All plans in phase done | Trigger verification |
| `STUCK: [reason]` | Cannot proceed | Halt loop, needs human |

**Format:**

```
---
EXIT_SIGNAL: {{SIGNAL}}
ITERATION: {{ITERATION_NUMBER}}
TASK: {{TASK_NAME}}
COMMIT: {{COMMIT_HASH}}
NEXT: {{NEXT_TASK_OR_PLAN}}
---
```

After outputting exit signal: EXIT IMMEDIATELY. Do not start another task. Fresh context on next iteration.
```

---

<purpose>
The loop iteration template is the unit of work in the autonomous loop. Each iteration runs in a fresh 200k context, preventing context rot.

**Key principle:** One task per context. Load state, execute, commit, exit. The loop orchestrator handles continuity between iterations.

**Relationship to Ralph's PROMPT_build.md:** This replaces Ralph's iteration prompt with LPL-aware task selection, structured validation, and LEARNINGS.md integration.
</purpose>

<placeholder_reference>

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{{ITERATION_NUMBER}}` | LOOP-STATE.md counter | `7` |
| `{{PHASE_NUMBER}}` | Current phase | `03` |
| `{{PHASE_NAME}}` | ROADMAP.md phase name | `api-endpoints` |
| `{{VALIDATION_COMMANDS}}` | LEARNINGS.md or config.json | `npm test && npm run build` |
| `{{STUCK_THRESHOLD}}` | config.json loop.stuck_threshold | `3` |
| `{{COMMIT_TYPE}}` | Inferred from task | `feat`, `fix`, `test` |
| `{{PHASE}}` | Phase number | `03` |
| `{{PLAN}}` | Plan number | `01` |
| `{{TASK_NAME}}` | From PLAN.md task name | `Create user model` |
| `{{SIGNAL}}` | Determined at exit | `TASK_COMPLETE` |
| `{{COMMIT_HASH}}` | Git after commit | `a1b2c3d` |
| `{{NEXT_TASK_OR_PLAN}}` | Next incomplete task/plan | `Task 2: Add validation` |

</placeholder_reference>
