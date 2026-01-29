# Execute-Plan Segment Routing Reference

This reference covers the segmentation and routing logic for execute-plan workflow: how to parse plans into execution segments, route segments to optimal execution contexts (subagent vs main), and manage agent tracking infrastructure.

## Overview

Plans are divided into segments by checkpoints. Each segment is routed to optimal execution context for quality preservation. Fresh subagent contexts prevent context rot while keeping orchestration lean.

## Segment Parsing

**Identify checkpoints in the plan:**

```bash
# Find all checkpoints and their types
grep -n "type=\"checkpoint" .planning/phases/XX-name/{phase}-{plan}-PLAN.md
```

**Analyze checkpoint types:**

```bash
# Extract checkpoint type for routing decisions
grep "type=\"checkpoint" PLAN.md | grep -o 'checkpoint:[^"]*'
```

**Build segment map:**

A segment = tasks between checkpoints (or start to first checkpoint, or last checkpoint to end)

```
Segment 1: Start → first checkpoint (tasks 1-X)
Checkpoint 1: Type and location
Segment 2: After checkpoint 1 → next checkpoint (tasks X+1 to Y)
Checkpoint 2: Type and location
... continue for all segments
```

## Routing Rules

For each segment, determine execution context:

| Prior Checkpoint | Routing Decision | Reason |
|------------------|------------------|--------|
| None (first segment) | SUBAGENT | Nothing to depend on |
| checkpoint:human-verify | SUBAGENT | Verification is just confirmation |
| checkpoint:decision | MAIN CONTEXT | Next tasks need the decision |
| checkpoint:human-action | MAIN CONTEXT | Next tasks need the result |

**Decision logic:**

```
IF segment has no prior checkpoint:
  → SUBAGENT (first segment, nothing to depend on)

IF segment follows checkpoint:human-verify:
  → SUBAGENT (verification is just confirmation, doesn't affect next work)

IF segment follows checkpoint:decision OR checkpoint:human-action:
  → MAIN CONTEXT (next tasks need the decision/result)
```

## Execution Patterns

### Pattern A: Fully Autonomous (No Checkpoints)

When no checkpoints found in the plan:

```
Spawn subagent → execute all tasks → SUMMARY → commit → report back
```

**Implementation:**

1. Run init_agent_tracking step first
2. Use Task tool with subagent_type="lpl-executor"
3. Prompt includes: full plan path, deviation rules reference, summary/commit instructions
4. Track agent_id in current-agent-id.txt and agent-history.json
5. Wait for subagent completion
6. Update tracking on completion
7. Report to user

**Subagent prompt template:**

```
Execute plan at .planning/phases/{phase}-{plan}-PLAN.md

This is an autonomous plan (no checkpoints). Execute all tasks, create SUMMARY.md in phase directory, commit with message following plan's commit guidance.

Follow all deviation rules and authentication gate protocols from the plan.

When complete, report: plan name, tasks completed, SUMMARY path, commit hash.
```

### Pattern B: Segmented (Verify-Only Checkpoints)

When checkpoints exist but are all verify-only:

```
Segment 1 (tasks 1-3): Spawn subagent → execute → report back
Checkpoint 4 (human-verify): Main context → verify → continue
Segment 2 (tasks 5-6): Spawn NEW subagent → execute → report back
Checkpoint 7 (human-verify): Main context → verify → continue
Aggregate results → SUMMARY → commit
```

Each subagent gets fresh context. Main context stays lean (~15% usage).

**Segment subagent prompt:**

```
Execute tasks [X-Y] from plan at .planning/phases/{phase}-{plan}-PLAN.md.

**Context:**
- Read the full plan for objective, context files, and deviation rules
- You are executing a SEGMENT of this plan (not the full plan)
- Other segments will be executed separately

**Your responsibilities:**
- Execute only the tasks assigned to you
- Follow all deviation rules and authentication gate protocols
- Track deviations for later Summary
- DO NOT create SUMMARY.md (will be created after all segments complete)
- DO NOT commit (will be done after all segments complete)

**Report back:**
- Tasks completed
- Files created/modified
- Deviations encountered
- Any issues or blockers
```

### Pattern C: Decision-Dependent (Must Stay in Main)

When checkpoints include decisions or human actions that affect subsequent tasks:

```
Checkpoint 1 (decision): Main context → decide → continue in main
Tasks 2-5: Main context (need decision from checkpoint 1)
No segmentation benefit - execute entirely in main
Quality maintained through small scope (2-3 tasks per plan)
```

