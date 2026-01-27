# STATE.md Schema Reference

**Version:** 1.0
**Last Updated:** 2026-01-27

STATE.md is the project's living memory - a single, small file that enables instant session restoration and project context awareness. This reference defines its schema, required vs optional fields, and auto-recovery procedures.

## Schema Overview

STATE.md has two categories of fields:
- **REQUIRED:** Must be present for workflows to function. Workflows may fail if missing.
- **OPTIONAL:** May be present. Workflows must handle their absence gracefully.

---

## Required Fields

Every STATE.md MUST contain these sections. Workflows depend on these fields for basic operation.

### Project Reference (REQUIRED)

```markdown
## Project Reference

See: .planning/PROJECT.md (updated [YYYY-MM-DD])

**Core value:** [string - one-liner from PROJECT.md]
**Current focus:** [string - current phase name]
```

**Field specifications:**

| Field | Format | Description |
|-------|--------|-------------|
| `See:` | Path string | Always `.planning/PROJECT.md` |
| `updated` | YYYY-MM-DD | Last PROJECT.md update date |
| `Core value:` | Single line | Extracted from PROJECT.md Core Value section |
| `Current focus:` | Phase name | Current phase being worked on |

**Validation:**
```bash
# Check Project Reference section exists and has required fields
grep -q "## Project Reference" .planning/STATE.md && \
grep -q "See: .planning/PROJECT.md" .planning/STATE.md && \
grep -q "Core value:" .planning/STATE.md && \
grep -q "Current focus:" .planning/STATE.md
```

### Current Position (REQUIRED)

```markdown
## Current Position

Phase: [N] of [M] ([Phase name])
Plan: [A] of [B] in current phase
Status: [Ready to plan | Planning | Ready to execute | In progress | Phase complete]
Last activity: [YYYY-MM-DD] - [Description]

Progress: [visual bar] [N]%
```

**Field specifications:**

| Field | Format | Valid Values |
|-------|--------|--------------|
| `Phase:` | `N of M (Name)` | N and M are integers, Name is phase label |
| `Plan:` | `A of B in current phase` | A and B are integers or "TBD" |
| `Status:` | Enum | `Ready to plan`, `Planning`, `Ready to execute`, `In progress`, `Phase complete` |
| `Last activity:` | `YYYY-MM-DD - Description` | Date + brief description |
| `Progress:` | `[bar] N%` | Visual bar using `█` and `░` characters |

**Status values and meanings:**

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `Ready to plan` | Phase exists, no plans yet | `/gsd:plan-phase` |
| `Planning` | Planning in progress | Complete planning |
| `Ready to execute` | Plans exist, not started | `/gsd:execute-phase` |
| `In progress` | Execution underway | Continue execution |
| `Phase complete` | All plans done | `/gsd:plan-phase` (next) or milestone complete |

**Validation:**
```bash
# Check Current Position section exists and has required fields
grep -q "## Current Position" .planning/STATE.md && \
grep -qE "^Phase: [0-9]+ of [0-9]+" .planning/STATE.md && \
grep -qE "^Plan: " .planning/STATE.md && \
grep -qE "^Status: " .planning/STATE.md && \
grep -qE "^Last activity: " .planning/STATE.md && \
grep -qE "^Progress: " .planning/STATE.md
```

---

## Optional Fields

These sections may be present. Workflows MUST handle their absence gracefully (check before reading, use defaults if missing).

### Performance Metrics (OPTIONAL)

```markdown
## Performance Metrics

**Velocity:**
- Total plans completed: [N]
- Average duration: [X] min
- Total execution time: [X.X] hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| [phase-name] | [N] | [X min] | [Y min] |

**Recent Trend:**
- Last 5 plans: [durations]
- Trend: [Improving | Stable | Degrading]
```

**When to add:** After first plan completion (provides velocity data).

### Accumulated Context (OPTIONAL)

```markdown
## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase X]: [Decision summary]
- [Phase Y]: [Decision summary]

### Pending Todos

[From .planning/todos/pending/ - ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

None yet.
```

