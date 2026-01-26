# Autonomous Mode Defaults Reference

Documented defaults for graceful degradation when context is insufficient (VOICE-07).

## Overview

When autonomous mode cannot determine a decision from available context, use documented defaults and log assumptions. Never fail silently. Never make decisions without trace output.

**Purpose:**
- Robustness: Execution continues even with incomplete context
- Visibility: All assumptions are logged for debugging
- Consistency: Same defaults applied every time
- Safety: Defaults are conservative (safest/most reversible option)

**Principle:** Better to use a safe default with logged assumption than to silently pick randomly or fail unexpectedly.

## Checkpoint Defaults

How to handle each checkpoint type in autonomous mode.

### checkpoint:human-verify

**Default behavior:** Auto-approve if ALL automated verifications pass.

**Automated verifications to run:**
1. `npm test` (or equivalent for project) - Must pass 100%
2. `npm run build` - Must succeed, no errors
3. `curl` endpoint checks - Must return expected status codes
4. `npm run lint` (if exists) - Must pass or only have warnings

**Decision logic:**

```
If ALL verifications pass:
  Auto-decided: approved — All verification checks passed (tests: 42/42, build: success, endpoints: 3/3)
  Continue to next task.

If ANY verification fails:
  Fall back to human even in autonomous mode.
  Output:
    Autonomous mode: Verification failed, human review required
    - Tests: 40/42 (2 failed)
    - Build: success
    - Endpoints: 3/3
  Wait for human input.
```

**Rationale:** Visual verification is what humans do best. But if all automated checks pass, the verification likely would have passed visual inspection too. Failures always require human eyes.

**Note:** This means `checkpoint:human-verify` with failing tests blocks autonomous execution. This is intentional - autonomous mode doesn't skip quality gates.

### checkpoint:decision

**Default behavior:** Apply policy-based selection. If no policy matches, select safest option.

**Decision logic:**

```
1. Check if decision type has documented policy (see Phase 3 policies)
2. If policy exists: Apply policy, select option
   Auto-decided: [option] — Policy: [policy name] matches [context evidence]

3. If no policy exists or policy inconclusive:
   Select safest/most reversible option
   Auto-decided: [option] — No policy match, selected safest option (most reversible)
```

**"Safest option" heuristics:**
- Prefer standard/default over custom
- Prefer established libraries over new ones
- Prefer smaller scope over larger
- Prefer reversible over irreversible
- Prefer explicit over implicit

**Example:**
```
Decision: Database selection
Options: PostgreSQL, MongoDB, SQLite

If PROJECT.md specifies "relational data":
  Auto-decided: postgresql — PROJECT.md specifies relational data, PostgreSQL is standard choice

If no preference in context:
  Auto-decided: postgresql — No policy match, selected safest option (most widely supported, reversible)
```

**Note:** Phase 3 will add specific policies for common decisions (auth providers, databases, etc.). Until then, "safest option" heuristic applies.

### checkpoint:human-action

**Default behavior:** CANNOT be autonomous. Wait for human.

**Why:** `checkpoint:human-action` exists for actions that have NO CLI/API:
- Email verification links
- SMS 2FA codes
- 3D Secure payment flows
- OAuth browser approvals

These literally require a human. Autonomous mode cannot complete them.

**Decision logic:**

```
Autonomous mode: Human action required for [action], cannot proceed automatically

Waiting for human input:
  [instructions for what human needs to do]

Type "done" when complete.
```

**Rationale:** These are designed to require human presence (security, verification). No "default" can bypass this.

## Common Decision Defaults

Default values when context is insufficient to make informed decisions.

| Decision | Default | Assumption | Trace Format |
|----------|---------|------------|--------------|
| Planning depth | `standard` | Medium complexity phase | `Auto-decided: standard depth — Insufficient context, using documented default. Assumption: standard phase complexity` |
| Parallelization | `true` | Modern multi-core system | `Auto-decided: parallel — Default enabled. Assumption: multi-core system available` |
| Verification mode | `enabled` | Quality matters | `Auto-decided: verify — Default enabled. Assumption: quality verification desired` |
| Previous issues | `proceed` | Issues were informational | `Auto-decided: proceed — No blocking issues. Assumption: logged issues are informational, not blocking` |
| Model profile | `balanced` | Balance cost/quality | `Auto-decided: balanced — Insufficient context, using documented default. Assumption: standard cost/quality tradeoff` |
| Research toggle | `enabled` | Greenfield or unfamiliar | `Auto-decided: research enabled — Insufficient context, using documented default. Assumption: research beneficial` |
| Branch strategy | `feature-branch` | Standard git workflow | `Auto-decided: feature-branch — Insufficient context, using documented default. Assumption: standard branching` |

### Using Defaults in Code

