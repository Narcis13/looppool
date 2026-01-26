# Phase 2: Context-Aware Reasoning - Research

**Researched:** 2026-01-26
**Domain:** Context assembly and decision persistence for autonomous AI agents
**Confidence:** HIGH

## Summary

Phase 2 builds on the autonomous foundation established in Phase 1 by making decisions context-aware and tracked. The research focuses on three interconnected problems: (1) what context sources should inform decisions and how to prioritize them, (2) how to maintain decision history within a session for consistency, and (3) how to persist decisions to an audit trail file.

The existing GSD codebase provides clear patterns. PROJECT.md and REQUIREMENTS.md are already the primary context sources, and STATE.md already tracks recent decisions in summary form. Phase 2 extends these patterns: decisions explicitly cite context sources, a session-scoped decision history enables consistency checking, and a persistent DECISIONS.md provides an audit trail.

**Key finding:** Context assembly should be prioritized (user-stated preferences first), not comprehensive (loading everything). The research confirms GSD should maintain two decision stores: (1) in-memory session history for consistency checking during execution, and (2) persistent DECISIONS.md for cross-session audit trail and review.

**Primary recommendation:** Implement context assembly as a prioritized gathering pattern (PROJECT.md > REQUIREMENTS.md > previous decisions > research outputs > codebase state), maintain session decision history as a running list embedded in workflow context, and persist all decisions to `.planning/DECISIONS.md` in a structured format with timestamps, choices, reasons, and context references.

## Standard Stack

### Core

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| PROJECT.md | `.planning/PROJECT.md` | Core value, constraints, user preferences | Already GSD's primary context document |
| REQUIREMENTS.md | `.planning/REQUIREMENTS.md` | Explicit requirements and scoping | Already GSD's requirements source |
| STATE.md | `.planning/STATE.md` | Session position, recent decisions | Already tracks decisions in summary form |
| DECISIONS.md | `.planning/DECISIONS.md` (NEW) | Persistent audit trail | New file for decision history persistence |
| Research outputs | `.planning/phases/XX-name/{phase}-RESEARCH.md` | Domain knowledge | Already produced by research phase |
| config.json | `.planning/config.json` | Workflow settings, autonomous flag | Already GSD's configuration file |

### Supporting

| Component | Location | Purpose | When to Use |
|-----------|----------|---------|-------------|
| Codebase map | `.planning/codebase/*.md` | Codebase structure knowledge | When making architecture decisions |
| Phase CONTEXT.md | `.planning/phases/XX-name/{phase}-CONTEXT.md` | User's phase-specific preferences | When discussing/planning specific phase |
| SUMMARY.md files | `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md` | Prior execution results | When checking what was already built |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DECISIONS.md (markdown) | DECISIONS.json (structured) | JSON enables programmatic access but markdown is human-readable; GSD favors human readability |
| Single DECISIONS.md | Per-session decision files | Single file provides complete project history; per-session loses cross-session view |
| In-memory session history | Append to DECISIONS.md immediately | Immediate persistence is safer but reading the file repeatedly adds overhead; hybrid approach (memory + batch persist) is best |

**No new dependencies required** - all context sources are existing GSD files read via standard file operations.

## Architecture Patterns

### Recommended Context Assembly Structure

```
Context Assembly for Autonomous Decisions:

1. User-Stated Preferences (highest priority)
   ├── PROJECT.md Core Value section
   ├── PROJECT.md Constraints section
   └── PROJECT.md Key Decisions table

2. Requirements Context
   ├── REQUIREMENTS.md v1 requirements (Active)
   ├── REQUIREMENTS.md Out of Scope
   └── REQUIREMENTS.md Traceability

3. Previous Decisions (session consistency)
   ├── Session decision history (in-memory)
   └── Prior DECISIONS.md entries (cross-session)

4. Domain Knowledge
   ├── Phase RESEARCH.md (if exists)
   └── Phase CONTEXT.md (if exists)

5. Codebase State (lowest priority)
   ├── Codebase map (if exists)
   └── Existing file verification
```

### Pattern 1: Prioritized Context Gathering

