# Phase 6: Safety Features - Research

**Researched:** 2026-01-27
**Domain:** Git operations, phase rollback, inline plan modification
**Confidence:** HIGH

## Summary

Phase 6 implements two safety features for autonomous operation: (1) a rollback mechanism to revert phase commits when verification fails, and (2) inline task modifications during execution without full re-planning.

The rollback mechanism requires recording the first commit of each phase in STATE.md, then providing a `/gsd:rollback-phase` command that uses `git revert` (not `git reset`) to safely undo changes while preserving history. This approach is safe for shared repositories and maintains clean git history.

The inline task modification feature enables executors to add discovered tasks during execution using `<task type="inline">`. These tasks integrate with existing deviation rules and are tracked in the SUMMARY.md deviation section.

**Primary recommendation:** Use `git revert --no-commit` to batch revert all phase commits, then commit once with a descriptive message. Record phase start commits in STATE.md under a new "Phase Commits" section.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| git | 2.x | Version control operations | Universal, required for GSD |
| bash | 5.x | Shell scripting for git operations | Already used throughout GSD |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| grep | - | Parse git log output | Extract commit hashes |
| sed | - | Transform commit messages | Format revert messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `git revert` | `git reset --hard` | Reset destroys history, dangerous for shared repos |
| `git revert` | `git checkout` + commit | More complex, same result |
| STATE.md tracking | External file | STATE.md is already read at workflow start |

**Installation:**
No additional dependencies required. All tools already available in GSD environment.

## Architecture Patterns

### Recommended Project Structure
```
.planning/
├── STATE.md           # Add "Phase Commits" section
├── ROADMAP.md         # No changes
├── phases/
│   └── XX-name/
│       ├── XX-01-PLAN.md      # Tasks can include type="inline"
│       └── XX-01-SUMMARY.md   # Track inline tasks in deviations
└── config.json        # No changes
```

### Pattern 1: Phase Commit Recording
**What:** Record the first commit hash of each phase in STATE.md for rollback reference
**When to use:** At the start of every phase execution (first task commit)
**Example:**
```markdown
## Phase Commits

| Phase | First Commit | Phase Directory | Recorded |
|-------|--------------|-----------------|----------|
| 01 | abc123f | 01-foundation | 2026-01-26 |
| 02 | def456g | 02-auth | 2026-01-26 |
| 03 | hij789k | 03-dashboard | 2026-01-27 |
```

**Recording logic:**
```bash
# In execute-plan.md, after first task commit
FIRST_COMMIT=$(git rev-parse HEAD)
PHASE_DIR=$(basename "$PHASE_PATH")

# Only record if not already recorded for this phase
if ! grep -q "| ${PHASE} |" .planning/STATE.md 2>/dev/null; then
  # Append to Phase Commits table
  echo "| ${PHASE} | ${FIRST_COMMIT:0:7} | ${PHASE_DIR} | $(date +%Y-%m-%d) |" >> .planning/STATE.md
fi
```

### Pattern 2: Safe Rollback with git revert
**What:** Revert all commits in a phase range using `git revert --no-commit`, then commit once
**When to use:** When verification fails and user wants to undo phase work
**Example:**
```bash
# Get phase boundaries
PHASE_START=$(grep "| ${PHASE} |" .planning/STATE.md | awk -F'|' '{print $3}' | tr -d ' ')
PHASE_END=$(git rev-parse HEAD)

# Collect commits to revert (oldest to newest)
COMMITS_TO_REVERT=$(git log --reverse --format="%H" ${PHASE_START}^..${PHASE_END})

# Revert in reverse order (newest first) without auto-commit
for commit in $(echo "$COMMITS_TO_REVERT" | tac); do
  git revert --no-commit $commit
done

# Single rollback commit
git commit -m "revert: rollback phase ${PHASE} (${PHASE_NAME})

Reverted commits:
$(git log --oneline ${PHASE_START}^..${PHASE_END})

Triggered by: verification failure / user request
"
```

### Pattern 3: Inline Task Declaration
**What:** Allow executors to add tasks during execution for discovered work
**When to use:** When deviation rules 1-3 apply (bugs, missing critical, blockers)
**Example:**
```xml
<!-- In deviation handling, executor can declare inline task -->
<task type="inline" deviation-rule="2">
  <name>Add missing input validation</name>
  <reason>Form accepts invalid email format, security vulnerability</reason>
  <files>src/components/LoginForm.tsx</files>
  <action>Add email validation regex, show error message on invalid input</action>
  <verify>Invalid emails rejected, valid emails accepted</verify>
</task>
```

