# Architecture Patterns: Autonomous Reasoning Integration

**Domain:** Autonomous agent systems / Inner voice for existing orchestration
**Researched:** 2026-01-26
**Confidence:** HIGH (existing codebase well-documented, patterns well-established in literature)

## Executive Summary

Integrating autonomous reasoning into GSD's existing command/workflow/agent architecture requires an **interception layer** that sits between decision points (AskUserQuestion calls) and the orchestration logic. The recommended architecture follows the **Inner Monologue pattern** from robotics and the **Reflexion pattern** from LLM agents: maintain a feedback loop where context is continuously incorporated into decision-making, with decisions logged for consistency and transparency.

The key insight: autonomous reasoning is NOT a replacement for the existing architecture but an **interceptor** that answers questions the orchestrator would otherwise route to humans.

## Recommended Architecture

```
                              +------------------+
                              |   config.json    |
                              | autonomous: true |
                              +--------+---------+
                                       |
                                       v
+---------------+         +------------------------+         +-----------------+
|   Command     |         |    Decision Router     |         |   User          |
| (gsd:*cmd)    +-------->|  (new interception     +-------->|  (interactive)  |
+---------------+         |       layer)           |         +-----------------+
                          +----------+-------------+
                                     |
                                     | autonomous=true
                                     v
                          +------------------------+
                          |   Autonomous Reasoner  |
                          |   (Inner Voice)        |
                          +----------+-------------+
                                     |
                          +----------+-------------+
                          |  Context Sources       |
                          |  - PROJECT.md          |
                          |  - REQUIREMENTS.md     |
                          |  - STATE.md            |
                          |  - Research outputs    |
                          |  - Decision History    |
                          +------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Decision Router** | Intercepts AskUserQuestion, routes based on `autonomous` config flag | Commands, Workflows, Autonomous Reasoner, User |
| **Autonomous Reasoner** | Applies reasoning to context, produces decision + trace | Decision Router, Context Sources, Decision Logger |
| **Context Aggregator** | Gathers relevant context from project files | Autonomous Reasoner |
| **Decision Logger** | Records decisions with rationale for consistency | Autonomous Reasoner, STATE.md |

### Data Flow

**Interactive Mode (autonomous=false):**
```
Command/Workflow → AskUserQuestion → User → Response → Continue
```

**Autonomous Mode (autonomous=true):**
```
Command/Workflow → AskUserQuestion → Decision Router
                                          |
                  +---------------------- | autonomous=true
                  v                       |
          Autonomous Reasoner             | autonomous=false
                  |                       v
                  v                     User
          Context Aggregator
                  |
                  v
          Decision (choice + trace)
                  |
                  v
          Decision Logger (appends to history)
                  |
                  v
          Continue execution
