# Requirements: GSD Autonomous Mode

**Defined:** 2026-01-26
**Core Value:** Full autonomous execution from `/gsd:new-project` through `/gsd:execute-phase` with zero human input

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Inner Voice System

- [ ] **VOICE-01**: Config flag `autonomous: true/false` in config.json enables/disables autonomous mode
- [ ] **VOICE-02**: Decision traces output `Auto-decided: [choice] — [reason]` for every autonomous decision
- [ ] **VOICE-03**: Context-aware decisions read PROJECT.md, REQUIREMENTS.md, research outputs, codebase state
- [ ] **VOICE-04**: Decision history tracked within session for consistency across decisions
- [ ] **VOICE-05**: Full commitment mode — when enabled, ALL decision points are auto-decided (no partial autonomy)
- [ ] **VOICE-06**: Audit trail persisted to `.planning/DECISIONS.md` with timestamps, choices, reasons, context refs
- [ ] **VOICE-07**: Graceful degradation — use documented defaults when context insufficient, log assumptions

### Decision Policies

- [ ] **POLICY-01**: Decision policy for brownfield detection (map codebase if code detected and no map exists)
- [ ] **POLICY-02**: Decision policy for research toggle (research if greenfield or unfamiliar domain)
- [ ] **POLICY-03**: Decision policy for feature scoping (table stakes + explicit PROJECT.md mentions = v1)
- [ ] **POLICY-04**: Decision policy for roadmap approval (approve if 100% coverage, deps satisfied)
- [ ] **POLICY-05**: Decision policy for plan approval (approve if checker passes)
- [ ] **POLICY-06**: Decision policy for checkpoint:decision (policy-based selection from options)
- [ ] **POLICY-07**: Decision policy for checkpoint:human-verify (auto-approve if tests pass)

### Workflow Integration

- [ ] **FLOW-01**: `/gsd:new-project` respects autonomous flag for all decision points
- [ ] **FLOW-02**: `/gsd:plan-phase` respects autonomous flag for all decision points
- [ ] **FLOW-03**: `/gsd:execute-phase` respects autonomous flag for all checkpoints
- [ ] **FLOW-04**: All other GSD workflows check autonomous flag before AskUserQuestion

### Tech Debt

- [ ] **DEBT-01**: Extract gsd-planner.md (1386 lines) into focused modules
- [ ] **DEBT-02**: Extract gsd-executor.md (784 lines) into focused modules
- [ ] **DEBT-03**: Extract execute-plan.md workflow (1844 lines) into focused modules
- [ ] **DEBT-04**: State file schema validation — define required fields and structure
- [ ] **DEBT-05**: State file auto-recovery — reconstruct STATE.md from ROADMAP.md if missing
- [ ] **DEBT-06**: Atomic JSON operations — write-temp, verify, move pattern for config.json edits

### Missing Features

- [ ] **FEAT-01**: Rollback mechanism — record first commit of phase, provide `/gsd:rollback-phase` to revert
- [ ] **FEAT-02**: Plan revision — allow inline task modifications via `<task type="inline">` during execution

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Inner Voice Differentiators

- **VOICE-08**: Confidence scoring (HIGH/MEDIUM/LOW) for each decision
- **VOICE-09**: Risk-tiered autonomy — different thresholds for different decision types
- **VOICE-10**: Context gap detection — proactively identify and log missing context
- **VOICE-11**: Multi-option presentation — show alternatives for borderline decisions

### Tech Debt (Deferred)

- **DEBT-07**: Refactor install.js — extract path utils, config manager, file ops
- **DEBT-08**: Windows UNC path handling in install.js
- **DEBT-09**: Orphaned hook cleanup atomicity

### Missing Features (Deferred)

- **FEAT-03**: Cross-phase dependency tracking — cascade invalidation warnings
- **FEAT-04**: Environment setup validation — check env vars before execution

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Learning from outcomes | Requires outcome tracking infrastructure, high complexity |
| Autonomous tool expansion | Autonomy applies to decisions, not expanding tool permissions |
| Memory across sessions | Each session fresh unless explicitly loaded |
| Partial autonomy mode | Anti-pattern — creates unpredictable UX |
| Known bugs from CONCERNS.md | Lower priority than architecture changes; may be obsoleted |
| Security hardening | Future milestone after architecture stabilizes |
| Performance optimizations | Future milestone |
| Test coverage additions | Future milestone after architecture stabilizes |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOICE-01 | Phase 1 | Pending |
| VOICE-02 | Phase 1 | Pending |
| VOICE-03 | Phase 2 | Pending |
| VOICE-04 | Phase 2 | Pending |
| VOICE-05 | Phase 1 | Pending |
| VOICE-06 | Phase 2 | Pending |
| VOICE-07 | Phase 1 | Pending |
| POLICY-01 | Phase 3 | Pending |
| POLICY-02 | Phase 3 | Pending |
| POLICY-03 | Phase 3 | Pending |
| POLICY-04 | Phase 3 | Pending |
| POLICY-05 | Phase 3 | Pending |
| POLICY-06 | Phase 3 | Pending |
| POLICY-07 | Phase 3 | Pending |
| FLOW-01 | Phase 4 | Pending |
| FLOW-02 | Phase 4 | Pending |
| FLOW-03 | Phase 4 | Pending |
| FLOW-04 | Phase 4 | Pending |
| DEBT-01 | Phase 5 | Pending |
| DEBT-02 | Phase 5 | Pending |
| DEBT-03 | Phase 5 | Pending |
| DEBT-04 | Phase 5 | Pending |
| DEBT-05 | Phase 5 | Pending |
| DEBT-06 | Phase 5 | Pending |
| FEAT-01 | Phase 6 | Pending |
| FEAT-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-26 after roadmap creation*
