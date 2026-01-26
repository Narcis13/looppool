# Feature Landscape: Autonomous Agent Decision-Making

**Domain:** Autonomous decision-making for AI coding agents (specifically: autonomous mode for GSD meta-prompting system)
**Researched:** 2026-01-26
**Overall Confidence:** MEDIUM-HIGH

## Context

GSD currently asks users questions at decision points via `AskUserQuestion`:
- "Does this roadmap structure work for you?"
- "Which features are in v1?"
- "Approve this plan?"

With autonomous mode, Claude answers these itself based on PROJECT.md, REQUIREMENTS.md, research outputs, codebase state, and decision history.

---

## Table Stakes

Features users expect. Missing = autonomy feels broken or unsafe.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Configuration flag** | Users must opt-in to autonomous behavior; default should be interactive | Low | Single flag in `config.json`: `"autonomous": true/false` |
| **Decision traces** | Users need to know WHAT was decided and WHY, even if not asked | Low | Format: `Auto-decided: [choice] -- [reason]` |
| **Context-aware decisions** | Decisions must use available context (PROJECT.md, REQUIREMENTS.md, codebase state) | Medium | Read all relevant context before deciding |
| **Consistent decision logic** | Same inputs should produce same decisions; no random choices | Medium | Deterministic logic based on documented heuristics |
| **Full commitment mode** | Once enabled, no pausing mid-execution to ask questions | Low | No "sometimes autonomous" half-measures |
| **Audit trail** | Comprehensive log of all autonomous decisions for post-hoc review | Medium | Decision history persisted to file (e.g., `.planning/DECISIONS.md`) |
| **Graceful degradation** | When context is insufficient to decide, use sensible defaults or flag for later | Medium | Don't fail silently; don't invent context |

### Table Stakes Detail

#### 1. Configuration Flag (Low Complexity)

**What:** Single boolean flag to enable/disable autonomous mode.

**Implementation:**
```json
// .planning/config.json
{
  "autonomous": true,
  // ... existing config
}
```

**Behavior:**
- `false` (default): Current behavior - AskUserQuestion at decision points
- `true`: Claude decides, logs decision trace, continues without pausing

**Rationale:** Users must explicitly opt-in. Autonomous behavior without consent breaks trust.

#### 2. Decision Traces (Low Complexity)

**What:** Brief inline traces explaining each autonomous decision.

**Format:**
```
Auto-decided: [CHOICE] -- [REASON based on context]
```

**Examples:**
```
Auto-decided: Research first -- PROJECT.md indicates greenfield project with unfamiliar domain
Auto-decided: Approve roadmap -- All requirements mapped, phase ordering matches dependencies in REQUIREMENTS.md
Auto-decided: YOLO mode -- User stated "fast iteration" as priority in PROJECT.md
```

**Rationale:** Visibility into agent reasoning is non-negotiable. Users must understand why the agent chose what it chose.

#### 3. Context-Aware Decisions (Medium Complexity)

**What:** Decisions based on documented context, not guesswork.

**Context Sources (priority order):**
1. PROJECT.md - Core value, constraints, user preferences
2. REQUIREMENTS.md - Scoped requirements, priorities
3. ROADMAP.md - Phase structure, dependencies
4. config.json - Workflow preferences already stated
5. Research outputs - Domain knowledge, recommended approaches
6. Codebase state - Existing code, detected patterns
7. Decision history - Previous choices in this session

**Decision Logic:**
- For each decision point, identify relevant context sections
- Apply documented heuristics (see Decision Policies below)
- If no clear answer from context, use domain-appropriate defaults

**Rationale:** Autonomous decisions must be traceable to documented preferences, not invented.

#### 4. Consistent Decision Logic (Medium Complexity)

**What:** Deterministic heuristics that produce predictable decisions.

**Decision Policy Examples:**

| Decision Point | Policy |
|----------------|--------|
| Research vs Skip | Research if: greenfield, unfamiliar domain, or config.workflow.research = true |
| Feature scope (v1/v2) | v1 if: marked table stakes in FEATURES.md, or explicitly mentioned in PROJECT.md core value |
| Roadmap approval | Approve if: 100% requirement coverage, no orphan requirements, phase dependencies satisfied |
| Mode selection | Match config.mode (yolo/interactive), or infer from PROJECT.md language ("fast", "careful") |
| Depth selection | Quick for experiment projects, Standard for normal, Comprehensive if "thorough" in constraints |

