# Roadmap: GSD Autonomous Mode

## Overview

This roadmap delivers full autonomous execution for GSD, enabling Claude to reason through every decision point without human intervention. The journey starts with the inner voice foundation (config flag, decision traces), progresses through context assembly and decision policies, integrates with all GSD workflows, then addresses technical debt and safety features. By completion, users can run `/gsd:new-project` through `/gsd:execute-phase` with zero human input when `autonomous: true` is set.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Inner Voice Foundation** - Config flag, decision traces, full commitment mode
- [x] **Phase 2: Context-Aware Reasoning** - Context assembly, decision history, audit trail
- [ ] **Phase 3: Decision Policies** - Specific policies for each GSD decision type
- [ ] **Phase 4: Workflow Integration** - Connect autonomous reasoning to all GSD workflows
- [ ] **Phase 5: Architecture Refactoring** - Extract monolithic files into focused modules
- [ ] **Phase 6: Safety Features** - Rollback mechanism and plan revision

## Phase Details

### Phase 1: Inner Voice Foundation
**Goal**: Establish the basic autonomous reasoning loop with configuration and visibility
**Depends on**: Nothing (first phase)
**Requirements**: VOICE-01, VOICE-02, VOICE-05, VOICE-07
**Success Criteria** (what must be TRUE):
  1. Config flag pattern and reference docs exist for enabling autonomous mode (workflow integration in Phase 4)
  2. Every autonomous decision outputs `Auto-decided: [choice] — [reason]` trace
  3. When enabled, ALL decision points are auto-decided (no partial autonomy)
  4. When context is insufficient, system uses documented defaults and logs assumptions
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Create autonomous reference documentation (patterns, defaults)
- [x] 01-02-PLAN.md — Integrate autonomous handling into execute-plan.md

### Phase 2: Context-Aware Reasoning
**Goal**: Decisions are grounded in project context and tracked for consistency
**Depends on**: Phase 1
**Requirements**: VOICE-03, VOICE-04, VOICE-06
**Success Criteria** (what must be TRUE):
  1. Autonomous decisions read and cite PROJECT.md, REQUIREMENTS.md, research outputs
  2. Decision history is maintained within session for consistency across decisions
  3. All decisions are persisted to `.planning/DECISIONS.md` with timestamps and context refs
  4. Later decisions reference earlier decisions when relevant
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Create context assembly reference and DECISIONS.md template
- [x] 02-02-PLAN.md — Integrate context-aware reasoning into execute-plan.md

### Phase 3: Decision Policies
**Goal**: Specific policies answer common GSD questions automatically
**Depends on**: Phase 2
**Requirements**: POLICY-01, POLICY-02, POLICY-03, POLICY-04, POLICY-05, POLICY-06, POLICY-07
**Success Criteria** (what must be TRUE):
  1. Brownfield detection auto-triggers codebase mapping when code exists without map
  2. Research toggle auto-enables for greenfield or unfamiliar domain projects
  3. Feature scoping auto-classifies requirements as v1 (table stakes + explicit mentions) or v2
  4. Roadmap approval auto-proceeds when 100% coverage and deps satisfied
  5. Plan approval auto-proceeds when checker passes
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Create decision-policies.md reference with all 7 policy definitions
- [ ] 03-02-PLAN.md — Integrate POLICY-01/02/03/04 into new-project.md
- [ ] 03-03-PLAN.md — Integrate POLICY-05 into plan-phase.md and POLICY-06/07 references into execute-plan.md

### Phase 4: Workflow Integration
**Goal**: All GSD workflows respect autonomous flag and route decisions appropriately
**Depends on**: Phase 3
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. `/gsd:new-project` runs end-to-end with zero human input when autonomous enabled
  2. `/gsd:plan-phase` runs end-to-end with zero human input when autonomous enabled
  3. `/gsd:execute-phase` runs all checkpoints autonomously when autonomous enabled
  4. All other GSD workflows check autonomous flag before prompting user
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Architecture Refactoring
**Goal**: Large monolithic files extracted into maintainable focused modules
**Depends on**: Phase 4
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, DEBT-06
**Success Criteria** (what must be TRUE):
  1. gsd-planner.md (1386 lines) is split into modules under 500 lines each
  2. gsd-executor.md (784 lines) is split into focused modules
  3. execute-plan.md workflow (1844 lines) is split into focused modules
  4. STATE.md has schema validation with required fields defined
  5. STATE.md auto-recovers from ROADMAP.md when corrupted or missing
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Safety Features
**Goal**: Safer autonomous operation with rollback and inline plan revision
**Depends on**: Phase 4
**Requirements**: FEAT-01, FEAT-02
**Success Criteria** (what must be TRUE):
  1. `/gsd:rollback-phase` command exists and reverts to phase start commit
  2. First commit of each phase is recorded for rollback reference
  3. Inline task modifications are possible during execution without full re-planning
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Inner Voice Foundation | 2/2 | Complete | 2026-01-26 |
| 2. Context-Aware Reasoning | 2/2 | Complete | 2026-01-26 |
| 3. Decision Policies | 0/3 | Ready to execute | - |
| 4. Workflow Integration | 0/TBD | Not started | - |
| 5. Architecture Refactoring | 0/TBD | Not started | - |
| 6. Safety Features | 0/TBD | Not started | - |
