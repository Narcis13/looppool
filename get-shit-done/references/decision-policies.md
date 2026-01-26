# Decision Policies Reference

Centralized policy definitions for autonomous decision-making in GSD workflows.

## Overview

Decision policies are declarative rules that map observable conditions to specific choices. Policies define WHAT to decide at each decision point; workflows implement HOW to apply these policies.

**Key principle:** Policies are deterministic rules, not reasoning processes. A policy reads like: "IF [conditions] THEN [choice] BECAUSE [rationale]."

**Why declarative rules:**
- Predictable: Same conditions always produce same choice
- Auditable: Every decision can be traced to a specific rule
- Maintainable: Single source of truth for all policies
- Testable: Conditions are observable (file checks, counts, pattern matches)

**Policies vs reasoning:**
- Policy: "IF config.research=true AND greenfield THEN enable research" (deterministic)
- Reasoning: "Consider whether research would be helpful" (non-deterministic)

## Policy Format Reference

Every policy follows this standard structure:

```markdown
## POLICY-XX: [Name]

**Decision point:** [Where this policy applies (workflow/command)]

**Applies when:** [Conditions that trigger this policy]

**Policy rule:**

IF [observable conditions]
THEN [specific choice]
BECAUSE [rationale]

**Observable condition check:**

```bash
[Actual commands to evaluate conditions]
```

**Trace output format:**

```
Auto-decided: [choice] -- [reason] [POLICY-XX, {details}]
```

**Confidence levels:**
- HIGH: [When to assign HIGH]
- MEDIUM: [When to assign MEDIUM]
- LOW: [When to assign LOW]

**Fallback behavior:** [What to do when conditions are ambiguous]
```

---

## POLICY-01: Brownfield Detection

**Decision point:** `/gsd:new-project` Phase 2 (Brownfield Offer)

**Applies when:** Determining whether to map existing codebase

**Policy rule:**

IF code files exist in repository
AND no codebase map exists
THEN trigger codebase mapping
BECAUSE existing code needs mapping for accurate planning

**Observable condition check:**

```bash
# Check for code files (exclude common non-source directories)
CODE_FILES=$(find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" 2>/dev/null | grep -v node_modules | grep -v .git | grep -v __pycache__ | head -1)

# Check if codebase map already exists
HAS_CODEBASE_MAP=$([ -d .planning/codebase ] && echo "yes" || echo "no")
```

**Decision:**
- If `CODE_FILES` non-empty AND `HAS_CODEBASE_MAP` = "no": Trigger mapping
- If `CODE_FILES` empty: Proceed without mapping (greenfield)
- If `HAS_CODEBASE_MAP` = "yes": Use existing map, skip mapping

**Trace output format:**

```
Auto-decided: map codebase -- Code exists without map [POLICY-01, file: {detected_file}]
```

```
Auto-decided: skip mapping -- No code files detected (greenfield) [POLICY-01]
```

```
Auto-decided: use existing map -- Codebase map already exists [POLICY-01, .planning/codebase]
```

**Confidence levels:**
- HIGH: Clear presence or absence of code files
- MEDIUM: Mixed state (some files, partial map)
- LOW: Detection errors or edge cases

**Fallback behavior:** If code detection fails or returns ambiguous results, proceed without mapping (assume greenfield). Log assumption.

---

## POLICY-02: Research Toggle

**Decision point:** `/gsd:new-project` Phase 6 (Research Decision)

**Applies when:** Deciding whether to research domain before requirements

**Policy rule:**

IF config.workflow.research = true
AND project is greenfield OR no codebase map
THEN enable research
BECAUSE greenfield and unfamiliar domains benefit from domain research

IF config.workflow.research = false
THEN skip research
BECAUSE user explicitly disabled research

IF brownfield with existing codebase map
THEN skip general research (per-phase research may still occur)
BECAUSE existing codebase provides sufficient domain context

**Observable condition check:**

