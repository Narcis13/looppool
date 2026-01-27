# Gap Closure Planning Reference

Reference for GSD planner gap closure mode that creates plans from verification failures.

**Purpose:** Defines how to parse verification/UAT gaps and create targeted fix plans.

---

## When to Use

Triggered by `--gaps` flag when verification or UAT reveals failures that need fixing.

---

## Gap Sources

### Finding Gap Files

```bash
# Match both zero-padded (05-*) and unpadded (5-*) folders
PADDED_PHASE=$(printf "%02d" ${PHASE_ARG} 2>/dev/null || echo "${PHASE_ARG}")
PHASE_DIR=$(ls -d .planning/phases/${PADDED_PHASE}-* .planning/phases/${PHASE_ARG}-* 2>/dev/null | head -1)

# Check for VERIFICATION.md (code verification gaps)
ls "$PHASE_DIR"/*-VERIFICATION.md 2>/dev/null

# Check for UAT.md with diagnosed status (user testing gaps)
grep -l "status: diagnosed" "$PHASE_DIR"/*-UAT.md 2>/dev/null
```

---

## Gap Structure

Each gap has:
- `truth`: The observable behavior that failed
- `reason`: Why it failed
- `artifacts`: Files with issues
- `missing`: Specific things to add/fix

---

## Gap Closure Process

### 1. Load Existing SUMMARYs

Understand what's already built. Gap closure plans reference existing work.

### 2. Find Next Plan Number

If plans 01, 02, 03 exist, next is 04.

### 3. Group Gaps into Plans

Cluster related gaps by:
- Same artifact (multiple issues in Chat.tsx -> one plan)
- Same concern (fetch + render -> one "wire frontend" plan)
- Dependency order (can't wire if artifact is stub -> fix stub first)

### 4. Create Gap Closure Tasks

```xml
<task name="{fix_description}" type="auto">
  <files>{artifact.path}</files>
  <action>
    {For each item in gap.missing:}
    - {missing item}

    Reference existing code: {from SUMMARYs}
    Gap reason: {gap.reason}
  </action>
  <verify>{How to confirm gap is closed}</verify>
  <done>{Observable truth now achievable}</done>
</task>
```

### 5. Write PLAN.md Files

```yaml
---
phase: XX-name
plan: NN              # Sequential after existing
type: execute
wave: 1               # Gap closures typically single wave
depends_on: []        # Usually independent of each other
files_modified: [...]
autonomous: true
gap_closure: true     # Flag for tracking
---
```

---

## Gap Closure Checklist

- [ ] VERIFICATION.md or UAT.md loaded and gaps parsed
- [ ] Existing SUMMARYs read for context
- [ ] Gaps clustered into focused plans
- [ ] Plan numbers sequential after existing (04, 05...)
- [ ] PLAN file(s) exist with gap_closure: true
- [ ] Each plan: tasks derived from gap.missing items
- [ ] PLAN file(s) committed to git
