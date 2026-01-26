# Context Assembly Reference

Reference documentation for prioritized context gathering in autonomous decision-making.

## Overview

Context assembly is the process of gathering relevant information before making autonomous decisions. The key insight: prioritized gathering outperforms comprehensive gathering. Loading all context into every decision causes hallucinations and missed constraints. Instead, gather context in priority order and stop when sufficient.

**Why prioritized gathering matters:**
- Avoids context overload that degrades decision quality
- Focuses on user-stated preferences first
- Maintains consistency with prior decisions
- Produces verifiable, citable decisions

**Core principle:** Gather the minimum context needed to make a grounded decision, not the maximum available.

## Context Priority Order

Gather context in this order. Stop when sufficient for the decision at hand.

| Priority | Source | What to Extract | Why This Priority |
|----------|--------|-----------------|-------------------|
| 1 (Highest) | PROJECT.md | Core Value, Constraints, Key Decisions | User's explicit preferences override all else |
| 2 | REQUIREMENTS.md | Active requirements relevant to decision | Explicit scope and feature requirements |
| 3 | Session decision history | Prior decisions in current session | Consistency within execution |
| 4 | Domain knowledge | RESEARCH.md, CONTEXT.md for current phase | Informed technical choices |
| 5 (Lowest) | Codebase state | Codebase map, existing files | What actually exists vs what's planned |

### Priority 1: User-Stated Preferences (PROJECT.md)

The highest priority context. User preferences trump everything else.

**Sections to extract:**
- **Core Value:** The project's primary purpose and success criteria
- **Constraints:** Hard limits that cannot be violated
- **Key Decisions:** Explicit choices already made

**Example extraction:**
```bash
# Extract Core Value
grep -A 5 "## Core Value" .planning/PROJECT.md

# Extract Constraints
grep -A 20 "## Constraints" .planning/PROJECT.md

# Extract Key Decisions
grep -A 30 "## Key Decisions" .planning/PROJECT.md
```

If PROJECT.md answers the question, stop. No need to gather more context.

### Priority 2: Requirements (REQUIREMENTS.md)

Explicit requirements constrain valid choices.

**What to check:**
- Active requirements that relate to the decision
- Out of Scope section (to avoid building the wrong thing)
- Requirement traceability (for citation)

**Example extraction:**
```bash
# Read requirements relevant to decision category
grep -A 20 "[decision-category]" .planning/REQUIREMENTS.md 2>/dev/null
```

### Priority 3: Session Decision History

Maintain consistency within the current execution session.

**Check for:**
- Related decisions already made (reference them)
- Contradictory choices (require explicit override)
- Pattern of choices (maintain consistency)

Session history is already in context (see Session Decision History Format below).

### Priority 4: Domain Knowledge

Phase-specific research and context documents.

**Sources:**
- `{phase}-RESEARCH.md` - Technical recommendations
- `{phase}-CONTEXT.md` - User's vision for the phase

**Example extraction:**
```bash
# Read research recommendations
cat .planning/phases/*/RESEARCH.md 2>/dev/null | head -200
```

### Priority 5: Codebase State

What actually exists, not what's planned.

**Sources:**
- `.planning/codebase/*.md` - Codebase analysis
- Existing files - Verify before modifying

Use codebase state for verification, not primary decision-making.

## Context Gathering Pattern

Step-by-step process for gathering context before autonomous decisions.

```markdown
<step name="gather_decision_context">
For decision: "[Question being decided]"

**Step 1: Check user-stated preferences**
Read PROJECT.md sections: Core Value, Constraints, Key Decisions

If explicit preference found:
  Context sufficient. Use stated preference.
  Citation: "[PROJECT.md:Section Name] states [quote]"
  STOP gathering.

**Step 2: Check requirements**
Read REQUIREMENTS.md for relevant requirements

If requirement constrains choice:
  Context sufficient. Follow requirement.
  Citation: "[REQUIREMENTS.md:requirement-id]: [quote]"
  STOP gathering.

**Step 3: Check session decision history**
Scan session decisions table for related decisions

If prior decision applies:
  Context sufficient. Maintain consistency.
  Citation: "[S###]: [prior choice]"
  STOP gathering.

**Step 4: Check domain knowledge**
Read RESEARCH.md recommendations (if exists)

If research provides guidance:
  Use research recommendation.
  Citation: "[RESEARCH.md:Section]: [recommendation]"
  STOP gathering.

**Step 5: Use default**
If no context found after all steps, use documented default.
Citation: "No context found, using documented default: [default]"
Log: "Assumption: [what was assumed]"
</step>
```

**Important:** Stop at the first level that provides sufficient context. Do not continue gathering "just in case."

## Citation Format

Every autonomous decision must cite its context sources. Citations enable verification and debugging.

### Specific Citations

Use specific references that point to actual content:

| Format | When to Use | Example |
|--------|-------------|---------|
| `[FILE.md:Section Name]` | Referencing a named section | `[PROJECT.md:Core Value]` |
| `[FILE.md:L##]` | Referencing a specific line | `[REQUIREMENTS.md:L42]` |
| `[FILE.md:L##-##]` | Referencing a line range | `[RESEARCH.md:L50-65]` |
| `[S###]` | Referencing session decision | `[S002]` |
| `[D###]` | Referencing persistent decision | `[D015]` |

### Combined Citations

When a decision draws from multiple sources:

```
[PROJECT.md:Constraints, S002]
[REQUIREMENTS.md:AUTH-01, RESEARCH.md:Pattern 2]
```

### Citation Examples