**Rationale:** Autonomous mode should feel like a predictable assistant, not a random decision generator.

#### 5. Full Commitment Mode (Low Complexity)

**What:** No mid-execution pauses. Either fully autonomous or fully interactive.

**Behavior:**
- When `autonomous: true`, ALL decision points are auto-decided
- No "pause here but not there" partial autonomy
- User can still interrupt with `/gsd:pause-work`

**Rationale:** Half-measures create unpredictable UX. Users need to know what to expect.

#### 6. Audit Trail (Medium Complexity)

**What:** Persistent log of all autonomous decisions for review.

**Format (`.planning/DECISIONS.md`):**
```markdown
# Decision Log

## Session: 2026-01-26T14:30:00

| Timestamp | Decision Point | Choice | Reason | Context Refs |
|-----------|---------------|--------|--------|--------------|
| 14:30:15 | Research | Skip | Domain familiar (existing codebase mapped) | PROJECT.md:L45, codebase/ARCHITECTURE.md |
| 14:31:02 | v1 Features | AUTH-01, AUTH-02, CONT-01 | Marked table stakes | FEATURES.md, PROJECT.md core value |
| 14:35:44 | Roadmap | Approved | 100% coverage, deps satisfied | REQUIREMENTS.md traceability |
```

**Rationale:** Post-hoc review is essential. Users may want to understand why something went wrong or validate agent reasoning.

#### 7. Graceful Degradation (Medium Complexity)

**What:** When context is insufficient, use defaults rather than hallucinating or failing.

**Degradation Hierarchy:**
1. **Explicit context available:** Use it, cite it
2. **Context missing but defaults exist:** Use default, note assumption
3. **No context, no default, non-critical:** Use most conservative option
4. **No context, critical decision:** Flag as "Needs Review" in decision log, proceed with conservative choice

**Example:**
```
Auto-decided: Standard depth -- No explicit preference in PROJECT.md, using default for first project
[Assumption: User would have specified if they wanted quick/comprehensive]
```

**Rationale:** Never stop execution waiting for context that doesn't exist. Never invent preferences.

---

## Differentiators

Features that set autonomous mode apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Confidence scoring** | Show confidence level with each decision (HIGH/MEDIUM/LOW) | Low | Based on context availability and policy match |
| **Decision explanation depth** | Verbose mode for detailed reasoning chains | Medium | Flag for debug/learning mode |
| **Rollback markers** | Mark decisions that could be reversed if outcomes are bad | Medium | Useful for "undo" workflows |
| **Learning from outcomes** | Adjust decision weights based on whether outcomes were good | High | Requires outcome tracking (deferred) |
| **Risk-tiered autonomy** | Different thresholds for different risk levels (roadmap approval vs feature scoping) | Medium | Higher stakes = more conservative defaults |
| **Context gap detection** | Proactively identify missing context before decisions | Medium | "Missing: user preference for [X], using default [Y]" |
| **Multi-option presentation** | When confidence is low, present top 2-3 options in trace (agent picked option A, but B was close) | Medium | Transparency for borderline decisions |

### Differentiator Detail

#### 1. Confidence Scoring (Low Complexity)

**What:** Each decision trace includes confidence level.

**Format:**
```
Auto-decided: [CHOICE] -- [REASON] [CONFIDENCE: HIGH/MEDIUM/LOW]
```

**Scoring Logic:**
- **HIGH:** Direct match to explicit user preference in context
- **MEDIUM:** Inferred from multiple signals, no contradictions
- **LOW:** Based on defaults or weak signals

**Value:** Users know when to trust decisions vs when to review audit trail.

#### 2. Risk-Tiered Autonomy (Medium Complexity)

**What:** Different confidence thresholds for different decision types.

**Risk Tiers:**

| Tier | Decision Types | Confidence Threshold for Auto-decide |
|------|---------------|--------------------------------------|
| Low | Mode, depth, research toggle | Any confidence |
| Medium | Feature scoping, phase ordering | MEDIUM or higher |
| High | Roadmap approval, architecture decisions | HIGH only, else conservative default |

**Behavior:** Low-risk decisions auto-decide freely. High-risk decisions require strong context or fall back to conservative defaults.

**Value:** Critical decisions get appropriate scrutiny without slowing routine choices.

#### 3. Context Gap Detection (Medium Complexity)

**What:** Proactively identify and log missing context.

**Format:**
```
[Context Gap] No explicit preference for deployment platform in PROJECT.md
[Using Default] Vercel (most common for Next.js projects)
```