```bash
# Check research config flag
WORKFLOW_RESEARCH=$(cat .planning/config.json 2>/dev/null | grep -o '"research"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

# Check if greenfield (no codebase map)
GREENFIELD=$([ ! -d .planning/codebase ] && echo "yes" || echo "no")
```

**Decision:**
- If `WORKFLOW_RESEARCH` = "true" AND `GREENFIELD` = "yes": Research enabled
- If `WORKFLOW_RESEARCH` = "false": Skip research
- If `GREENFIELD` = "no" (brownfield with map): Skip general research

**Trace output format:**

```
Auto-decided: research enabled -- Greenfield project [POLICY-02, config: workflow.research=true]
```

```
Auto-decided: skip research -- User disabled research [POLICY-02, config: workflow.research=false]
```

```
Auto-decided: skip research -- Brownfield with codebase map [POLICY-02, .planning/codebase exists]
```

**Confidence levels:**
- HIGH: Config explicitly set true or false
- MEDIUM: Config missing, using default
- LOW: Config parse error

**Fallback behavior:** Default to research enabled (safer to research than to miss context). Log: "Assumption: research beneficial for unfamiliar domain."

---

## POLICY-03: Feature Scoping

**Decision point:** `/gsd:new-project` Phase 7 (Define Requirements)

**Applies when:** Categorizing features as v1 vs v2

**Policy rule:**

IF feature is in FEATURES.md "Table stakes" category
OR feature is explicitly mentioned in PROJECT.md
THEN classify as v1
BECAUSE table stakes are expected, PROJECT.md mentions are explicit user priority

IF feature is in FEATURES.md "Differentiators" category
AND NOT mentioned in PROJECT.md
THEN classify as v2
BECAUSE differentiators are enhancements, not core requirements

IF feature is in neither FEATURES.md nor PROJECT.md
THEN classify as out of scope
BECAUSE unlisted features are not part of current project scope

**Observable condition check:**

```bash
# Check if feature is table stakes
TABLE_STAKES_SECTION=$(grep -A 100 "Table stakes:" .planning/research/FEATURES.md 2>/dev/null | grep -B 100 "Differentiators:" | head -n -1)
IS_TABLE_STAKES=$(echo "$TABLE_STAKES_SECTION" | grep -qi "[feature]" && echo "yes" || echo "no")

# Check if feature is in PROJECT.md
IN_PROJECT=$(grep -qi "[feature]" .planning/PROJECT.md 2>/dev/null && echo "yes" || echo "no")

# Check if feature is a differentiator
DIFFERENTIATORS_SECTION=$(grep -A 100 "Differentiators:" .planning/research/FEATURES.md 2>/dev/null)
IS_DIFFERENTIATOR=$(echo "$DIFFERENTIATORS_SECTION" | grep -qi "[feature]" && echo "yes" || echo "no")
```

**Decision:**
- If `IS_TABLE_STAKES` = "yes" OR `IN_PROJECT` = "yes": v1
- If `IS_DIFFERENTIATOR` = "yes" AND `IN_PROJECT` = "no": v2
- Otherwise: Out of scope

**Trace output format:**

```
Auto-decided: v1 -- Table stakes feature ({feature}) [POLICY-03, FEATURES.md:Table stakes]
```

```
Auto-decided: v1 -- Explicit PROJECT.md mention ({feature}) [POLICY-03, PROJECT.md]
```

```
Auto-decided: v2 -- Differentiator not in PROJECT.md ({feature}) [POLICY-03, FEATURES.md:Differentiators]
```

```
Auto-decided: out of scope -- Not in FEATURES.md or PROJECT.md ({feature}) [POLICY-03]
```

**Confidence levels:**
- HIGH: Feature explicitly listed in one category
- MEDIUM: Feature implied by related term
- LOW: Feature categorization unclear

**Fallback behavior:** If FEATURES.md missing, all PROJECT.md mentions are v1, rest is v2. Log: "Assumption: PROJECT.md features are v1, unlisted features are v2."

---

## POLICY-04: Roadmap Approval