**Good citations (specific and verifiable):**
```
Auto-decided: PostgreSQL — PROJECT.md specifies relational data model [PROJECT.md:L42]
Auto-decided: JWT — Stateless API + mobile client support [PROJECT.md:L48, REQUIREMENTS.md:AUTH-01]
Auto-decided: proceed — No blocking issues in STATE.md [STATE.md:Blockers/Concerns]
Auto-decided: supabase — Consistent with database decision [PROJECT.md:Constraints, S002]
```

**Bad citations (vague and unverifiable):**
```
Auto-decided: PostgreSQL — Based on project context
Auto-decided: JWT — Per requirements
Auto-decided: proceed — Seems appropriate
Auto-decided: supabase — It's a good choice
```

### Citation Verification

Citations must point to actual content. Before outputting a citation:
1. Confirm the file exists
2. Confirm the section/line exists
3. Confirm the content supports the decision

## Session Decision History Format

Session decision history tracks decisions made during the current execution session. It enables consistency checking before new decisions.

### Table Format

```markdown
## Session Decisions (auto-maintained)

| ID | Decision | Choice | Reason | Context |
|----|----------|--------|--------|---------|
| S001 | Database type | PostgreSQL | PROJECT.md specifies relational data | PROJECT.md:L42 |
| S002 | Auth approach | JWT | Stateless API requirement + S001 | PROJECT.md:L48, S001 |
| S003 | Database provider | Supabase | PostgreSQL with auth, consistent with S001 | RESEARCH.md:Pattern 3, S001 |
```

### Column Definitions

| Column | Content | Max Length |
|--------|---------|------------|
| ID | Sequential session ID (S001, S002, ...) | 4 chars |
| Decision | What was being decided | 30 chars |
| Choice | The selected option | 20 chars |
| Reason | Brief rationale | 50 chars |
| Context | Citation references | 40 chars |

### Pattern: Check History Before Deciding

Before making a new decision, scan session history:

```markdown
**Check session history:**
Scan "## Session Decisions" for decisions in same category.

**If related decision found:**
Reference in new decision's reason.
Trace format:
  Auto-decided: [choice] — [reason], consistent with S### [context refs, S###]

Example:
  Auto-decided: Supabase — PostgreSQL database with auth, consistent with S001 database decision [RESEARCH.md:Pattern 3, S001]
```

### Pattern: Reference Prior Decision

When a decision directly relates to a prior session decision:

```
Auto-decided: [choice] — [reason], consistent with S### [context refs, S###]
```

Example:
```
Auto-decided: Prisma — ORM for PostgreSQL, consistent with S001 [RESEARCH.md:L85, S001]
```

### Pattern: Override Prior Decision

When new information requires changing a prior decision:

```
Auto-decided: [new choice] — [reason] (overrides S###: [why override needed]) [context refs]
```

Example:
```
Auto-decided: SQLite — Switching for local dev simplicity (overrides S002: context changed to dev-only) [CONTEXT.md:L15]
```

**Important:** Overrides are rare and require explicit justification. The override reason must explain why the context changed.

## Integration with Autonomous Mode

Context assembly integrates with the autonomous decision wrapper from autonomous.md.

### Workflow Integration

```markdown
<step name="autonomous_decision_with_context">
Check AUTONOMOUS flag from workflow start.

**If AUTONOMOUS=true:**

1. Identify decision category and question
2. Gather context (follow gather_decision_context pattern)
3. Check session history for related decisions
4. Make decision based on gathered context
5. Output trace with citations
6. Record decision in session history

Auto-decided: [choice] — [reason] [citations]

Continue to next step.

**If AUTONOMOUS=false:**

[Existing AskUserQuestion or checkpoint handling - UNCHANGED]
</step>
```

### Context Assembly Before Decision

The sequence is always:
1. **Gather context** - Read relevant files
2. **Check history** - Scan prior decisions
3. **Decide** - Apply context to question
4. **Trace** - Output decision with citations
5. **Record** - Add to session history

Never decide before gathering context. Never skip the trace.

### See Also

- `autonomous.md` - Config flag reading, decision wrapper pattern
- `autonomous-defaults.md` - Defaults when context is insufficient
- `checkpoints.md` - Checkpoint handling in autonomous mode

## Anti-Patterns

Patterns to avoid in context assembly:

### Loading All Context

**Wrong:**
```
Read PROJECT.md (full file)
Read REQUIREMENTS.md (full file)
Read all RESEARCH.md files
Read all codebase/*.md files
Now decide...
```

**Right:**
```
Read PROJECT.md Core Value section
Does it answer the question? Yes.
Stop. Decide based on Core Value.
```

### Generic Citations

**Wrong:**
```
Auto-decided: PostgreSQL — Based on project requirements
Auto-decided: JWT — Per discussion
```

**Right:**
```
Auto-decided: PostgreSQL — PROJECT.md specifies relational data model [PROJECT.md:L42]
Auto-decided: JWT — Stateless API + mobile clients [PROJECT.md:L48, REQUIREMENTS.md:AUTH-01]
```

### Skipping Session History

**Wrong:**
```
[New decision] — [reason]
(No check whether related decisions exist)
```

**Right:**
```
Check session history... found S001 (database: PostgreSQL)
Auto-decided: Prisma — ORM for PostgreSQL, consistent with S001 [S001]
```

### Silent Defaults

**Wrong:**
```
Auto-decided: standard depth — Using default
```

**Right:**
```
Auto-decided: standard depth — Insufficient context, using documented default. Assumption: standard phase complexity
```

## Context Cap Guideline

Recommended context limit per decision: ~2000 tokens.

**Why:** Research indicates focused context produces better decisions than comprehensive context. Most decisions need 1-3 relevant paragraphs, not entire documents.

**How to stay under cap:**
- Extract sections, not full files
- Stop at first sufficient priority level
- Cite specific lines, not documents
- One decision = one context gathering cycle

**When to exceed:** Complex architectural decisions may need more context. Log: "Extended context gathered for architectural decision."
