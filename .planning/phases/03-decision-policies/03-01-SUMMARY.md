---
phase: 03-decision-policies
plan: 01
subsystem: autonomous
tags: [decision-policies, autonomous-mode, policy-rules, trace-format]

# Dependency graph
requires:
  - phase: 01-inner-voice-foundation
    provides: autonomous.md patterns, trace format, config reading
  - phase: 02-context-aware-reasoning
    provides: context-assembly.md patterns, session history, DECISIONS.md
provides:
  - Central policy definitions for all 7 autonomous decision points
  - Integration patterns for workflows to apply policies
  - Anti-patterns documentation for policy implementation
affects: [04-workflow-integration, execute-plan, new-project, plan-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Declarative policy rules (IF/THEN/BECAUSE)
    - Observable condition checks (bash commands)
    - Policy integration patterns (4 types)

key-files:
  created:
    - get-shit-done/references/decision-policies.md
  modified: []

key-decisions:
  - "Policies are declarative rules, not reasoning processes"
  - "Observable conditions only (file checks, counts, pattern matches)"
  - "Four integration patterns: binary, context-based, verification-based, config-gated"

patterns-established:
  - "Policy Format: Decision point, Applies when, Policy rule, Observable check, Trace format, Confidence, Fallback"
  - "Integration Pattern 1: Simple binary (POLICY-01, 05, 07)"
  - "Integration Pattern 2: Context-based (POLICY-06)"
  - "Integration Pattern 3: Verification-based (POLICY-07)"
  - "Integration Pattern 4: Config-gated (POLICY-02)"

# Metrics
duration: 3min
completed: 2026-01-26
---

# Phase 3 Plan 1: Decision Policies Definition Summary

**Centralized decision-policies.md with 7 autonomous decision policies (POLICY-01 through POLICY-07), each with observable condition checks, trace formats, confidence levels, fallback behaviors, and 4 workflow integration patterns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-26T21:20:31Z
- **Completed:** 2026-01-26T21:23:23Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Defined all 7 decision policies in standardized format
- Created observable condition checks (bash commands) for each policy
- Added 4 policy integration patterns for workflow application
- Documented 5 anti-patterns to avoid when implementing policies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create decision-policies.md with all 7 policy definitions** - `dafd5fb` (docs)
2. **Task 2: Add policy integration patterns section** - `6efe921` (docs)

## Files Created/Modified

- `get-shit-done/references/decision-policies.md` - Central policy definitions (773 lines)
  - Overview: Policies as declarative rules
  - Policy Format Reference: Standard structure for all policies
  - POLICY-01 through POLICY-07: Complete definitions
  - Policy Integration Patterns: 4 workflow patterns
  - Anti-Patterns: 5 patterns to avoid
  - Quick Reference Table: Summary of all policies
  - See Also: Links to related references

## Decisions Made

1. **Policies are declarative, not reasoning-based:** IF [conditions] THEN [choice] BECAUSE [rationale] format ensures deterministic, auditable decisions.

2. **Observable conditions only:** All condition checks use file existence, content patterns, counts, or exit codes. No "seems like" or "appears to be" conditions.

3. **Four integration patterns identified:**
   - Pattern 1: Simple binary (yes/no outcomes) for POLICY-01, 05, 07
   - Pattern 2: Context-based (context assembly) for POLICY-06
   - Pattern 3: Verification-based (test results) for POLICY-07
   - Pattern 4: Config-gated (config flag first) for POLICY-02

4. **Each policy has complete specification:** Decision point, applies when, policy rule, observable condition check, trace output format, confidence levels, and fallback behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- decision-policies.md is ready for workflow integration
- Phase 4 (Workflow Integration) can now reference this document for policy application
- All policies have trace formats matching the VOICE-02 pattern from Phase 1
- Context assembly pattern from Phase 2 integrated into POLICY-06

---
*Phase: 03-decision-policies*
*Plan: 01*
*Completed: 2026-01-26*
