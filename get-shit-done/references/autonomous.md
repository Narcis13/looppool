# Autonomous Mode Reference

Reference documentation for implementing autonomous decision-making in GSD workflows.

## Overview

Autonomous mode enables GSD to execute from `/gsd:new-project` through `/gsd:execute-phase` with zero human input. When `autonomous: true` in config, Claude makes all decisions automatically, outputting traces for visibility.

**Core principle:** Full commitment. When autonomous mode is enabled, ALL decision points are auto-decided. No partial autonomy. This creates predictable behavior - either fully interactive or fully autonomous.

**Why:** Interactive mode requires human at keyboard for every decision. Autonomous mode allows overnight runs, CI integration, and batch processing. Partial autonomy creates unpredictable UX where some decisions prompt and others don't.

## Config Flag Reading (VOICE-01)

The canonical pattern for reading the autonomous flag. Use this EXACT pattern everywhere.

```bash
AUTONOMOUS=$(cat .planning/config.json 2>/dev/null | grep -o '"autonomous"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "false")
```

**Behavior:**
- Returns `true` if config has `"autonomous": true`
- Returns `false` if config has `"autonomous": false`
- Returns `false` (default) if config.json is missing
- Returns `false` (default) if autonomous field is missing

**Important:**
- Check flag ONCE at workflow start, store in variable
- Do NOT re-read for each decision (consistency)
- Default is `false` - interactive mode is the safe default

**Example config.json:**
```json
{
  "mode": "yolo",
  "depth": "standard",
  "autonomous": true
}
```

## Decision Trace Format (VOICE-02)

Every autonomous decision outputs a trace. This enables:
- User visibility into what was decided
- Audit trail for debugging
- Consistency verification across runs

**Format:**
```
Auto-decided: [choice] — [reason]
```

Note: Use em-dash (—) not hyphen (-) for consistency.

**Examples:**

```
Auto-decided: approved — All verification checks passed (tests: 42/42, build: success)
```

```
Auto-decided: proceed — No blocking issues found in previous phase
```

```
Auto-decided: standard depth — Insufficient context, using documented default
```

```
Auto-decided: supabase — PROJECT.md specifies PostgreSQL database, Supabase is already in stack
```

```
Auto-decided: skip research — Brownfield project with existing codebase map
```

**Trace rules:**
- Output trace BEFORE proceeding (not after)
- Include concrete evidence in reason (file names, test counts, specific context)
- Keep traces brief but substantive (one line, no filler)
- Never output trace silently in logs - always visible in response

## Autonomous Decision Wrapper Pattern

The if/else structure that wraps every decision point. This preserves interactive mode unchanged.

```markdown
<step name="some_decision_point">
Check AUTONOMOUS flag from workflow start.

**If AUTONOMOUS=true:**

[Read relevant context files]
[Apply decision policy or use default]
[Output trace]

```
Auto-decided: [choice] — [reason based on context]
```

Continue to next step.

**If AUTONOMOUS=false:**

[Existing AskUserQuestion or checkpoint handling - UNCHANGED]
```

**Critical:** The `AUTONOMOUS=false` path must be IDENTICAL to the original interactive code. Autonomy is additive, not a replacement.

**Anti-pattern:**
```markdown
# WRONG - modifies both paths
**If AUTONOMOUS=true:**
  [autonomous handling]

**If AUTONOMOUS=false:**
  [modified interactive handling]  # BAD - should be unchanged
```

**Correct pattern:**
```markdown
# RIGHT - only autonomous path is new
**If AUTONOMOUS=true:**
  [autonomous handling]

**If AUTONOMOUS=false:**
  [existing interactive handling - copied exactly from before autonomy was added]
```

## Full Commitment Mode (VOICE-05)

When `autonomous: true`, ALL decisions are auto-decided. No exceptions. No partial autonomy.

**What this means:**
- Every `AskUserQuestion` call is intercepted
- Every `checkpoint:decision` is auto-selected
- Every `checkpoint:human-verify` is auto-approved (if tests pass)
- Every planning decision uses policies

**What this does NOT mean:**
- `checkpoint:human-action` is NOT auto-completed (requires human-only action like email click)
- Destructive operations still follow safety rules
- Authentication gates still require human credentials

