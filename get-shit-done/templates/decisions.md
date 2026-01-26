# DECISIONS.md Template

Template for `.planning/DECISIONS.md` - persistent audit trail of autonomous decisions.

---

## File Template

```markdown
# Decision Log

This file tracks all autonomous decisions made across GSD sessions. Each session has its own section. Decisions are append-only; corrections are new decisions that explicitly override prior decisions.

## Format

Each decision row contains:

| Column | Description | Example |
|--------|-------------|---------|
| ID | Session-scoped identifier (D001, D002, ...) | D001 |
| Timestamp | UTC time of decision (HH:MM:SS) | 14:30:15 |
| Decision Point | What was being decided (brief) | Auth approach |
| Choice | The selected option | JWT |
| Reason | Brief rationale (10-20 words) | Stateless API + mobile clients |
| Context Refs | Specific sources cited (FILE.md:section or FILE.md:L##) | PROJECT.md:L42 |
| Confidence | HIGH/MEDIUM/LOW based on context availability | HIGH |

**Confidence levels:**
- **HIGH:** Explicit user preference or requirement found
- **MEDIUM:** Research recommendation or pattern match
- **LOW:** Default used due to insufficient context

## Current Session

<!-- Session header auto-populated at session start -->
<!-- Format: ## Session: YYYY-MM-DDTHH:MM:SSZ -->

| ID | Timestamp | Decision Point | Choice | Reason | Context Refs | Confidence |
|----|-----------|----------------|--------|--------|--------------|------------|

---

## Session: 2026-01-25T10:15:00Z

| ID | Timestamp | Decision Point | Choice | Reason | Context Refs | Confidence |
|----|-----------|----------------|--------|--------|--------------|------------|
| D001 | 10:15:32 | Database type | PostgreSQL | PROJECT.md specifies relational data | PROJECT.md:L42 | HIGH |
| D002 | 10:16:45 | Auth approach | JWT | Stateless API + mobile client support | PROJECT.md:L48, REQUIREMENTS.md:AUTH-01 | HIGH |
| D003 | 10:18:20 | ORM selection | Prisma | Type-safe ORM, consistent with D001 | RESEARCH.md:Pattern 2, D001 | MEDIUM |
| D004 | 10:22:15 | Test framework | Vitest | No preference stated, safest option (fast, ESM-native) | Assumption: modern test runner | LOW |

---

## Session: 2026-01-24T14:30:00Z

| ID | Timestamp | Decision Point | Choice | Reason | Context Refs | Confidence |
|----|-----------|----------------|--------|--------|--------------|------------|
| D001 | 14:30:15 | Project structure | monorepo | Multiple packages planned per requirements | REQUIREMENTS.md:ARCH-02 | HIGH |
| D002 | 14:35:44 | Feature scope | v1: AUTH-01,02,03 | Table stakes for MVP per CONTEXT.md | CONTEXT.md:Must Haves | HIGH |
| D003 | 14:40:22 | Build tool | Turborepo | Monorepo caching, consistent with D001 | RESEARCH.md:L85-92, D001 | MEDIUM |
```

---

## Usage Guidelines

### Session Start

When a workflow starts with `AUTONOMOUS=true`, add a new session header:

```bash
echo "" >> .planning/DECISIONS.md
echo "## Session: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .planning/DECISIONS.md
echo "" >> .planning/DECISIONS.md
echo "| ID | Timestamp | Decision Point | Choice | Reason | Context Refs | Confidence |" >> .planning/DECISIONS.md
echo "|----|-----------|----------------|--------|--------|--------------|------------|" >> .planning/DECISIONS.md
```

### Recording Decisions

After each autonomous decision, append a row:

```bash
echo "| D${ID} | $(date -u +%H:%M:%S) | ${DECISION_POINT} | ${CHOICE} | ${REASON} | ${CONTEXT_REFS} | ${CONFIDENCE} |" >> .planning/DECISIONS.md
```

**ID generation:** Sequential within session (D001, D002, ...). Reset for each session.

### Referencing Decisions

Within a session, reference by ID: `consistent with D001`

Cross-session references use date prefix: `consistent with 2026-01-24:D002`

### Override Entries

When a decision overrides a prior one, note explicitly:

```
| D005 | 10:45:00 | Database type | SQLite | Dev simplicity (Override D001: context changed to local dev) | CONTEXT.md:L15 | MEDIUM |
```

### Archival

When DECISIONS.md exceeds ~500 lines, archive old sessions:

1. Move old sessions to `.planning/decisions-archive/YYYY-MM.md`
2. Keep last 2-3 sessions in main file
3. Note archival: `<!-- Sessions before 2026-01 archived to decisions-archive/2026-01.md -->`

---

## Template Markers

For workflows that generate DECISIONS.md:

| Marker | Replacement |
|--------|-------------|
| `[SESSION_TIMESTAMP]` | `$(date -u +%Y-%m-%dT%H:%M:%SZ)` |
| `[DECISION_TIMESTAMP]` | `$(date -u +%H:%M:%S)` |
| `[NEXT_ID]` | Next sequential ID (D001, D002, ...) |

---

## See Also

- `context-assembly.md` - Context gathering and citation format
- `autonomous.md` - Autonomous mode configuration
- `state.md` - STATE.md template (also tracks recent decisions)
