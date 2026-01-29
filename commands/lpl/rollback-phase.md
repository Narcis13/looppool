---
name: lpl:rollback-phase
description: Revert all commits in a phase
argument-hint: "<phase-number>"
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---

<objective>
Revert all commits made during a specific phase, providing a safety net for autonomous execution.

Purpose: When verification fails or user decides phase work is wrong, cleanly undo all changes while preserving git history. Uses `git revert` (not reset) for safety.

Output: Phase commits reverted, planning files cleaned up, state updated to previous position.
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>

<step name="validate_arguments">
Parse the phase number from arguments:

```bash
PHASE="$ARGUMENTS"
if [ -z "$PHASE" ]; then
  echo "Error: Phase number required"
  echo "Usage: /lpl:rollback-phase <phase-number>"
  exit 1
fi
```

Clean the phase number (remove leading zeros, handle decimal format):
```bash
# Normalize: "01" -> "1", "01.1" -> "1.1"
PHASE_CLEAN=$(echo "$PHASE" | sed 's/^0*//' | sed 's/^$/0/')
```
</step>

<step name="check_prerequisites">
**Check for uncommitted changes:**

```bash
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: You have uncommitted changes"
  echo "Please commit or stash your changes before rolling back"
  git status --short
  exit 1
fi
```

**Check execution status in STATE.md:**

```bash
STATUS=$(grep "^Status:" .planning/STATE.md | sed 's/Status: //')
if [ "$STATUS" = "In progress" ]; then
  echo "Error: Cannot rollback during active execution"
  echo "Wait for current execution to complete or fail first"
  echo ""
  echo "Current status: $STATUS"
  exit 1
fi
```

This prevents rollback while execution is active, avoiding interleaved commits.
</step>

<step name="find_phase_commit">
**Locate the phase's first commit in STATE.md:**

```bash
# Look for phase in Phase Commits table
PHASE_ROW=$(grep "| ${PHASE_CLEAN} |" .planning/STATE.md 2>/dev/null || grep "| 0${PHASE_CLEAN} |" .planning/STATE.md 2>/dev/null)

if [ -z "$PHASE_ROW" ]; then
  echo "Error: No commit recorded for phase ${PHASE}"
  echo ""
  echo "Phase Commits table in STATE.md:"
  grep -A 20 "## Phase Commits" .planning/STATE.md | head -15
  echo ""
  echo "Possible causes:"
  echo "- Phase has not been executed yet"
  echo "- Phase commits were not recorded (older LPL version)"
  echo ""
  echo "Manual rollback: Review git log and use git revert manually"
  exit 1
fi

# Extract commit hash (column 3 in table)
PHASE_START=$(echo "$PHASE_ROW" | awk -F'|' '{gsub(/ /,"",$3); print $3}')
PHASE_DIR=$(echo "$PHASE_ROW" | awk -F'|' '{gsub(/ /,"",$4); print $4}')

echo "Found phase ${PHASE} start commit: ${PHASE_START}"
echo "Phase directory: ${PHASE_DIR}"
```
</step>

<step name="analyze_commits">
**Count commits to revert and show them:**

```bash
CURRENT_HEAD=$(git rev-parse HEAD)
COMMIT_COUNT=$(git rev-list --count ${PHASE_START}^..HEAD 2>/dev/null || echo "0")

if [ "$COMMIT_COUNT" = "0" ]; then
  echo "Error: No commits found in range ${PHASE_START}..HEAD"
  echo "Phase may have already been rolled back"
  exit 1
fi

echo ""
echo "Commits to revert (${COMMIT_COUNT} total):"
echo "─────────────────────────────────────────────"
git log --oneline ${PHASE_START}^..HEAD
echo "─────────────────────────────────────────────"
```

**Show files that will be affected:**

```bash
echo ""
echo "Files that will be reverted:"
git diff --stat ${PHASE_START}^..HEAD | tail -10
```
</step>

<step name="confirm_rollback">
**Present confirmation using AskUserQuestion:**

```
Rollback Phase ${PHASE}

This will revert ${COMMIT_COUNT} commits from phase ${PHASE_DIR}.

Commits: ${PHASE_START}..HEAD
Files affected: [show count from git diff --stat]

Planning files to delete:
- .planning/phases/${PHASE_DIR}/

STATE.md will be updated to:
- Remove phase from Phase Commits table
- Update position to Phase ${PREV_PHASE}
- Update progress bar

This action uses git revert (safe, preserves history).
```

Options:
- "Proceed with rollback" - Execute the rollback
- "Cancel" - Abort without changes

Wait for user selection.

**If user selects Cancel:** Exit with message "Rollback cancelled. No changes made."
</step>

<step name="execute_rollback">
**If user confirms, execute the rollback:**

```bash
echo "Executing rollback..."
echo ""

# Revert all commits in the range (most recent first)
# Using --no-commit to batch into single revert commit
git revert --no-commit ${PHASE_START}^..HEAD

# Check for conflicts
if [ $? -ne 0 ]; then
  echo ""
  echo "Merge conflicts detected during revert."
  echo ""
  echo "Options:"
  echo "1. Resolve conflicts manually, then run: git commit -m 'revert: rollback phase ${PHASE}'"
  echo "2. Abort with: git revert --abort"
  echo ""
  echo "Conflicts in:"
  git diff --name-only --diff-filter=U
  exit 1
fi

# Commit the revert
git commit -m "revert: rollback phase ${PHASE} (${PHASE_DIR})

Rolled back ${COMMIT_COUNT} commits.
Phase start: ${PHASE_START}
Phase end: ${CURRENT_HEAD}

Triggered by: /lpl:rollback-phase ${PHASE}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

REVERT_COMMIT=$(git rev-parse --short HEAD)
echo "Rollback committed: ${REVERT_COMMIT}"
```
</step>