**When to add:** After any decision is made or blocker is identified.

### Session Continuity (OPTIONAL)

```markdown
## Session Continuity

Last session: [YYYY-MM-DD HH:MM:SS]
Stopped at: [Description of last completed action]
Resume file: [Path to .continue-here*.md if exists, otherwise "None"]
```

**When to add:** At end of every session (enables instant resumption).

---

## Auto-Recovery Algorithm

When STATE.md is missing but `.planning/` directory exists, reconstruct a minimal STATE.md from ROADMAP.md.

### Trigger Conditions

Auto-recovery triggers when:
1. Workflow attempts to read `.planning/STATE.md`
2. File does not exist
3. `.planning/ROADMAP.md` exists

### Recovery Steps

**Step 1: Check for ROADMAP.md**

```bash
if [ ! -f .planning/ROADMAP.md ]; then
  echo "ERROR: Cannot recover STATE.md - ROADMAP.md not found"
  echo "Run /gsd:new-project to initialize project"
  exit 1
fi
```

**Step 2: Extract phase information from ROADMAP.md**

```bash
# Count total phases (lines with "### Phase" or phase list items)
TOTAL_PHASES=$(grep -cE "^###? Phase [0-9]+" .planning/ROADMAP.md || echo "0")

# Find first incomplete phase (unchecked checkbox before Phase header)
CURRENT_PHASE=$(grep -n "\- \[ \].*Phase" .planning/ROADMAP.md | head -1 | grep -oE "Phase [0-9]+" | grep -oE "[0-9]+")

# If all phases complete, use last phase
if [ -z "$CURRENT_PHASE" ]; then
  CURRENT_PHASE=$(grep -oE "Phase [0-9]+" .planning/ROADMAP.md | tail -1 | grep -oE "[0-9]+")
fi

# Extract phase name from ROADMAP.md
PHASE_NAME=$(grep -E "^###? Phase ${CURRENT_PHASE}:" .planning/ROADMAP.md | sed 's/.*Phase [0-9]*: //' | head -1)
```

**Step 3: Read PROJECT.md for core value (if exists)**

```bash
if [ -f .planning/PROJECT.md ]; then
  CORE_VALUE=$(grep -A 1 "## Core Value" .planning/PROJECT.md | tail -1 | sed 's/^[[:space:]]*//')
else
  CORE_VALUE="[Run /gsd:progress to refresh]"
fi
```

**Step 4: Generate minimal STATE.md**

```bash
TODAY=$(date +%Y-%m-%d)

cat > .planning/STATE.md << EOF
# Project State

## Project Reference

See: .planning/PROJECT.md (updated ${TODAY})

**Core value:** ${CORE_VALUE}
**Current focus:** Phase ${CURRENT_PHASE} - ${PHASE_NAME}

## Current Position

Phase: ${CURRENT_PHASE} of ${TOTAL_PHASES} (${PHASE_NAME})
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: ${TODAY} - STATE.md auto-recovered from ROADMAP.md

Progress: [$(printf '░%.0s' $(seq 1 10))] 0%

## Accumulated Context

### Decisions

Auto-recovered. Run /gsd:progress to refresh.

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Stopped at: STATE.md auto-recovered
Resume file: None
EOF
```

**Step 5: Log recovery**

```bash
echo "STATE.md auto-recovered from ROADMAP.md."
echo "Run /gsd:progress to validate and refresh project state."
```

### Recovery Template

Use this template when writing STATE.md during recovery:

```markdown
# Project State

## Project Reference

See: .planning/PROJECT.md (updated {TODAY})

**Core value:** {CORE_VALUE_OR_PLACEHOLDER}
**Current focus:** Phase {N} - {PHASE_NAME}

## Current Position

Phase: {N} of {TOTAL} ({PHASE_NAME})
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: {TODAY} - STATE.md auto-recovered from ROADMAP.md

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

Auto-recovered. Run /gsd:progress to refresh.

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: {ISO_TIMESTAMP}
Stopped at: STATE.md auto-recovered
Resume file: None
```