**Inline task characteristics:**
- Must reference deviation rule that triggered it
- Treated as part of current task for commit purposes (not separate commit)
- Documented in SUMMARY.md deviation section
- Does NOT require user approval (follows deviation rules)

### Anti-Patterns to Avoid
- **Using git reset for rollback:** Destroys history, breaks shared repos
- **Storing commits in separate file:** STATE.md is already loaded at workflow start
- **Creating inline tasks without deviation justification:** Scope creep
- **Inline tasks for architectural changes:** These still require Rule 4 checkpoint
- **Partial rollbacks:** Either rollback entire phase or don't

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Revert specific commits | Custom file restore | `git revert` | Handles merge conflicts, preserves history |
| Parse git log | Custom regex | `git log --format` | Built-in formatting, handles edge cases |
| Track phase boundaries | External database | STATE.md table | Already read at every workflow start |
| Batch git operations | Multiple commits | `--no-commit` flag | Atomic rollback, clean history |

**Key insight:** Git already has all the rollback infrastructure. The work is in integration, not in building rollback logic.

## Common Pitfalls

### Pitfall 1: Rollback Leaves Dirty State
**What goes wrong:** Rollback reverts commits but leaves planning files (.planning/) in inconsistent state
**Why it happens:** Only reverting code commits, not planning docs
**How to avoid:** Rollback must also delete phase directory (or mark it rolled back)
**Warning signs:** SUMMARY.md exists for rolled-back phase, ROADMAP shows phase complete

### Pitfall 2: Rollback in Middle of Wave
**What goes wrong:** User requests rollback while parallel plans are executing, commits interleaved
**Why it happens:** Wave execution creates interleaved commits from multiple plans
**How to avoid:** Only allow rollback when no execution in progress (check STATE.md status)
**Warning signs:** STATUS shows "In progress", multiple PLAN.md without SUMMARY.md

### Pitfall 3: Inline Tasks Create Scope Creep
**What goes wrong:** Executor uses inline tasks for "nice to have" improvements
**Why it happens:** Inline task mechanism exists, easy to abuse
**How to avoid:** Inline tasks MUST cite deviation rule (1-3), rule 4 still requires checkpoint
**Warning signs:** Inline tasks without deviation-rule attribute, many inline tasks per plan

### Pitfall 4: Phase Commit Not Recorded
**What goes wrong:** Rollback fails because no start commit recorded
**Why it happens:** First commit didn't trigger recording, or recording failed silently
**How to avoid:** Verify recording before continuing execution, error if not recorded
**Warning signs:** Phase Commits table empty or missing phase entry

### Pitfall 5: Merge Conflicts During Revert
**What goes wrong:** `git revert` fails with merge conflicts
**Why it happens:** Later commits modified same files, git can't auto-resolve
**How to avoid:** Accept all "theirs" (pre-phase state) during conflict resolution
**Warning signs:** `git revert` outputs conflict markers

## Code Examples

Verified patterns from official sources and existing GSD patterns:

### Recording Phase Start Commit
```bash
# In execute-plan.md, after first task commit of a phase
# Called from task_commit step when TASK_NUMBER is 1

record_phase_commit() {
  local PHASE="$1"
  local PHASE_DIR="$2"
  local COMMIT_HASH=$(git rev-parse HEAD)

  # Check if Phase Commits section exists
  if ! grep -q "## Phase Commits" .planning/STATE.md 2>/dev/null; then
    # Add section before Session Continuity
    sed -i '' '/## Session Continuity/i\
## Phase Commits\
\
| Phase | First Commit | Phase Directory | Recorded |\
|-------|--------------|-----------------|----------|\
' .planning/STATE.md
  fi

  # Check if already recorded
  if grep -q "| ${PHASE} |" .planning/STATE.md; then
    return 0  # Already recorded
  fi

  # Append new row
  local ROW="| ${PHASE} | ${COMMIT_HASH:0:7} | ${PHASE_DIR} | $(date +%Y-%m-%d) |"
  sed -i '' "/## Phase Commits/,/^$/ {
    /^$/i\\
${ROW}
  }" .planning/STATE.md
}
```