```

## Where Autonomous Reasoning Intercepts

**Recommendation:** Intercept at the **workflow layer**, not commands or agents.

| Layer | Intercept? | Rationale |
|-------|------------|-----------|
| **Commands** | No | Commands are thin wrappers; they delegate to workflows. Putting interception here creates duplication. |
| **Workflows** | **Yes** | All AskUserQuestion calls originate here. Single interception point. |
| **Agents** | No | Agents are spawned with fresh context; they don't call AskUserQuestion (they write outputs directly). |

**Specific interception points in workflows:**

1. **Confirmation gates** (e.g., "Approve roadmap?") - `get-shit-done/workflows/*.md`
2. **Decision checkpoints** (e.g., "Which auth provider?") - `get-shit-done/references/checkpoints.md`
3. **Discovery confidence gates** (e.g., "Low confidence. Proceed?") - `get-shit-done/workflows/discovery-phase.md`
4. **Questioning loops** (e.g., "Ready to create PROJECT.md?") - `get-shit-done/references/questioning.md`

## Component Specifications

### 1. Decision Router

**Location:** New reference file: `get-shit-done/references/autonomous-routing.md`

**Behavior:**
```markdown
## When AskUserQuestion is called

1. Read config.json `autonomous` flag
2. If false → pass through to user
3. If true → route to Autonomous Reasoner

## Bypass conditions (always ask user even in autonomous mode):

- Checkpoint type is `checkpoint:human-action` (requires physical action)
- Safety flag in config (`safety.always_confirm_destructive`)
- External service authentication gates
```

**Implementation approach:** The router is NOT code - it's prompt instructions that precede AskUserQuestion calls in workflows. Every workflow that uses AskUserQuestion must read and apply `autonomous-routing.md`.

### 2. Autonomous Reasoner (Inner Voice)

**Location:** New reference file: `get-shit-done/references/inner-voice.md`

**Inputs:**
- The question being asked (from AskUserQuestion call)
- Options presented (from AskUserQuestion call)
- Context sources (aggregated)

**Outputs:**
- Selected option
- Brief reasoning trace (1-2 sentences)
- Confidence level

**Reasoning protocol:**
```markdown
## Inner Voice Reasoning

When making autonomous decisions:

1. **Load context**
   - Read PROJECT.md → core value, constraints, vision
   - Read REQUIREMENTS.md → v1 scope, out of scope
   - Read STATE.md → current position, accumulated decisions
   - Read decision history → prior choices in this session

2. **Apply decision heuristics**
   - Prefer options aligned with core value
   - Prefer options that reduce scope (MVP mindset)
   - Prefer conventional choices over novel ones
   - When options are equivalent, prefer the first (default)
   - When uncertain, prefer the option that's reversible

3. **Check consistency**
   - Does this contradict a prior decision?
   - If yes, note the contradiction and prefer consistency unless new info justifies change

4. **Produce output**
   - Choice: [selected option]
   - Trace: "Auto-decided: [choice] because [1-sentence reason]"
   - Confidence: HIGH/MEDIUM/LOW
```

### 3. Context Aggregator

**Location:** Inline in `inner-voice.md` (not a separate component)

**Sources (in priority order):**

| Source | What it provides | When to read |
|--------|------------------|--------------|
| `PROJECT.md` | Core value, constraints, vision | Every decision |
| `REQUIREMENTS.md` | v1 scope, what's out of scope | Feature decisions |
| `STATE.md` | Current phase, accumulated decisions, blockers | Every decision |
| `research/SUMMARY.md` | Domain recommendations | Tech/arch decisions |
| `config.json` | Depth, mode, workflow flags | Process decisions |
| Decision History | Prior session decisions | Consistency checks |

**Context window budget:** Context aggregation must stay under 10% of context window. Read relevant excerpts, not full files. For PROJECT.md, read Core Value section. For REQUIREMENTS.md, read v1 section only.

### 4. Decision Logger

**Location:** Append to `STATE.md` Accumulated Context section

**Format:**
```markdown
## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Chose Supabase for auth — aligns with existing DB choice
- [Phase 1]: Skipped OAuth for v1 — MVP scope, add later
- [Auto]: Approved roadmap — all requirements mapped, structure follows dependencies
```

**Logged fields:**
- Phase or context (e.g., "[Phase 1]", "[Auto]", "[Roadmap]")
- Decision summary
- Brief rationale

**NOT logged:** Every micro-decision. Only log:
- Decisions that affect downstream phases
- Decisions that resolve ambiguity
- Decisions that override defaults

## Patterns to Follow

### Pattern 1: Config-Gated Routing

**What:** Check config before every AskUserQuestion call
**When:** All workflows that use AskUserQuestion

**Implementation:**
```markdown
## Before AskUserQuestion

Read routing config:
- If `.planning/config.json` has `"autonomous": true`:
  - Apply inner-voice.md reasoning
  - Log decision
  - Continue without user prompt
- If `"autonomous": false` or flag missing:
  - Present AskUserQuestion to user normally
```

### Pattern 2: Trace Visibility

**What:** Show what autonomous mode decided (not hidden)
**When:** Every autonomous decision

**Example output:**
```
Auto-decided: Supabase for database — matches existing stack, free tier sufficient

Proceeding with database setup...
```

**NOT:**
```
Proceeding with database setup...
```

Users should always know when autonomous mode made a choice and why.

### Pattern 3: Bypass for Safety

**What:** Some decisions always require human even in autonomous mode
**When:** Destructive operations, external service auth, human-action checkpoints

**Bypass conditions (from existing config):**
- `safety.always_confirm_destructive: true` → bypass for destructive git operations
- `safety.always_confirm_external_services: true` → bypass for API key entry
- `checkpoint:human-action` type → always bypass (physical action required)

### Pattern 4: Feedback Loop (Reflexion)

**What:** Learn from execution outcomes to inform future decisions
**When:** After phase completion

**Implementation:**
```markdown
## After Phase Execution

If verification passes:
- No action needed

If verification fails (gaps found):
- Review autonomous decisions made during planning
- Log which decisions may have contributed to gaps
- Adjust decision history to note "reconsidered"
- Next planning cycle should weight these decisions differently
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Replacing User Entirely

**What:** Making autonomous mode completely hide all decisions
**Why bad:** Users lose visibility, trust erodes, debugging impossible
**Instead:** Always show traces, allow --interactive override

### Anti-Pattern 2: Hardcoded Rules

**What:** Implementing autonomous reasoning as if/else decision trees
**Why bad:** Brittle, doesn't generalize, requires constant maintenance
**Instead:** Context-based reasoning that uses project documents as the rule source

### Anti-Pattern 3: Decision Without Context

**What:** Making autonomous decisions without reading project state
**Why bad:** Decisions conflict with project constraints, user intent
**Instead:** Always aggregate context before deciding

### Anti-Pattern 4: Inconsistent Decisions

**What:** Making different choices for similar questions across phases
**Why bad:** Confuses implementation, creates technical debt
**Instead:** Log decisions, check history, maintain consistency

### Anti-Pattern 5: Silent Failures

**What:** Autonomous mode fails to decide, silently picks default
**Why bad:** User doesn't know decision was uncertain
**Instead:** If confidence is LOW, escalate to user even in autonomous mode

## Build Order (Dependencies)

The following build order respects dependencies between components:

### Phase 1: Foundation (No Dependencies)

1. **Config schema update** - Add `autonomous: boolean` to config.json template
2. **Decision history schema** - Define format for STATE.md decision logging
3. **Bypass conditions** - Document which decisions always require human

**Why first:** These are data structures that other components depend on.

### Phase 2: Routing Layer (Depends on Phase 1)

4. **autonomous-routing.md** - Create reference document for routing logic
5. **Workflow updates** - Add routing check before AskUserQuestion calls in:
   - `new-project.md` (commands)
   - `new-milestone.md` (commands)
   - `discovery-phase.md` (workflows)
   - `execute-phase.md` (workflows)
   - `verify-phase.md` (workflows)

**Why second:** Routing needs config schema to exist.

### Phase 3: Reasoning Engine (Depends on Phase 2)

6. **inner-voice.md** - Create reference document for reasoning protocol
7. **Context aggregation** - Define which files to read and what excerpts
8. **Decision heuristics** - Document the reasoning rules

**Why third:** Reasoning is invoked by routing; routing must exist first.

### Phase 4: Logging and Visibility (Depends on Phase 3)

9. **Decision logging** - Implement STATE.md updates after autonomous decisions
10. **Trace output** - Add visible "Auto-decided:" messages in workflows
11. **Override flag** - Add `--interactive` flag to commands for bypass

**Why fourth:** Logging captures reasoning output; reasoning must exist first.

### Phase 5: Feedback Loop (Depends on Phase 4)

12. **Verification feedback** - Connect verification failures to decision review
13. **Consistency checking** - Add prior decision lookup before new decisions
14. **Confidence escalation** - Route LOW confidence decisions to user

**Why last:** Feedback requires decisions to be logged and traceable.

## Scalability Considerations

| Concern | Current (manual) | With Autonomous Mode |
|---------|------------------|---------------------|
| Context reading | User provides context verbally | Automated aggregation from files |
| Decision speed | Blocked on human response time | Near-instant (ms) |
| Consistency | Human memory (inconsistent) | Decision history (consistent) |
| Debugging | Ask user what they chose | Read decision log |
| Override | N/A | `--interactive` flag |

## Integration with Existing Architecture

**Minimal disruption:** The autonomous reasoning system is additive, not a rewrite.

| Existing Component | Changes Required |
|--------------------|------------------|
| Commands | Add `--interactive` override flag |
| Workflows | Add routing check before AskUserQuestion |
| Agents | No changes (agents don't call AskUserQuestion) |
| Templates | Add config.json autonomous flag |
| References | Add 2 new files (autonomous-routing.md, inner-voice.md) |
| STATE.md | Add decision logging section |

## Sources

Research informing this architecture:

**Academic/Industry:**
- [LLM Powered Autonomous Agents (Lil'Log)](https://lilianweng.github.io/posts/2023-06-23-agent/) - Planning, memory, tool use patterns
- [Inner Monologue (Google Robotics)](https://innermonologue.github.io/) - Feedback integration, closed-loop reasoning
- [Agentic AI Design Patterns (AIMultiple)](https://research.aimultiple.com/agentic-ai-design-patterns/) - Multi-agent orchestration patterns
- [IBM: What Is Agentic Reasoning?](https://www.ibm.com/think/topics/agentic-reasoning) - Think-act-observe loop

**Confidence levels:**
- HIGH: Interception at workflow layer (verified against codebase grep for AskUserQuestion)
- HIGH: Config-driven routing (consistent with existing config.json pattern)
- MEDIUM: Decision heuristics (standard practice, not verified against user preferences)
- MEDIUM: Feedback loop design (Reflexion pattern, implementation details TBD)

---

*Architecture research: 2026-01-26*
