# Project Research Summary

**Project:** GSD Autonomous Mode (Inner Voice System)
**Domain:** Meta-prompting system enhancement — autonomous decision-making for AI coding agents
**Researched:** 2026-01-26
**Confidence:** HIGH

## Executive Summary

GSD requires an autonomous mode where Claude answers its own `AskUserQuestion` calls based on project context, enabling "fire and forget" execution for users who trust the system. The recommended approach is prompt-based inner monologue with structured decision traces — not external frameworks like LangChain or rule-based decision engines. This maintains GSD's zero-dependency philosophy while adding autonomous reasoning as an interception layer between decision points and orchestration logic.

The core pattern follows MIRROR's dual-layer architecture: context assembly (Thinker) gathers relevant project state, then inner voice reasoning (Talker) produces decisions with brief traces. All decisions must cite context sources, maintain consistency through decision history, and escalate low-confidence choices to humans even in autonomous mode. The implementation is additive — existing commands and workflows gain autonomous routing without architectural rewrites.

Critical risks include goal drift under extended context (resolved by goal anchoring and 100k token execution caps), runaway loops (circuit breakers required), and specification ambiguity cascades (assumption surfacing mandatory). Research shows 41.77% of multi-agent failures stem from specification problems, making explicit decision logging and context-grounded reasoning non-negotiable. The system must be opt-in by default, produce visible traces for every decision, and maintain backward compatibility with interactive mode.

## Key Findings

### Recommended Stack

Use prompt engineering within GSD's existing architecture, not external frameworks. The autonomous reasoning layer intercepts `AskUserQuestion` calls and generates context-grounded responses.

**Core technologies:**
- **Inner Voice Prompt** (Markdown template) — Generates reasoned answers from context assembly without external dependencies
- **Context Assembler** (JavaScript function) — Gathers PROJECT.md, REQUIREMENTS.md, STATE.md, research outputs, and decision history
- **Decision Trace Logger** (Structured JSON + Markdown) — Records `Auto-decided: [choice] — [reason]` for auditability
- **Config Flag** (config.json entry) — `autonomous: true/false` enables/disables inner voice, defaults to interactive mode

**Why not frameworks:** LangChain/LangGraph/CrewAI add dependency overhead and lock-in. GSD is already a sophisticated agent system — autonomous reasoning is a prompt engineering problem, not a framework problem. Anthropic's own engineering practices favor in-context reasoning over framework abstractions.

**Architecture pattern:** MIRROR dual-layer (Thinker/Talker) adapted for coding agents. Context assembly stays under 10% of context window. Progressive disclosure prevents "dumb RAG" anti-pattern where context overload causes hallucinations.

### Expected Features

**Must have (table stakes):**
- **Configuration flag** — Explicit opt-in required; autonomous mode cannot be default
- **Decision traces** — Brief inline output showing what was decided and why (`Auto-decided: [choice] — [reason]`)
- **Context-aware decisions** — All decisions grounded in PROJECT.md, REQUIREMENTS.md, research outputs, codebase state
- **Full commitment mode** — No partial autonomy; either all decisions are autonomous or none
- **Audit trail** — Persistent log of decisions (`.planning/DECISIONS.md`) for post-hoc review
- **Graceful degradation** — Use explicit defaults when context is insufficient; never invent preferences

**Should have (competitive):**
- **Confidence scoring** — HIGH/MEDIUM/LOW based on context availability and evidence quality
- **Risk-tiered autonomy** — Different thresholds for different decision types (low-risk auto-decide freely, high-risk require strong context)
- **Context gap detection** — Proactively identify and log missing context with explicit "using default" notes
- **Multi-option presentation** — For borderline decisions, show alternatives considered

**Defer (v2+):**
- **Learning from outcomes** — Adjust decision weights based on verification feedback (requires outcome tracking infrastructure)
- **Rollback markers** — Mark decisions that could be reversed if outcomes are bad (useful for "undo" workflows)
- **Verbose explanation mode** — Debug/learning mode with full reasoning chains (deferred until audit needs emerge)