## Agent Tracking Infrastructure

### Initialization

Before spawning any subagents, set up tracking:

```bash
# Create agent history file if doesn't exist
if [ ! -f .planning/agent-history.json ]; then
  echo '{"version":"1.0","max_entries":50,"entries":[]}' > .planning/agent-history.json
fi

# Clear any stale current-agent-id (from interrupted sessions)
rm -f .planning/current-agent-id.txt
```

### Resume Detection

Check for interrupted agents from previous sessions:

```bash
if [ -f .planning/current-agent-id.txt ]; then
  INTERRUPTED_ID=$(cat .planning/current-agent-id.txt)
  echo "Found interrupted agent: $INTERRUPTED_ID"
fi
```

**If interrupted agent found:**
- Agent ID file exists from previous session that didn't complete
- Present to user: "Previous session was interrupted. Resume agent [ID] or start fresh?"
- If resume: Use Task tool with `resume` parameter set to the interrupted ID
- If fresh: Clear the file and proceed normally

### Spawn Tracking

When spawning a subagent:

1. Write agent_id to current-agent-id.txt:
   ```bash
   echo "[agent_id]" > .planning/current-agent-id.txt
   ```

2. Append spawn entry to agent-history.json:
   ```json
   {
     "agent_id": "[agent_id from Task response]",
     "task_description": "Execute full plan {phase}-{plan} (autonomous)",
     "phase": "{phase}",
     "plan": "{plan}",
     "segment": null,
     "timestamp": "[ISO timestamp]",
     "status": "spawned",
     "completion_timestamp": null
   }
   ```

### Completion Tracking

After subagent completes successfully:

1. Update agent-history.json entry:
   - Find entry with matching agent_id
   - Set status: "completed"
   - Set completion_timestamp: "[ISO timestamp]"

2. Clear current-agent-id.txt:
   ```bash
   rm .planning/current-agent-id.txt
   ```

### Housekeeping

If agent-history.json has more than `max_entries`:
- Remove oldest entries with status "completed"
- Never remove entries with status "spawned" (may need resume)
- Keep file under size limit for fast reads

## Segment Execution Loop

**Detailed flow for Pattern B (segmented plans):**

1. **Parse plan to identify segments:**
   - Read plan file
   - Find checkpoint locations
   - Identify checkpoint types
   - Build segment map

2. **For each segment in order:**

   A. Determine routing (apply rules above)

   B. If routing = Subagent:
      - Spawn Task tool with lpl-executor
      - Write agent_id to tracking
      - Wait for completion
      - Update tracking on completion
      - Capture results

   C. If routing = Main context:
      - Execute tasks using standard execution flow
      - Track results locally

   D. After segment completes:
      - Continue to next checkpoint/segment

3. **After ALL segments complete:**

   A. Aggregate results from all segments:
      - Collect files created/modified
      - Collect deviations
      - Collect decisions from checkpoints

   B. Create SUMMARY.md with aggregated results

   C. Commit all changes with appropriate message

   D. Report completion

## Example Execution Trace

```
Plan: 01-02-PLAN.md (8 tasks, 2 verify checkpoints)

Parsing segments...
- Segment 1: Tasks 1-3 (autonomous)
- Checkpoint 4: human-verify
- Segment 2: Tasks 5-6 (autonomous)
- Checkpoint 7: human-verify
- Segment 3: Task 8 (autonomous)

Routing analysis:
- Segment 1: No prior checkpoint → SUBAGENT
- Checkpoint 4: Verify only → MAIN (required)
- Segment 2: After verify → SUBAGENT
- Checkpoint 7: Verify only → MAIN (required)
- Segment 3: After verify → SUBAGENT

Execution:
[1] Spawning subagent for tasks 1-3...
    → Subagent completes: 3 files modified, 0 deviations
[2] Executing checkpoint 4 (human-verify)...
    → User: "approved"
[3] Spawning subagent for tasks 5-6...
    → Subagent completes: 2 files modified, 1 deviation
[4] Executing checkpoint 7 (human-verify)...
    → User: "approved"
[5] Spawning subagent for task 8...
    → Subagent completes: 1 file modified, 0 deviations

Aggregating results...
- Total files: 6 modified
- Total deviations: 1
- Segmented execution: 3 subagents, 2 checkpoints

Creating SUMMARY.md...
Committing...
Complete
```

**Benefit:** Each subagent starts fresh (~20-30% context), enabling larger plans without quality degradation.