**What:** Gather context in priority order, stop when sufficient for the decision

**When to use:** Every autonomous decision point

**Why:** Avoids context overload that causes hallucinations. Research shows "sometimes less context produces better results" (Anthropic).

**Example:**

```markdown
<step name="gather_decision_context">
For decision: "[Question being decided]"

**Step 1: Check user-stated preferences**
Read PROJECT.md sections: Core Value, Constraints, Key Decisions

If explicit preference found:
  Context sufficient. Use stated preference.
  Cite: "PROJECT.md [section] states [quote]"

**Step 2: Check requirements**
Read REQUIREMENTS.md for relevant requirements

If requirement constrains choice:
  Context sufficient. Follow requirement.
  Cite: "REQUIREMENTS.md [requirement ID]: [quote]"

**Step 3: Check previous decisions**
Read session decision history for related decisions

If prior decision applies:
  Context sufficient. Maintain consistency.
  Cite: "Prior decision [ID]: [choice] — [reason]"

**Step 4: Check domain knowledge**
Read RESEARCH.md recommendations (if exists)

If research provides guidance:
  Use research recommendation.
  Cite: "RESEARCH.md [section]: [recommendation]"

**Step 5: Use default**
If no context found, use documented default.
Cite: "No context found, using documented default: [default]"
Log assumption: "Assumption: [what was assumed]"
</step>
```

### Pattern 2: Session Decision History

**What:** Maintain a running list of decisions made during the current session

**When to use:** Every session from first autonomous decision

**Why:** Prevents contradictory decisions within a session. The same context window should produce consistent decisions.

**Implementation:**

```markdown
Session decision history is maintained as a section in workflow context:

## Session Decisions (auto-maintained)

| ID | Decision | Choice | Reason | Context |
|----|----------|--------|--------|---------|
| S001 | Database type | PostgreSQL | PROJECT.md specifies relational data | PROJECT.md:L42 |
| S002 | Auth approach | JWT | Stateless API requirement + S001 | PROJECT.md:L48, S001 |

When making new decision:
1. Scan session history for related decisions
2. If related: Reference prior decision in new decision's reason
3. If contradictory choice needed: Explicitly note override with justification
4. Add new decision to session history

Session history resets on new session (fresh context window).
Cross-session consistency comes from DECISIONS.md persistence.
```

### Pattern 3: Persistent Decision Audit Trail

**What:** Persist all decisions to `.planning/DECISIONS.md` with structured format

**When to use:** After each autonomous decision

**Why:** Enables cross-session consistency, post-hoc review, and debugging of autonomous choices.

**Format:**

```markdown
# Decision Log

## Session: [YYYY-MM-DD HH:MM]

| ID | Timestamp | Decision Point | Choice | Reason | Context Refs | Confidence |
|----|-----------|----------------|--------|--------|--------------|------------|
| D001 | 14:30:15 | Auth approach | JWT | Stateless API + mobile clients | PROJECT.md:L42, REQUIREMENTS.md:AUTH-01 | HIGH |
| D002 | 14:31:02 | Database | PostgreSQL | Relational data model | PROJECT.md:L48 | HIGH |
| D003 | 14:35:44 | Feature scope | v1: AUTH-01,02 | Table stakes per FEATURES.md | FEATURES.md, PROJECT.md core value | MEDIUM |

---

## Session: [previous session date]

[Previous session decisions...]
```

### Pattern 4: Context Citation in Decision Traces

**What:** Every autonomous decision trace includes explicit context references

**When to use:** Every `Auto-decided:` trace output

**Why:** Enables verification that decisions are grounded, not hallucinated.

**Format:**

```
Auto-decided: [choice] — [reason] [context refs]
```

**Examples:**

```
Auto-decided: PostgreSQL — PROJECT.md specifies relational data model [PROJECT.md:L42]
```

```
Auto-decided: JWT — stateless API + mobile client support [PROJECT.md:L48, REQUIREMENTS.md:AUTH-01]
```

```
Auto-decided: proceed — no blocking issues, previous phase complete [STATE.md:position]
```

```
Auto-decided: standard depth — no explicit preference, using default [Assumption: standard complexity]
```