**Anti-features (explicitly avoid):**
- Partial autonomy (sometimes asks, sometimes doesn't) — breaks user mental model
- Autonomous by default — new users need to build trust first
- Silent decisions — making choices without traces breaks trust
- Context invention — never make up user preferences not documented in project files

### Architecture Approach

The autonomous reasoning system is an interception layer that sits between `AskUserQuestion` calls and user prompts. It routes decisions based on the `autonomous` config flag, maintains decision history for consistency, and produces structured traces for auditability.

**Major components:**
1. **Decision Router** — Intercepts AskUserQuestion, checks config.autonomous flag, routes to inner voice or user
2. **Autonomous Reasoner** — Applies context-grounded reasoning to produce decision + trace, implemented as prompt template
3. **Context Aggregator** — Gathers relevant excerpts from PROJECT.md, REQUIREMENTS.md, STATE.md, research outputs (cap: 10% context window)
4. **Decision Logger** — Appends decisions to STATE.md Accumulated Context section with rationale

**Data flow (autonomous mode):**
```
Command/Workflow → AskUserQuestion → Decision Router
                                          ↓ (autonomous=true)
                                  Autonomous Reasoner
                                          ↓
                                  Context Aggregator
                                          ↓
                                  Decision (choice + trace)
                                          ↓
                                  Decision Logger
                                          ↓
                                  Continue execution
```

**Integration points:** Intercept at workflow layer, not commands or agents. Workflows already contain all AskUserQuestion calls. Commands are thin wrappers (no interception needed). Agents run in fresh contexts and write outputs directly (no AskUserQuestion calls).

**Minimal disruption:** This is additive, not a rewrite. Commands add `--interactive` override flag. Workflows add routing check before AskUserQuestion. Agents unchanged. Templates add config.json autonomous flag. Two new reference files: `autonomous-routing.md` and `inner-voice.md`.

### Critical Pitfalls

1. **Goal Drift Under Extended Context** — Agent deviates from original objective as context accumulates. Research shows Claude 3.5 Sonnet maintains goal adherence for ~100k tokens but degrades after. Prevention: anchor decisions to explicit goal statements, cap autonomous execution spans, implement goal-checking assertions that compare current action against original objective from PROJECT.md.

2. **Runaway Execution Loops** — Agent enters infinite loops without termination conditions. Documented case: two agents talked for 11 days, $47,000 API bill. Prevention: dual-threshold circuit breakers (warning threshold nudges to conclude, hard threshold forces completion), cap decision iterations per task (max 5 reasoning cycles before action), track token consumption and wall-clock time with alerts on anomalies.

3. **Specification Ambiguity Cascade** — Ambiguous requirements cause plausible but wrong interpretations that compound through the build. Research shows 41.77% of multi-agent failures stem from specification problems. Prevention: require explicit decision logging with assumption surfacing ("Interpreting [term] as [choice] because [reasoning]"), implement decision checkpoints at phase boundaries, cross-reference all decisions against REQUIREMENTS.md.

4. **Undetectable Hallucinated Actions** — Inner voice confidently decides to use APIs/libraries/patterns that don't exist or work differently than assumed. Prevention: all decisions about codebase state must be preceded by verification (file exists? API available?), separate "reasoning about what might work" from "verified facts about the system", implement fact-checking assertions before using library features.

5. **Decision Inconsistency Across Sessions** — Each session starts fresh, leading to contradictory decisions. Monday: "Use PostgreSQL." Tuesday: "Use SQLite." Prevention: maintain persistent DECISIONS.md log, load prior decisions into context at session start, new decisions must explicitly reference or override prior decisions.

6. **Confidence Miscalibration** — LLMs express high confidence when wrong, low confidence when right. Prevention: define explicit confidence criteria (HIGH = verified with multiple sources, MEDIUM = single source, LOW = assumption only), never allow HIGH confidence for unverified claims, require evidence citations for confidence levels.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency ordering from architecture and feature requirements:

### Phase 1: Foundation (Inner Voice Core)
**Rationale:** Must establish basic autonomous reasoning loop before integration. Goal anchoring and circuit breakers are foundational safety — missing these causes critical pitfalls (goal drift, runaway loops).

**Delivers:**
- Config schema with `autonomous: boolean` flag
- Inner voice prompt template (reasoning protocol)
- Decision trace format specification
- Circuit breakers for runaway prevention
- Goal anchoring mechanism

**Addresses:**
- Configuration flag (table stakes from FEATURES.md)
- Decision traces (table stakes from FEATURES.md)
- Full commitment mode (table stakes from FEATURES.md)

**Avoids:**
- Goal drift (Pitfall #1) via goal anchoring
- Runaway loops (Pitfall #2) via circuit breakers
- Context exhaustion (Pitfall #7) via context budgeting

### Phase 2: Context Integration
**Rationale:** Decisions are only as good as their context. Must connect inner voice to PROJECT.md, REQUIREMENTS.md, research outputs, and codebase state before enabling autonomous execution. This phase prevents specification ambiguity and hallucinated actions.

**Delivers:**
- Context aggregator that gathers relevant project state
- Context source priority ordering
- Progressive disclosure to prevent context overload
- Fact verification layer for codebase assumptions
- Assumption surfacing in decision traces

**Uses:**
- Context assembly from STACK.md (Thinker layer in MIRROR pattern)
- Progressive disclosure pattern (cap at 10% context window)

**Addresses:**
- Context-aware decisions (table stakes from FEATURES.md)
- Graceful degradation (table stakes from FEATURES.md)

**Avoids:**
- Specification ambiguity cascade (Pitfall #3) via assumption surfacing
- Hallucinated actions (Pitfall #4) via fact verification

### Phase 3: Decision Logging and Consistency
**Rationale:** Without decision history, autonomous mode produces contradictory choices across sessions. Audit trail is both a table stakes feature and the foundation for consistency checking and confidence calibration.

**Delivers:**
- Decision logger appending to STATE.md
- Persistent DECISIONS.md format
- Prior decision loading into context
- Consistency checking against decision history
- Confidence scoring with explicit criteria

**Addresses:**
- Audit trail (table stakes from FEATURES.md)
- Confidence scoring (differentiator from FEATURES.md)

**Avoids:**
- Decision inconsistency (Pitfall #5) via history tracking
- Confidence miscalibration (Pitfall #6) via evidence-based criteria
- Missing audit trail (Pitfall #8) via comprehensive logging

### Phase 4: Workflow Integration
**Rationale:** Connect autonomous reasoning to existing GSD workflows. This phase makes autonomous mode usable end-to-end for real projects. Includes safety mechanisms like verification enforcement and tool scoping.

**Delivers:**
- Decision router in workflows (intercepts AskUserQuestion)
- `--interactive` override flag for commands
- Bypass conditions for safety-critical decisions
- Verification step enforcement
- Tool access scoping by phase

**Implements:**
- Decision Router component from ARCHITECTURE.md
- Config-gated routing pattern
- Trace visibility pattern

**Addresses:**
- Context gap detection (differentiator from FEATURES.md)
- Risk-tiered autonomy (differentiator from FEATURES.md)

**Avoids:**
- Verification bypass (Pitfall #9) via structural enforcement
- Tool access overreach (Pitfall #10) via least-privilege scoping

### Phase 5: Polish and Observability (Optional)
**Rationale:** Core functionality complete after Phase 4. This phase adds user experience improvements and debugging capabilities. Can defer to post-MVP if timeline is tight.

**Delivers:**
- Multi-option presentation for borderline decisions
- Verbose explanation mode for debugging
- Decision replay capability
- Performance metrics (token usage, decision speed)
- Health monitoring (fallback frequency)

**Addresses:**
- Multi-option presentation (differentiator from FEATURES.md)

**Avoids:**
- Silent failure modes (Pitfall #12) via explicit BLOCKED status

### Phase Ordering Rationale

- **Foundation first:** Inner voice reasoning loop is the dependency for everything else. Cannot integrate with workflows until the core reasoning mechanism exists.
- **Context before logging:** Context integration (Phase 2) comes before logging (Phase 3) because context quality determines decision quality. Better to have good decisions logged than bad decisions logged comprehensively.
- **Logging before workflow integration:** Decision history must exist before workflows route to autonomous mode, otherwise inconsistency pitfalls occur immediately.
- **Integration last (core functionality):** Phase 4 connects everything to existing GSD workflows. This is where autonomous mode becomes usable end-to-end.
- **Polish deferred:** Phase 5 is optional for MVP. Core value delivered by Phase 4. Polish can follow based on user feedback.

### Research Flags

**Phases needing deeper research during planning:**
- None. This is a prompt engineering problem with well-established patterns. The research completed (STACK, FEATURES, ARCHITECTURE, PITFALLS) provides sufficient guidance for planning.

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Inner monologue and circuit breakers are standard agent patterns, well-documented in Anthropic engineering guides.
- **Phase 2:** Context assembly and progressive disclosure follow established RAG anti-patterns (avoid "dumb RAG").
- **Phase 3:** Decision logging and audit trails are standard observability patterns from LLM tooling (Galileo, Langfuse).
- **Phase 4:** Workflow interception is straightforward integration — no novel patterns.

**Research quality note:** All four research files (STACK, FEATURES, ARCHITECTURE, PITFALLS) drew from high-confidence sources including Anthropic official engineering guides, academic papers (MIRROR, Reflexion), and multi-source verified industry analyses. No critical gaps requiring additional research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Anthropic official guidance on prompt-based reasoning, MIRROR architecture validated academically, zero-dependency approach aligns with GSD philosophy |
| Features | HIGH | Table stakes features derived from autonomous agent best practices (opt-in, traces, audit), differentiators validated across multiple sources |
| Architecture | HIGH | Interception layer pattern verified against existing codebase (grep for AskUserQuestion confirms workflow layer is correct interception point), component boundaries clear |
| Pitfalls | HIGH | Multi-source verification (academic papers on goal drift, incident reports on runaway loops, industry analysis showing 41.77% specification failures), prevention strategies well-documented |

**Overall confidence:** HIGH

### Gaps to Address

**Minor gap — Optimal context window budget:** Research recommends capping context assembly at "~2000 tokens" or "10% of context window" but optimal threshold is task-dependent. During Phase 2 planning, should validate target based on typical GSD decision complexity.

**Minor gap — Confidence threshold calibration:** Risk-tiered autonomy (Phase 4) requires defining what constitutes HIGH vs MEDIUM vs LOW confidence for different decision types. Research provides criteria (evidence quality, source count) but thresholds need calibration during planning. Consider starting conservative (require HIGH confidence for most decisions) and relaxing based on outcomes.

**Not a gap:** No fundamental uncertainties about approach. The prompt-based inner monologue pattern is well-validated. Integration points are clear from codebase analysis. Pitfall prevention strategies are documented. Roadmap can proceed directly to requirements definition.

## Sources

### Primary (HIGH confidence)
- **Anthropic Engineering: Effective Context Engineering for AI Agents** — Context assembly best practices, progressive disclosure
- **Anthropic Engineering: Effective Harnesses for Long-Running Agents** — Circuit breakers, resource limits, context management (39% performance improvement)
- **MIRROR Architecture (arxiv.org/html/2506.00430v1)** — Dual-layer reasoning (21% safety improvement), Thinker/Talker separation
- **Goal Drift Evaluation (arxiv.org/abs/2505.02709)** — Claude 3.5 Sonnet maintains goal adherence ~100k tokens, quantified degradation patterns
- **Multi-Agent LLM Failure Modes (arxiv.org/abs/2503.13657)** — 41.77% specification failures, 36.94% coordination failures, 21.3% verification gaps

### Secondary (MEDIUM confidence)
- **Reflexion Framework (arxiv.org/html/2512.20845)** — Self-reflection patterns for autonomous agents
- **LLM Powered Autonomous Agents (lilianweng.github.io)** — Planning, memory, tool use patterns
- **Inner Monologue Robotics (innermonologue.github.io)** — Feedback integration, closed-loop reasoning
- **IBM Agentic Reasoning** — Think-act-observe loop patterns
- **AI Decision Governance (cybersaint.io)** — Audit trail requirements, compliance frameworks
- **Guardrails Implementation (wizsumo.ai, agno.com)** — Risk-tiered autonomy patterns, confidence threshold calibration

### Tertiary (LOW confidence)
- **Gartner: 40% enterprise apps with AI agents by 2026** — Market prediction, not technical guidance
- **Horror story: $47,000 runaway loop** — Single incident report, prevention strategies validated elsewhere

---
*Research completed: 2026-01-26*
*Ready for roadmap: yes*