---

## Validation Patterns

### Full Required Field Validation

```bash
validate_state_md() {
  local file=".planning/STATE.md"
  local errors=0

  # Check file exists
  if [ ! -f "$file" ]; then
    echo "ERROR: STATE.md not found"
    return 1
  fi

  # Check Project Reference
  if ! grep -q "## Project Reference" "$file"; then
    echo "ERROR: Missing '## Project Reference' section"
    errors=$((errors + 1))
  fi

  if ! grep -q "Core value:" "$file"; then
    echo "ERROR: Missing 'Core value:' field"
    errors=$((errors + 1))
  fi

  if ! grep -q "Current focus:" "$file"; then
    echo "ERROR: Missing 'Current focus:' field"
    errors=$((errors + 1))
  fi

  # Check Current Position
  if ! grep -q "## Current Position" "$file"; then
    echo "ERROR: Missing '## Current Position' section"
    errors=$((errors + 1))
  fi

  if ! grep -qE "^Phase: [0-9]+ of [0-9]+" "$file"; then
    echo "ERROR: Missing or malformed 'Phase:' field"
    errors=$((errors + 1))
  fi

  if ! grep -qE "^Status: (Ready to plan|Planning|Ready to execute|In progress|Phase complete)" "$file"; then
    echo "ERROR: Invalid 'Status:' value"
    errors=$((errors + 1))
  fi

  if [ $errors -gt 0 ]; then
    echo "Validation failed with $errors error(s)"
    return 1
  fi

  echo "STATE.md validation passed"
  return 0
}
```

### Quick Validation (for workflows)

```bash
# Minimal check - ensures file is usable
grep -q "## Project Reference" .planning/STATE.md && \
grep -q "## Current Position" .planning/STATE.md && \
echo "STATE.md valid" || echo "STATE.md invalid or missing"
```

---

## Field Addition Process

### Adding Required Fields

Required fields affect all workflows. Addition requires coordination:

1. **Document the new field** in this schema reference
2. **Update all affected workflows:**
   - Search for STATE.md reads: `grep -r "STATE.md" get-shit-done/`
   - Update each workflow to handle/use new field
3. **Update the state template:** `get-shit-done/templates/state.md`
4. **Update auto-recovery:** Add field extraction to recovery algorithm
5. **Test:** Run a plan-phase and execute-phase cycle

### Adding Optional Fields

Optional fields are additive and don't require coordination:

1. **Document the new field** in this schema reference
2. **Update the state template:** `get-shit-done/templates/state.md`
3. **Update workflows that will write the field** (e.g., execute-plan for metrics)
4. **No changes needed for readers** - they already handle missing optional fields

---

## Size Constraint

Keep STATE.md under 150 lines.

It's a DIGEST, not an archive. If accumulated context grows too large:
- Keep only 3-5 recent decisions in summary (full log in PROJECT.md)
- Keep only active blockers, remove resolved ones
- Summarize performance metrics, don't list every plan

The goal is "read once, know where we are" - if it's too long, that fails.

---

## Usage in Workflows

### Reading STATE.md

```bash
# Standard read pattern
cat .planning/STATE.md 2>/dev/null

# Handle missing file
if [ ! -f .planning/STATE.md ]; then
  # Trigger auto-recovery or prompt user
fi
```

### Writing STATE.md

Always preserve existing optional sections when updating:

1. Read current STATE.md
2. Parse into sections
3. Update only the sections you need to change
4. Write back complete file

### Extracting Specific Fields

```bash
# Get current phase number
grep "^Phase:" .planning/STATE.md | grep -oE "[0-9]+" | head -1

# Get current status
grep "^Status:" .planning/STATE.md | sed 's/Status: //'

# Get current focus
grep "^Current focus:" .planning/STATE.md | sed 's/\*\*Current focus:\*\* //'
```