**Decision point:** `/gsd:new-project` Phase 8 (after roadmapper creates ROADMAP.md)

**Applies when:** Deciding whether to approve roadmap

**Policy rule:**

IF 100% of v1 requirements have phase mapping
AND no unmapped requirements in REQUIREMENTS.md (zero "Pending" entries)
AND phases are ordered by dependency
THEN auto-approve roadmap
BECAUSE complete coverage with proper ordering is a correct roadmap

IF any requirements unmapped OR dependencies violated
THEN request revision
BECAUSE incomplete roadmap will miss features or cause execution errors

**Observable condition check:**

```bash
# Check for unmapped requirements (any "Pending" in traceability)
UNMAPPED=$(grep -c "Pending" .planning/REQUIREMENTS.md 2>/dev/null || echo "0")

# Count v1 requirements (lines starting with "- [ ] **")
V1_COUNT=$(grep -c "^\- \[ \] \*\*" .planning/REQUIREMENTS.md 2>/dev/null || echo "0")

# Count mapped requirements (have "Phase X" reference)
MAPPED_COUNT=$(grep -c "Phase [0-9]" .planning/REQUIREMENTS.md 2>/dev/null || echo "0")

# Verify counts match
COVERAGE=$([ "$MAPPED_COUNT" -ge "$V1_COUNT" ] && [ "$UNMAPPED" = "0" ] && echo "complete" || echo "incomplete")
```

**Decision:**
- If `COVERAGE` = "complete": Approve
- If `COVERAGE` = "incomplete": Request revision

**Trace output format:**

```
Auto-decided: approve roadmap -- 100% requirement coverage [POLICY-04, {mapped_count}/{v1_count} mapped, 0 pending]
```

```
Auto-decided: request revision -- Incomplete requirement coverage [POLICY-04, {mapped_count}/{v1_count} mapped, {unmapped} pending]
```

**Confidence levels:**
- HIGH: Counts match exactly, zero pending
- MEDIUM: Counts close, minor discrepancies
- LOW: Counting logic ambiguous

**Fallback behavior:** If counts ambiguous or parsing fails, present to user for manual verification. Log: "Assumption: verification needed due to ambiguous requirement counts."

---

## POLICY-05: Plan Approval

**Decision point:** `/gsd:plan-phase` Step 11 (after checker return)

**Applies when:** Deciding whether to approve plans after checker review

**Policy rule:**

IF checker returns "## VERIFICATION PASSED"
THEN auto-approve plans
BECAUSE checker validates plan quality

IF checker returns "## ISSUES FOUND"
THEN trigger revision loop (up to 3 iterations per existing code)
BECAUSE checker identified problems requiring fixes

**Observable condition check:**

```bash
# Check checker output for VERIFICATION PASSED
CHECKER_PASSED=$(echo "$CHECKER_OUTPUT" | grep -q "## VERIFICATION PASSED" && echo "yes" || echo "no")

# Check checker output for ISSUES FOUND
CHECKER_ISSUES=$(echo "$CHECKER_OUTPUT" | grep -q "## ISSUES FOUND" && echo "yes" || echo "no")
```

**Decision:**
- If `CHECKER_PASSED` = "yes": Approve
- If `CHECKER_ISSUES` = "yes": Trigger revision loop

**Trace output format:**

```
Auto-decided: approve plans -- Checker passed verification [POLICY-05, VERIFICATION PASSED]
```

```
Auto-decided: revision needed -- Checker found issues [POLICY-05, ISSUES FOUND, iteration {n}/3]
```

**Confidence levels:**
- HIGH: Clear PASSED or ISSUES FOUND marker
- MEDIUM: Partial match or unclear status
- LOW: Checker output malformed

**Fallback behavior:** If checker returns neither PASSED nor ISSUES FOUND, present to user for manual decision. Log: "Assumption: manual review needed due to unclear checker output."

---

## POLICY-06: Checkpoint Decision Selection

**Decision point:** execute-plan.md checkpoint_protocol for `checkpoint:decision`