### Anti-Patterns to Avoid

- **Loading all context into every decision:** Creates context overload, causes hallucinations. Instead: prioritized gathering, stop when sufficient.

- **Generic context references:** "Based on project context" is useless. Instead: specific citations with line numbers or section names.

- **Silent defaults:** Using defaults without logging assumptions. Instead: always log `Assumption: [what was assumed]` when using defaults.

- **No consistency checking:** Making decisions without checking session history. Instead: always scan prior decisions for related choices.

- **Mutable decision history:** Editing or deleting past decisions. Instead: append-only log. Corrections are new decisions that explicitly override.

## Don't Hand-Roll

Problems that look simple but should use existing patterns:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Context storage | New database or JSON store | Existing .md files | GSD is file-based; markdown is human-readable |
| Decision IDs | UUID generation | Sequential session-scoped IDs | Simpler, sufficient for audit trail |
| Context search | Full-text search engine | Prioritized section reading | Small project scale; full search is overkill |
| Session history | External memory system | Inline section in workflow context | Stays in context window where decisions happen |
| Persistence | Complex transaction system | Append to markdown file | DECISIONS.md is append-only, no concurrency issues |

**Key insight:** GSD's file-based architecture handles all context needs. The challenge is organization and citation, not storage or retrieval.

## Common Pitfalls

### Pitfall 1: Context Overload Leading to Hallucinations

**What goes wrong:** Dumping all context (PROJECT.md + REQUIREMENTS.md + all research + all history) into every decision causes the model to hallucinate or miss key constraints.

**Why it happens:** Context window filled with noise dilutes signal from critical constraints.

**How to avoid:**
- Prioritized gathering (stop when sufficient)
- Cap context per decision (~2000 tokens recommended)
- Gather context relevant to the specific question

**Warning signs:**
- Decision traces don't cite the most relevant context
- Decisions contradict explicit PROJECT.md constraints
- Reasoning wanders into irrelevant topics

### Pitfall 2: Session Inconsistency Despite History

**What goes wrong:** Session decisions contradict each other even with history tracking.

**Why it happens:**
- History not checked before each decision
- Related decisions not recognized as related
- Context changes mid-session not handled

**How to avoid:**
- Scan session history BEFORE making each decision
- Use consistent terminology for decision categories
- Treat context updates as new decisions that may override

**Warning signs:**
- Same question answered differently in same session
- Decision traces don't reference related prior decisions
- Architecture choices conflict within a phase

### Pitfall 3: Useless Context Citations

**What goes wrong:** Citations like "PROJECT.md" or "per requirements" that don't specify what was cited.

**Why it happens:**
- Shortcuts in trace generation
- No requirement for specificity

**How to avoid:**
- Require section name or line number in every citation
- Format: `[FILE.md:section]` or `[FILE.md:L42]`
- Verify citations point to actual content

**Warning signs:**
- Generic citations without specifics
- Citations that don't match actual file content
- Multiple citations to same generic reference

### Pitfall 4: DECISIONS.md Grows Unmanageably

**What goes wrong:** After many sessions, DECISIONS.md becomes too large to load or review.

**Why it happens:**
- All decisions logged without summarization
- No archival mechanism

**How to avoid:**
- Archive old sessions after milestone completion
- Keep only recent sessions in active DECISIONS.md
- Use SESSION headers to enable selective loading
- Consider per-milestone decision files for large projects

**Warning signs:**
- DECISIONS.md exceeds 500 lines
- Loading decisions takes noticeable time
- Old irrelevant decisions pollute context

### Pitfall 5: Cross-Session Inconsistency

**What goes wrong:** Monday's session decides PostgreSQL, Tuesday's session decides SQLite, no contradiction detected.

**Why it happens:**
- Session history resets between sessions
- DECISIONS.md not loaded at session start
- No explicit consistency check against persistent history

**How to avoid:**
- Load recent DECISIONS.md entries at session start
- New decisions must reference or override persistent decisions
- Implement "decision override" pattern for intentional changes

**Warning signs:**
- Architectural decisions change between sessions
- DECISIONS.md shows contradictory choices
- No "override" entries for changed decisions