**Value:** Users can review gaps and add context to PROJECT.md for future runs.

#### 4. Multi-Option Presentation (Medium Complexity)

**What:** For borderline decisions, show alternatives considered.

**Format:**
```
Auto-decided: Supabase -- Best fit for stated constraints [CONFIDENCE: MEDIUM]
[Also considered] Planetscale (faster queries, but less ecosystem fit)
[Also considered] Convex (real-time by default, but learning curve)
```

**Value:** Transparency into decision process, helps users understand tradeoffs.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in autonomous agent design.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Partial autonomy** | "Sometimes asks, sometimes doesn't" creates unpredictable UX and breaks user mental model | Full commitment: either all decisions auto-decided or none |
| **Autonomous by default** | Users who haven't opted in will be surprised by agent acting without permission | Explicit opt-in required; default is interactive mode |
| **Silent decisions** | Making decisions without any trace breaks trust and auditability | Always emit decision trace, even for "obvious" choices |
| **Confidence theater** | Showing HIGH confidence when context is weak to seem competent | Honest confidence levels; admit when using defaults |
| **Irreversible autonomy** | No way to review/change after the fact | Audit trail + ability to rerun with different choices |
| **Context invention** | Making up user preferences that don't exist in documentation | Only use documented context; flag gaps explicitly |
| **Retry loops** | Re-asking the same question hoping for different context | If context missing, use default once and move on |
| **Explanation overload** | Verbose reasoning for every trivial decision | Brief traces; verbose mode only when enabled |
| **Memory persistence** | Remembering decisions across sessions without clear mechanism | Each session starts fresh unless explicitly loaded |
| **Autonomous tool invocation** | Running bash commands, making network calls without user knowledge in autonomous mode | Autonomy applies to decisions, not to expanding tool use beyond current permissions |

### Anti-Feature Detail

#### Partial Autonomy (Critical to Avoid)

**The Trap:** "Autonomous for routine decisions, interactive for important ones" sounds reasonable but creates chaos.

**Problems:**
- Users never know when they'll be asked
- Can't step away from keyboard
- Mental model constantly shifts

**Instead:** Binary choice. `autonomous: true` means ALL decisions are auto-decided. `autonomous: false` means ALL decisions are interactive.

#### Context Invention (Critical to Avoid)

**The Trap:** When context is missing, it's tempting to infer user preferences from general patterns.

**Examples of Bad Inference:**
- "Users typically want fast iteration" (not documented)
- "Most projects use Next.js" (not their project)
- "Based on the project name, they probably want..." (speculation)

**Instead:** Only cite documented context. Use explicit defaults for gaps. Log assumptions.

#### Autonomous by Default (Critical to Avoid)

**The Trap:** Making autonomous mode the recommended or default option because it's "more efficient."

**Problems:**
- New users haven't built trust yet
- Mistakes in early runs erode confidence
- No opportunity to learn how the system thinks

**Instead:** Default is interactive. Autonomous mode is for users who:
- Have run GSD interactively multiple times
- Trust the decision policies
- Want to "fire and forget"

---

## Feature Dependencies

```
Configuration Flag
    |
    v
Decision Policies (heuristics) <-- Context Sources (PROJECT.md, REQUIREMENTS.md, etc.)
    |
    v
Decision Traces (inline output)
    |
    v
Audit Trail (persistent log)
    |
    v
[Optional] Confidence Scoring
    |
    v
[Optional] Risk-Tiered Autonomy
    |
    v
[Optional] Context Gap Detection
```

**Build Order Implications:**
1. **Phase 1:** Configuration flag + basic decision traces (can ship minimal autonomous mode)
2. **Phase 2:** Decision policies for each decision point in GSD workflows
3. **Phase 3:** Audit trail persistence + context-aware decisions
4. **Phase 4:** Differentiators (confidence scoring, risk tiers, gap detection)

---

## MVP Recommendation

For MVP, prioritize:

1. **Configuration flag** - Single `autonomous: true/false` in config.json
2. **Decision traces** - Brief inline output for every auto-decision
3. **Decision policies** - Documented heuristics for each decision point
4. **Full commitment mode** - No partial autonomy

Defer to post-MVP:
- **Audit trail file** - Useful but not blocking for initial value
- **Confidence scoring** - Nice to have, not essential for functionality
- **Risk-tiered autonomy** - Can start with single threshold
- **Context gap detection** - Can log assumptions inline without separate system
- **Learning from outcomes** - Requires outcome tracking infrastructure