**Why no partial autonomy:**
- Creates unpredictable UX (user doesn't know which decisions will prompt)
- Makes testing harder (can't reproduce runs reliably)
- Complicates documentation (have to explain which decisions are which)

**The contract:** When user sets `autonomous: true`, they accept ALL decisions will be made automatically. If they want control over specific decisions, they use interactive mode.

## Key Rules

1. **Always output trace before proceeding**
   - Trace goes in Claude's response, visible to user
   - Never silently make decisions

2. **Never silently skip decisions**
   - Even if decision seems trivial, output trace
   - User should see every decision made

3. **Preserve original interactive code paths unchanged**
   - Interactive mode must work exactly as before
   - Copy/paste original code into `AUTONOMOUS=false` branch

4. **Check flag once at workflow start**
   - Store in variable: `AUTONOMOUS=$(...)`
   - Reference variable at each decision point
   - Avoids inconsistency from config changes mid-run

5. **Default is false (interactive)**
   - Missing config → interactive
   - Missing field → interactive
   - Parse error → interactive
   - Fail safe to human control

6. **Context before decision**
   - Read relevant files before deciding
   - Reference specific context in trace reason
   - Vague traces are useless for debugging

## Decision Point Types

### 1. Binary Decisions (yes/no, proceed/stop)

```markdown
**If AUTONOMOUS=true:**

[Check conditions]

If [condition met]:
```
Auto-decided: proceed — [evidence from context]
```
Continue.

If [condition not met]:
```
Auto-decided: stop — [evidence from context]
```
[Handle stop case]

**If AUTONOMOUS=false:**
[Original AskUserQuestion for confirmation]
```

### 2. Multiple Choice Decisions

```markdown
**If AUTONOMOUS=true:**

[Read context: PROJECT.md, REQUIREMENTS.md, relevant files]
[Apply selection policy]

```
Auto-decided: [selected option] — [context-based reason]
```
Continue with selected option.

**If AUTONOMOUS=false:**
[Original AskUserQuestion with options list]
```

### 3. Checkpoint Decisions

```markdown
**If AUTONOMOUS=true:**

Checkpoint type: [decision | human-verify | human-action]

**checkpoint:decision:**
Apply decision policy, select option.
```
Auto-decided: [option] — [policy-based reason]
```
Continue.

**checkpoint:human-verify:**
Run automated verification (tests, builds, endpoints).
If ALL pass:
```
Auto-decided: approved — All verification checks passed [details]
```
Continue.
If ANY fail: Fall back to human even in autonomous mode.

**checkpoint:human-action:**
Cannot be autonomous. Wait for human.
```
Autonomous mode: Human action required for [action], cannot proceed automatically
```

**If AUTONOMOUS=false:**
[Existing checkpoint handling - unchanged]
```

## Integration Example

Complete workflow step showing autonomous integration:

```markdown
<step name="check_previous_issues">
Read STATE.md for accumulated issues from previous phases.

**If AUTONOMOUS=true:**

Read .planning/STATE.md Blockers/Concerns section.

If empty or all items are informational:
```
Auto-decided: proceed — No blocking issues found (STATE.md concerns: 0 blocking, 2 informational)
```
Continue to planning.

If blocking issues exist:
[Apply resolution policy or use documented default]
```
Auto-decided: [resolution] — [policy or default reason]
```
Continue with resolution.

**If AUTONOMOUS=false:**

If issues exist:
Use AskUserQuestion:
- header: "Previous Phase Issues"
- question: "The previous phase raised these concerns: [list]. How should we proceed?"
- options: ["Address now", "Defer to later phase", "Ignore (not blocking)"]

Wait for user response.

If no issues:
Continue to planning.
</step>
```

## Files That Read This Flag

After autonomous mode is fully implemented, these files will use the pattern:

**Workflows:**
- `execute-phase.md` - Phase-level autonomous checkpoints
- `execute-plan.md` - Plan-level checkpoint handling
- `discuss-phase.md` - Discussion area selection
- `discovery-phase.md` - Confidence gate handling
- `plan-phase.md` - Planning decision points

**Agents:**
- `gsd-executor.md` - Deviation decisions during execution
- `gsd-planner.md` - Planning decisions

**Note:** This list will expand as Phase 4 (Workflow Integration) implements FLOW-01 through FLOW-04.

## See Also

- `autonomous-defaults.md` - Documented defaults for graceful degradation
- `checkpoints.md` - Checkpoint types and verification patterns
- `.planning/config.json` - Configuration file with autonomous flag