### Rollback Phase Command Structure
```bash
# Core rollback logic for /gsd:rollback-phase command

rollback_phase() {
  local PHASE="$1"

  # 1. Validate phase exists and has commits recorded
  PHASE_START=$(grep "| ${PHASE} |" .planning/STATE.md | awk -F'|' '{gsub(/ /,"",$3); print $3}')
  if [ -z "$PHASE_START" ]; then
    echo "ERROR: No commit recorded for phase ${PHASE}"
    echo "Rollback not possible - phase start commit unknown"
    return 1
  fi

  # 2. Check execution status
  STATUS=$(grep "^Status:" .planning/STATE.md | sed 's/Status: //')
  if [ "$STATUS" = "In progress" ]; then
    echo "ERROR: Cannot rollback while execution in progress"
    echo "Wait for current execution to complete or fail"
    return 1
  fi

  # 3. Get commit range
  PHASE_END=$(git rev-parse HEAD)
  COMMIT_COUNT=$(git rev-list --count ${PHASE_START}^..${PHASE_END})

  # 4. Confirm with user
  echo "Rollback Phase ${PHASE}"
  echo ""
  echo "This will revert ${COMMIT_COUNT} commits:"
  git log --oneline ${PHASE_START}^..${PHASE_END}
  echo ""
  echo "Phase directory will be deleted: .planning/phases/${PHASE}-*/"
  echo ""
  echo "Proceed? (y/n)"

  # 5. Execute rollback (after confirmation)
  git revert --no-commit ${PHASE_START}^..${PHASE_END}
  git commit -m "revert: rollback phase ${PHASE}

Rolled back ${COMMIT_COUNT} commits.
Phase start: ${PHASE_START}
Phase end: ${PHASE_END}

Triggered by: /gsd:rollback-phase ${PHASE}
"

  # 6. Clean up planning files
  rm -rf .planning/phases/${PHASE}-*/

  # 7. Update STATE.md
  # - Remove phase from Phase Commits table
  # - Update Current Position to previous phase
  # - Update progress bar
}
```

### Inline Task Documentation in SUMMARY.md
```markdown
## Deviations from Plan

### Inline Tasks Added

**1. [Rule 2 - Missing Critical] Add input validation**
- **Task:** `<task type="inline" deviation-rule="2">Add missing input validation</task>`
- **Found during:** Task 2 (Create login form)
- **Issue:** Form accepted any input, no email format validation
- **Action:** Added email regex, error message display
- **Files modified:** src/components/LoginForm.tsx
- **Verification:** Invalid emails show error, valid emails proceed
- **Committed in:** def456g (part of Task 2 commit)

---

**Total inline tasks:** 1
**Impact:** Critical security fix, within deviation rules scope
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual git revert | Command-driven rollback | Phase 6 | Safer, automated |
| Full replan for discovered work | Inline task modification | Phase 6 | Faster iteration |
| No phase boundaries tracked | Phase commits in STATE.md | Phase 6 | Enables rollback |

**Deprecated/outdated:**
- N/A - this is new functionality

## Open Questions

Things that couldn't be fully resolved:

1. **Rollback with uncommitted changes?**
   - What we know: `git revert` requires clean working directory
   - What's unclear: Should we stash, abort, or error?
   - Recommendation: Error with message to commit or stash first (safest)

2. **Rollback partial phase?**
   - What we know: Success criteria says "reverts to phase start commit"
   - What's unclear: Should we support rolling back to mid-phase (specific plan)?
   - Recommendation: v1 is full phase rollback only, partial is v2 feature

3. **Multiple inline tasks per plan?**
   - What we know: Deviation rules allow auto-fix
   - What's unclear: Should there be a limit to prevent scope creep?
   - Recommendation: No hard limit, but SUMMARY must document each with justification

## Sources

### Primary (HIGH confidence)
- [Atlassian Git Tutorial - Reset, Checkout, Revert](https://www.atlassian.com/git/tutorials/resetting-checking-out-and-reverting) - Definitive guide on rollback approaches
- `.planning/codebase/CONCERNS.md` - Existing rollback mechanism specification
- `get-shit-done/references/git-integration.md` - GSD git patterns
- `get-shit-done/references/executor/deviation-rules.md` - Rules 1-3 define inline task scope

### Secondary (MEDIUM confidence)
- [GeeksforGeeks - Git Revert vs Reset](https://www.geeksforgeeks.org/git/git-difference-between-git-revert-checkout-and-reset/) - Comparison of approaches
- [DataCamp - Git Reset and Revert Tutorial](https://www.datacamp.com/tutorial/git-reset-revert-tutorial) - Practical examples

### Tertiary (LOW confidence)
- WebSearch results on git rollback best practices - General guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Git is universal, patterns well-documented
- Architecture: HIGH - Builds on existing GSD patterns (STATE.md, deviation rules)
- Pitfalls: MEDIUM - Some edge cases need validation during implementation

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable domain)