<step name="cleanup_planning_files">
**Remove phase planning files:**

```bash
PHASE_PATH=".planning/phases/${PHASE_DIR}"

if [ -d "$PHASE_PATH" ]; then
  echo ""
  echo "Removing phase directory: ${PHASE_PATH}"
  rm -rf "$PHASE_PATH"
  echo "Removed."
else
  echo "Phase directory not found: ${PHASE_PATH} (may have been in another location)"
fi
```

**Update STATE.md:**

1. Remove phase from Phase Commits table:
```bash
# Remove the row containing this phase
sed -i '' "/| ${PHASE_CLEAN} |/d" .planning/STATE.md
# Also try with leading zero
sed -i '' "/| 0${PHASE_CLEAN} |/d" .planning/STATE.md
```

2. Update Current Position:
```bash
# Calculate previous phase
PREV_PHASE=$((PHASE_CLEAN - 1))

# Get phase name from ROADMAP.md
PREV_PHASE_NAME=$(grep -E "Phase ${PREV_PHASE}:" .planning/ROADMAP.md | head -1 | sed 's/.*Phase [0-9]*: //' | sed 's/ .*//')

# Get total phases
TOTAL_PHASES=$(grep -c "Phase [0-9]" .planning/ROADMAP.md)

# Update Current Position section
# This is done via targeted edits to preserve other sections
```

3. Update progress bar:
```bash
# Count remaining completed plans
COMPLETED=$(ls .planning/phases/*/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(ls .planning/phases/*/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
PERCENT=$((COMPLETED * 100 / TOTAL))

# Generate progress bar
BAR=""
FILLED=$((PERCENT / 10))
for i in $(seq 1 $FILLED); do BAR="${BAR}█"; done
for i in $(seq $((FILLED + 1)) 10); do BAR="${BAR}░"; done
```
</step>

<step name="update_roadmap">
**Update ROADMAP.md:**

Mark phase as not complete (revert the completion marker):

```bash
# Find phase in roadmap and update status
# Change "[x] **Phase N:" to "[ ] **Phase N:"
sed -i '' "s/\[x\] \*\*Phase ${PHASE_CLEAN}:/[ ] **Phase ${PHASE_CLEAN}:/" .planning/ROADMAP.md

# Remove completion date if present
sed -i '' "/Phase ${PHASE_CLEAN}.*Complete/s/ - Complete.*//" .planning/ROADMAP.md
```
</step>

<step name="commit_cleanup">
**Commit the planning file cleanup:**

```bash
git add .planning/STATE.md
git add .planning/ROADMAP.md

# Check if phase directory was tracked
if git status --short | grep -q ".planning/phases/"; then
  git add .planning/phases/
fi

git commit -m "docs(rollback): clean up phase ${PHASE} planning files

- Removed .planning/phases/${PHASE_DIR}/
- Updated STATE.md Phase Commits table
- Updated Current Position to Phase ${PREV_PHASE}
- Marked phase incomplete in ROADMAP.md

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
</step>

<step name="report_success">
**Present completion summary:**

```
Phase ${PHASE} rolled back successfully.

${COMMIT_COUNT} commits reverted.
Planning files cleaned up.

Revert commit: ${REVERT_COMMIT}
Cleanup commit: $(git rev-parse --short HEAD)

Current position: Phase ${PREV_PHASE} complete

Next steps:
- Review the reverted changes with: git show ${REVERT_COMMIT}
- Re-plan the phase with: /lpl:plan-phase ${PHASE}
- Or continue to next phase if this phase is no longer needed
```
</step>

</process>

<error_handling>

**Uncommitted changes:**
```
Error: You have uncommitted changes
Please commit or stash your changes before rolling back
[git status output]
```

**Active execution:**
```
Error: Cannot rollback during active execution
Wait for current execution to complete or fail first
Current status: In progress
```

**No commit recorded:**
```
Error: No commit recorded for phase ${PHASE}
[Show Phase Commits table]
Possible causes:
- Phase has not been executed yet
- Phase commits were not recorded (older LPL version)
Manual rollback: Review git log and use git revert manually
```

**Merge conflicts during revert:**
```
Merge conflicts detected during revert.

Options:
1. Resolve conflicts manually, then run: git commit -m 'revert: rollback phase ${PHASE}'
2. Abort with: git revert --abort

Conflicts in:
[list of conflicting files]
```

</error_handling>

<success_criteria>
- [ ] Phase number validated and normalized
- [ ] Prerequisites checked (clean working tree, not executing)
- [ ] Phase commit found in STATE.md Phase Commits table
- [ ] User confirmation obtained before destructive action
- [ ] All phase commits reverted using git revert (not reset)
- [ ] Revert committed with descriptive message
- [ ] Phase planning files deleted
- [ ] STATE.md updated (Phase Commits table, Current Position, progress)
- [ ] ROADMAP.md updated (phase marked incomplete)
- [ ] Cleanup committed
- [ ] Success summary presented
</success_criteria>