## Code Examples

### Context Assembly Function Pattern

```markdown
<step name="assemble_context_for_decision">
**Input:** Question to decide, Decision category

**Process:**

1. Read user preferences:
```bash
# Extract Core Value
grep -A 5 "## Core Value" .planning/PROJECT.md

# Extract Constraints
grep -A 20 "## Constraints" .planning/PROJECT.md

# Extract Key Decisions
grep -A 30 "## Key Decisions" .planning/PROJECT.md
```

2. Check if question answered in user preferences
   - If yes: return context with citation
   - If no: continue to requirements

3. Read requirements:
```bash
# Read relevant section
grep -A 20 "[decision category]" .planning/REQUIREMENTS.md 2>/dev/null
```

4. Check session history (already in context)
   - Scan for related decision IDs
   - If related: note for consistency

5. Read domain research (if exists):
```bash
cat .planning/phases/*/RESEARCH.md 2>/dev/null | head -200
```

**Output:** Assembled context with sources noted for citation
</step>
```

### Decision Persistence Pattern

```markdown
<step name="persist_decision">
**After each autonomous decision:**

1. Generate decision entry:
```
| D[next_id] | [timestamp] | [decision_point] | [choice] | [reason] | [context_refs] | [confidence] |
```

2. Append to session history (in-memory):
```
Add row to "## Session Decisions" table in current context
```

3. Append to DECISIONS.md:
```bash
# Append entry to DECISIONS.md under current session
echo "| D${ID} | $(date -u +%H:%M:%S) | ${DECISION} | ${CHOICE} | ${REASON} | ${REFS} | ${CONF} |" >> .planning/DECISIONS.md
```

**Important:** This is append-only. Never modify past entries.
</step>
```

### Session Start Pattern

```markdown
<step name="load_decision_context">
At workflow start, load decision context:

1. Read autonomous flag (per Phase 1 pattern):
```bash
AUTONOMOUS=$(cat .planning/config.json 2>/dev/null | grep -o '"autonomous"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "false")
```

2. If AUTONOMOUS=true, load recent decisions:
```bash
# Read last 20 decisions from DECISIONS.md
tail -30 .planning/DECISIONS.md 2>/dev/null
```

3. Initialize session decision history:
```markdown
## Session Decisions (auto-maintained)

| ID | Decision | Choice | Reason | Context |
|----|----------|--------|--------|---------|
```

4. Add session header to DECISIONS.md:
```bash
echo "" >> .planning/DECISIONS.md
echo "## Session: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .planning/DECISIONS.md
echo "" >> .planning/DECISIONS.md
echo "| ID | Timestamp | Decision Point | Choice | Reason | Context Refs | Confidence |" >> .planning/DECISIONS.md
echo "|----|-----------|----------------|--------|--------|--------------|------------|" >> .planning/DECISIONS.md
```
</step>
```

### Later Decision Referencing Earlier Decision

```markdown
<step name="reference_prior_decision">
When making a decision that relates to a prior decision:

**Check session history:**
Scan "## Session Decisions" for decisions in same category.

**If related decision found (e.g., S002 relates to S001):**

Trace format:
```
Auto-decided: [choice] — [reason], consistent with S001 [context refs, S001]
```

Example:
```
Auto-decided: Supabase — PostgreSQL database with auth, consistent with S002 database decision [PROJECT.md:L48, S002]
```

**If contradicting a prior decision:**

Trace format:
```
Auto-decided: [new choice] — [reason] (overrides S001: [why override needed]) [context refs]
```

Example:
```
Auto-decided: SQLite — Switching for local dev simplicity (overrides S002: context changed to dev-only) [CONTEXT.md:L15]
```

Add override entry to DECISIONS.md with explicit "Override: S002" notation.
</step>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No decision tracking | Decision traces (Phase 1) | This milestone | Visibility into autonomous choices |
| Single-session memory | Persistent DECISIONS.md | Phase 2 | Cross-session consistency |
| Implicit context | Explicit citations | Phase 2 | Auditability, debugging |
| Load all context | Prioritized gathering | Phase 2 | Better decisions, fewer hallucinations |

**Current best practices from research:**
- Context should be prioritized, not comprehensive (Anthropic context engineering)
- Decision history must be explicit and persistent (Concentrix failure patterns)
- Citations must be verifiable (MIRROR architecture, audit trail requirements)
- Session boundaries must be clear (no implicit carryover assumptions)

## DECISIONS.md Template

```markdown
# Decision Log

This file tracks all autonomous decisions made across GSD sessions. Each session has its own section. Decisions are append-only; corrections are new decisions that explicitly override.

## Format

Each decision row contains:
- **ID**: Session-scoped identifier (D001, D002, etc.)
- **Timestamp**: UTC time of decision
- **Decision Point**: What was being decided
- **Choice**: The selected option
- **Reason**: Brief rationale (10-20 words)
- **Context Refs**: Specific sources cited (FILE.md:section or FILE.md:L##)
- **Confidence**: HIGH/MEDIUM/LOW based on context availability

## Current Session

(Populated at session start)

---

## Session: [previous session timestamp]

| ID | Timestamp | Decision Point | Choice | Reason | Context Refs | Confidence |
|----|-----------|----------------|--------|--------|--------------|------------|
| ... | ... | ... | ... | ... | ... | ... |
```

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal context cap per decision**
   - What we know: Research suggests ~2000 tokens is effective for most decisions
   - What's unclear: Optimal may vary by decision complexity
   - Recommendation: Start with 2000 token guideline, adjust based on decision quality in practice

2. **Decision ID scope (project vs session vs global)**
   - What we know: Session-scoped IDs (S001, S002) are simplest for in-session references
   - What's unclear: How to reference cross-session decisions when loaded
   - Recommendation: Use session IDs for in-session, prefix with date for cross-session refs (e.g., "2026-01-26:D003")

3. **When to archive old DECISIONS.md sessions**
   - What we know: File will grow without bound otherwise
   - What's unclear: What triggers archival (milestone? line count? time?)
   - Recommendation: Archive during `/gsd:complete-milestone`, keep last 2-3 sessions active

4. **How to handle context conflicts (PROJECT.md vs REQUIREMENTS.md)**
   - What we know: PROJECT.md should take precedence (user's explicit preferences)
   - What's unclear: Edge cases where requirements should override constraints
   - Recommendation: PROJECT.md wins for preference conflicts; log conflict in decision trace

## Sources

### Primary (HIGH confidence)

- `.planning/PROJECT.md` - Existing GSD project context pattern
- `.planning/REQUIREMENTS.md` - Existing GSD requirements pattern
- `.planning/STATE.md` - Existing GSD state tracking pattern
- `get-shit-done/templates/state.md` - STATE.md template with decisions section
- `get-shit-done/templates/project.md` - PROJECT.md template with Key Decisions
- `get-shit-done/references/autonomous.md` - Phase 1 autonomous patterns
- `.planning/research/STACK.md` - Decision history pattern research
- `.planning/research/PITFALLS.md` - Pitfall #5: Decision Inconsistency
- `.planning/research/FEATURES.md` - Audit trail requirements

### Secondary (MEDIUM confidence)

- Anthropic context engineering research (WebSearch verified) - "sometimes less context produces better results"
- MIRROR architecture (arxiv.org/html/2506.00430v1) - Dual-layer reasoning separation

### Tertiary (LOW confidence - needs validation)

- Optimal context token cap (2000 tokens) - Based on general guidance, not GSD-specific testing

## Metadata

**Confidence breakdown:**
- Context sources: HIGH - All sources are existing GSD files with documented patterns
- Context assembly: HIGH - Prioritized gathering is well-established pattern
- Session history: HIGH - Simple append-only pattern, no complex state management
- Persistence format: HIGH - DECISIONS.md follows GSD markdown conventions
- Citation format: MEDIUM - Specific format needs validation during implementation

**Research date:** 2026-01-26
**Valid until:** N/A - This is implementation research for a specific phase, not technology research that could become stale

---

*Phase: 02-context-aware-reasoning*
*Research completed: 2026-01-26*
*Ready for planning: yes*