**Applies when:** Selecting from multiple options in a checkpoint:decision task

**Policy rule:**

IF context (PROJECT.md, REQUIREMENTS.md, RESEARCH.md) explicitly addresses this decision
THEN select option that matches context
BECAUSE user preferences and requirements take precedence

IF session history contains related decision
THEN select option consistent with prior decision
BECAUSE maintain consistency within execution session

IF no explicit context but one option is clearly safest/most reversible
THEN select safest option
BECAUSE conservative defaults minimize risk

**Observable condition check:**

Uses context assembly pattern from context-assembly.md:

```markdown
1. Check PROJECT.md for explicit preference
   - Core Value section
   - Constraints section
   - Key Decisions table

2. Check REQUIREMENTS.md for requirement constraint
   - Relevant requirement categories

3. Check session history for related decision
   - Scan DECISIONS.md for same decision category

4. Check RESEARCH.md for recommendation
   - Standard Stack section
   - Recommended patterns
```

**Decision:**
- If explicit preference in PROJECT.md: Select matching option (HIGH confidence)
- If requirement constrains choice: Select constrained option (HIGH confidence)
- If session history has related decision: Select consistent option (MEDIUM confidence)
- If research recommendation: Select recommended option (MEDIUM confidence)
- If no guidance: Select safest/most reversible option (LOW confidence)

**Trace output format:**

```
Auto-decided: {option} -- PROJECT.md specifies {preference} [POLICY-06, PROJECT.md:Constraints, HIGH]
```

```
Auto-decided: {option} -- Consistent with prior decision [POLICY-06, S###, MEDIUM]
```

```
Auto-decided: {option} -- RESEARCH.md recommends {reason} [POLICY-06, RESEARCH.md:Pattern X, MEDIUM]
```

```
Auto-decided: {option} -- No preference, safest option (most reversible) [POLICY-06, Assumption: standard choice, LOW]
```

**Confidence levels:**
- HIGH: PROJECT.md or REQUIREMENTS.md explicitly addresses decision
- MEDIUM: Session history or RESEARCH.md provides guidance
- LOW: No context, using safest option heuristic

**Safest option heuristics (from autonomous-defaults.md):**
- Prefer standard/default over custom
- Prefer established libraries over new ones
- Prefer smaller scope over larger
- Prefer reversible over irreversible
- Prefer explicit over implicit

**Fallback behavior:** Select safest/most reversible option. Log: "Assumption: [what was assumed about the decision]."

---

## POLICY-07: Checkpoint Human-Verify Auto-Approval

**Decision point:** execute-plan.md checkpoint_protocol for `checkpoint:human-verify`

**Applies when:** All automated verifications pass

**Policy rule:**

IF all automated verifications pass (tests, build, endpoints)
THEN auto-approve verification
BECAUSE automated checks cover functional correctness

IF any automated verification fails
THEN fall back to human (even in autonomous mode)
BECAUSE failures require human judgment to assess impact

**Observable condition check:**

```bash
# Run test suite
npm test 2>&1 | tail -20
TEST_EXIT=$?

# Run build
npm run build 2>&1 | tail -10
BUILD_EXIT=$?

# Run lint (if exists)
npm run lint 2>&1 | tail -10
LINT_EXIT=$?

# Check endpoints (if specified in verification)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"
ENDPOINT_EXIT=$?

# Aggregate results
ALL_PASS=$([ "$TEST_EXIT" = "0" ] && [ "$BUILD_EXIT" = "0" ] && echo "yes" || echo "no")
```

**Decision:**
- If `ALL_PASS` = "yes": Approve (HIGH confidence)
- If any exit code != 0: Fall back to human

**Trace output format:**

```
Auto-decided: approved -- All verification checks passed [POLICY-07, tests: {pass}/{total}, build: success]
```

```
Auto-decided: approved -- All verification checks passed [POLICY-07, tests: {pass}/{total}, build: success, lint: pass, endpoint: 200]
```

**Human fallback output:**