```markdown
**If AUTONOMOUS=true:**

Read context files for depth preference.

If context specifies depth:
  Use specified depth.
  Auto-decided: [depth] — PROJECT.md specifies [reason]

If context does not specify depth:
  Use default: standard
  Auto-decided: standard depth — Insufficient context, using documented default. Assumption: standard phase complexity

**If AUTONOMOUS=false:**
[Interactive prompt for depth selection]
```

## Assumption Logging

Every default must log its assumption. Format:

```
Auto-decided: [choice] — [reason]. Assumption: [what was assumed]
```

**Good examples:**

```
Auto-decided: standard depth — Insufficient context, using documented default. Assumption: standard phase complexity
```

```
Auto-decided: proceed — No blocking issues found. Assumption: logged issues are informational
```

```
Auto-decided: postgresql — No tech preference in PROJECT.md. Assumption: relational data model suitable
```

**Bad examples (missing assumption):**

```
Auto-decided: standard depth — Using default
```
*Why bad: No assumption logged, can't audit later*

```
Auto-decided: proceed — Seems fine
```
*Why bad: "Seems fine" is not a verifiable reason*

### Aggregating Assumptions

At end of major operations (phase completion, plan completion), consider outputting summary:

```
Autonomous Assumptions Made:
- Task 2: standard depth (standard phase complexity)
- Task 4: proceed (issues informational)
- Task 7: postgresql (relational data model)
```

This aids debugging if autonomous run produces unexpected results.

## When Defaults Don't Apply

Some decisions have no safe default. Fall back to human even in autonomous mode.

### Cannot Default

| Decision Type | Why No Default | Action |
|---------------|----------------|--------|
| Authentication credentials | Security - cannot guess secrets | Request from human |
| Destructive operations | Irreversible - delete, force push, reset | Request confirmation |
| Architecture-level choices | Too impactful - affects entire project | Request decision |
| Payment/billing decisions | Financial impact | Request confirmation |
| Publishing/deployment to production | Customer-facing impact | Request confirmation |

### Detection and Handling

```markdown
**If AUTONOMOUS=true:**

Decision: Delete user data table

Check: Is this a destructive operation?
Yes.

Autonomous mode: Cannot auto-decide destructive operation
Operation: DROP TABLE users
Requires: Human confirmation even in autonomous mode

Proceed? [confirm to continue, anything else to abort]
```

**Important:** These are NOT checkpoint:human-action (which is for unavoidable human work). These are safety gates where autonomous mode intentionally falls back to human.

## Graceful Degradation Examples

### Example 1: Missing PROJECT.md

```markdown
**If AUTONOMOUS=true:**

Attempt to read PROJECT.md for context.

If file missing:
  Log: PROJECT.md missing, proceeding with defaults

  For each decision that would use PROJECT.md context:
    Use documented default
    Auto-decided: [default] — PROJECT.md missing, using documented default. Assumption: [assumption]
```

### Example 2: Incomplete Requirements

```markdown
**If AUTONOMOUS=true:**

Read REQUIREMENTS.md for feature list.

If section empty or missing:
  Auto-decided: table stakes only — REQUIREMENTS.md incomplete, building minimum viable. Assumption: user wants working baseline before customization
```

### Example 3: Conflicting Context

```markdown
**If AUTONOMOUS=true:**

PROJECT.md says "use PostgreSQL"
RESEARCH.md says "MongoDB better for this use case"

Conflict detected. Resolution:
1. PROJECT.md takes precedence (user's explicit preference)
2. Log the conflict for visibility

Auto-decided: postgresql — PROJECT.md explicit preference overrides research recommendation. Note: RESEARCH.md suggested MongoDB for [reason]. Assumption: user preference is intentional
```

## Defaults Reference Table

Quick reference for all documented defaults.

| Category | Decision | Default | Safe | Reversible |
|----------|----------|---------|------|------------|
| Planning | depth | standard | Yes | Yes |
| Planning | research | enabled | Yes | Yes |
| Execution | parallelization | true | Yes | Yes |
| Execution | verification | enabled | Yes | Yes |
| Execution | previous issues | proceed | Moderate | Yes |
| Technical | model profile | balanced | Yes | Yes |
| Git | branch strategy | feature-branch | Yes | Yes |
| Checkpoint | human-verify pass | approved | Yes | N/A |
| Checkpoint | human-verify fail | human | Yes | N/A |
| Checkpoint | decision (no policy) | safest option | Yes | Depends |
| Checkpoint | human-action | human | N/A | N/A |

**Safe column:** Is this default unlikely to cause problems?
**Reversible column:** Can we undo this decision later if wrong?

## See Also

- `autonomous.md` - Core autonomous mode patterns and config reading
- `checkpoints.md` - Checkpoint types and verification patterns
- Phase 3 plans - Decision policies for specific decisions