**MVP Scope:**
- Works end-to-end for `/gsd:new-project` and `/gsd:plan-phase` workflows
- Covers ~10-15 decision points currently using AskUserQuestion
- Produces visible traces so user sees what happened
- Can be disabled to return to interactive mode

---

## Decision Points Inventory

Current GSD decision points that would become autonomous:

### In /gsd:new-project

| Decision Point | Current Question | Autonomous Policy |
|----------------|------------------|-------------------|
| Brownfield offer | "Map codebase first?" | Yes if code detected and no map exists |
| Ready for PROJECT.md | "Ready to create PROJECT.md?" | Yes when context checklist passes |
| Research decision | "Research first?" | Yes if greenfield or unfamiliar domain |
| Feature scoping | "Which features in v1?" | Table stakes + explicit mentions in PROJECT.md |
| Roadmap approval | "Does this roadmap work?" | Yes if 100% coverage, deps satisfied |

### In /gsd:plan-phase

| Decision Point | Current Question | Autonomous Policy |
|----------------|------------------|-------------------|
| Discovery depth | "Quick/Standard/Deep?" | Based on config.depth and phase complexity |
| Plan approval | "Execute this plan?" | Yes if verification passed |

### In /gsd:execute-phase

| Decision Point | Current Question | Autonomous Policy |
|----------------|------------------|-------------------|
| Checkpoint:decision | Options presented | Policy-based selection |
| Checkpoint:human-verify | "Approved?" | Auto-approve if automated tests pass |

### In Other Workflows

| Decision Point | Current Question | Autonomous Policy |
|----------------|------------------|-------------------|
| Settings changes | Multi-select options | Use context defaults |
| Debug approach | "Which approach?" | Most comprehensive if unspecified |

---

## Sources

**Ecosystem Research:**
- [Best Practices for AI Agent Implementations](https://onereach.ai/blog/best-practices-for-ai-agent-implementations/) - Enterprise patterns for autonomous agents
- [AI Decision Governance 2026](https://www.cybersaint.io/blog/ai-decision-governance-how-to-prepare-for-the-top-challenge-of-2026) - Governance and audit requirements
- [Guide for Guardrails Implementation 2026](https://www.wizsumo.ai/blog/how-to-implement-ai-guardrails-in-2026-the-complete-enterprise-guide) - Safety patterns for autonomous systems
- [Guardrails for AI Agents](https://www.agno.com/blog/guardrails-for-ai-agents) - Risk-tiered autonomy patterns
- [LLM Observability Guide 2026](https://portkey.ai/blog/the-complete-guide-to-llm-observability/) - Tracing and decision logging
- [Confidence Threshold Calibration](https://www.conifers.ai/glossary/confidence-threshold-calibration) - When to escalate to humans
- [AI Escalation Management](https://www.partnerhero.com/blog/ai-escalation-management) - Human-in-the-loop patterns
- [Agent Decision Audit and Explainability](https://air-governance-framework.finos.org/mitigations/mi-21_agent-decision-audit-and-explainability.html) - Audit trail requirements

**Coding Agent Comparisons:**
- [Claude Code vs Cursor Comparison 2026](https://northflank.com/blog/claude-code-vs-cursor-comparison) - Autonomy spectrum
- [Devin vs Claude Code 2026](https://www.builder.io/blog/devin-vs-claude-code) - Different autonomy models
- [Claude Code Autonomous Mode Guide](https://pasqualepillitteri.it/en/news/141/claude-code-dangerously-skip-permissions-guide-autonomous-mode) - Permission modes

**Rollback and Recovery:**
- [IBM STRATUS Undo Mechanism](https://research.ibm.com/blog/undo-agent-for-cloud) - Transactional rollback for agents
- [Refact.ai Agent Rollback](https://docs.refact.ai/features/autonomous-agent/rollback/) - Repository state rollback
- [Rubrik Agent Rewind](https://www.rubrik.com/products/agent-rewind) - Enterprise agent recovery

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Table Stakes | HIGH | Core patterns well-documented across multiple sources |
| Decision Policies | MEDIUM | Context-specific; will need iteration based on actual GSD workflows |
| Anti-Features | HIGH | Clear consensus in literature on what to avoid |
| Differentiators | MEDIUM | Nice-to-have features vary by use case |
| MVP Scope | HIGH | Minimal set is clear and achievable |