```
Autonomous mode: Verification failed, human review required
- Tests: {pass}/{total} ({fail} failed)
- Build: {status}
- Lint: {status}
- Endpoint: {status}
```

**Confidence levels:**
- HIGH: All automated checks pass with clear results
- MEDIUM: N/A (partial passes fall back to human)
- LOW: N/A (failures always fall back to human)

**Fallback behavior:** If any check fails, present failure details and wait for human. Autonomous mode does not skip quality gates. Log failures and specific error messages.

---

## Policy Integration Patterns

How workflows apply policies. Workflows reference this document for policy rules; they don't define policies inline.

### Pattern 1: Simple Binary Policy (POLICY-01, 05, 07)

For policies with clear yes/no outcomes based on observable conditions.

```markdown
<step name="decision_point">
Check AUTONOMOUS flag from workflow start.

**If AUTONOMOUS=true:**

1. Check observable conditions:
   ```bash
   [condition check commands from policy]
   ```

2. Apply POLICY-XX:
   IF [condition true]
   THEN [choice A]
   ```
   Auto-decided: [choice A] -- [reason] [POLICY-XX, {details}]
   ```
   Execute choice A.

   IF [condition false]
   THEN [choice B]
   ```
   Auto-decided: [choice B] -- [reason] [POLICY-XX]
   ```
   Execute choice B.

**If AUTONOMOUS=false:**
[Existing interactive flow - unchanged]
</step>
```

**Applicable policies:**
- POLICY-01: map codebase OR skip mapping
- POLICY-05: approve OR revision loop
- POLICY-07: approve OR human fallback

### Pattern 2: Context-Based Policy (POLICY-06)

For policies that require gathering context before deciding.

```markdown
<step name="checkpoint_decision">
Check AUTONOMOUS flag from workflow start.

**If AUTONOMOUS=true:**

1. Gather decision context (per context-assembly.md):
   - Check PROJECT.md for explicit preference
   - Check REQUIREMENTS.md for constraints
   - Check session history for related decisions
   - Check RESEARCH.md for recommendations

2. Match context to available options:
   - Explicit preference -> HIGH confidence
   - Session consistency -> MEDIUM confidence
   - Research recommendation -> MEDIUM confidence
   - No context -> safest option, LOW confidence

3. Select option with highest confidence match

4. Output trace with context citations:
   ```
   Auto-decided: {option} -- {reason} [POLICY-06, {citations}, {confidence}]
   ```

5. Record decision in DECISIONS.md for session history

**If AUTONOMOUS=false:**
[Existing checkpoint:decision handling - unchanged]
</step>
```

### Pattern 3: Verification-Based Policy (POLICY-07)

For policies that depend on automated verification results.

```markdown
<step name="checkpoint_verify">
Check AUTONOMOUS flag from workflow start.

**If AUTONOMOUS=true:**

1. Run all automated verifications:
   - Tests: `npm test` (exit code)
   - Build: `npm run build` (exit code)
   - Lint: `npm run lint` (exit code, if exists)
   - Endpoints: `curl` checks (status codes)

2. Check all exit codes:
   - If ALL = 0: Verification passed
   - If ANY != 0: Verification failed

3. Apply POLICY-07:
   IF all pass:
   ```
   Auto-decided: approved -- All verification checks passed [POLICY-07, tests: {pass}/{total}, build: success]
   ```
   Continue to next task.

   IF any fail:
   Fall back to human even in autonomous mode.
   Present failure details and wait.

**If AUTONOMOUS=false:**
[Existing checkpoint:human-verify handling - unchanged]
</step>
```

### Pattern 4: Config-Gated Policy (POLICY-02)

For policies that check configuration flags first.

```markdown
<step name="config_gated_decision">
Check AUTONOMOUS flag from workflow start.

**If AUTONOMOUS=true:**

1. Read config flag:
   ```bash
   CONFIG_VALUE=$(cat .planning/config.json 2>/dev/null | grep -o '"[flag]"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "default")
   ```

2. Check secondary conditions if needed:
   ```bash
   [additional condition checks]
   ```

3. Apply POLICY-XX based on config + conditions:
   ```
   Auto-decided: [choice] -- [reason] [POLICY-XX, config: {flag}={value}]
   ```

**If AUTONOMOUS=false:**
[Existing interactive flow - unchanged]
</step>
```

---

## Anti-Patterns

Patterns to avoid when integrating policies into workflows.

### DON'T: Define Policies Inline in Workflows

**Wrong:**
```markdown
<step name="brownfield_check">
If code files exist AND no codebase map:
  Decide to map codebase because it helps planning.
</step>
```

**Right:**
```markdown
<step name="brownfield_check">
Apply POLICY-01 (Brownfield Detection).
See decision-policies.md for policy rule.
</step>
```

**Why:** Inline policies fragment the source of truth. Policy changes require updating multiple files.

### DON'T: Use Reasoning-Based Conditions

**Wrong:**
```markdown
If the project seems complex...
If the domain appears unfamiliar...
If research would probably help...
```

**Right:**
```markdown
If code files exist (find returns results)...
If config.research = true...
If checker output contains "VERIFICATION PASSED"...
```

**Why:** Reasoning-based conditions are non-deterministic. Different runs may produce different decisions.

### DON'T: Skip Trace Output

**Wrong:**
```markdown
**If AUTONOMOUS=true:**
  [Check conditions]
  [Make decision]
  [Continue without trace]
```

**Right:**
```markdown
**If AUTONOMOUS=true:**
  [Check conditions]
  [Make decision]
  Auto-decided: [choice] -- [reason] [POLICY-XX, {details}]
  [Continue]
```

**Why:** Without traces, decisions cannot be audited or debugged.

### DON'T: Apply Policy Without Checking Conditions

**Wrong:**
```markdown
**If AUTONOMOUS=true:**
  Auto-approve roadmap per POLICY-04.
```

**Right:**
```markdown
**If AUTONOMOUS=true:**
  Check: UNMAPPED=$(grep -c "Pending" .planning/REQUIREMENTS.md || echo "0")
  Check: V1_COUNT=$(grep -c "^\- \[ \] \*\*" .planning/REQUIREMENTS.md || echo "0")

  If UNMAPPED = 0 AND V1_COUNT matched:
    Auto-decided: approve roadmap -- 100% requirement coverage [POLICY-04, {count}/{count}]
```

**Why:** Policies exist because conditions determine choices. Skipping conditions defeats the purpose.

### DON'T: Modify Interactive Flow When Adding Autonomy

**Wrong:**
```markdown
**If AUTONOMOUS=true:**
  [New autonomous handling]

**If AUTONOMOUS=false:**
  [Modified interactive handling]  # Changed from original
```

**Right:**
```markdown
**If AUTONOMOUS=true:**
  [New autonomous handling]

**If AUTONOMOUS=false:**
  [Original interactive handling - unchanged]
```

**Why:** Interactive mode must work exactly as before. Autonomy is additive, not a replacement.

---

## Quick Reference Table

| Policy | Decision Point | Observable Condition | Choice |
|--------|----------------|---------------------|--------|
| POLICY-01 | new-project brownfield | code exists AND no map | trigger mapping |
| POLICY-02 | new-project research | config.research=true AND greenfield | enable research |
| POLICY-03 | new-project scoping | table stakes OR PROJECT.md mention | classify v1 |
| POLICY-04 | new-project roadmap | 100% coverage AND 0 pending | approve |
| POLICY-05 | plan-phase approval | checker VERIFICATION PASSED | approve |
| POLICY-06 | execute-plan decision | context matches option | select option |
| POLICY-07 | execute-plan verify | all checks pass | approve |

---

## See Also

- `autonomous.md` - Config flag reading, decision wrapper pattern
- `autonomous-defaults.md` - Fallback behaviors and safest option heuristics
- `context-assembly.md` - Context gathering for POLICY-06 decisions
- `checkpoints.md` - Checkpoint types and verification patterns
