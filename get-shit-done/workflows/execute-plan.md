<purpose>
Execute a phase prompt (PLAN.md) and create the outcome summary (SUMMARY.md).
</purpose>

<required_reading>
Read STATE.md before any operation to load project context.
Read config.json for planning behavior settings.

@~/.claude/get-shit-done/references/git-integration.md
@~/.claude/get-shit-done/references/autonomous.md
@~/.claude/get-shit-done/references/autonomous-defaults.md
@~/.claude/get-shit-done/references/checkpoints.md
@~/.claude/get-shit-done/references/decision-policies.md
</required_reading>

<process>

<step name="resolve_model_profile" priority="first">
Read model profile for agent spawning:

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-executor | opus | sonnet | sonnet |

Store resolved model for use in Task calls below.
</step>

<step name="load_project_state">
Before any operation, read project state:

```bash
cat .planning/STATE.md 2>/dev/null
```

**If file exists:** Parse and internalize:

- Current position (phase, plan, status)
- Accumulated decisions (constraints on this execution)
- Blockers/concerns (things to watch for)
- Brief alignment status

**If file missing but .planning/ exists:**

```
STATE.md missing but planning artifacts exist.
Options:
1. Reconstruct from existing artifacts
2. Continue without project state (may lose accumulated context)
```

**For STATE.md schema and auto-recovery:**
@~/.claude/get-shit-done/references/state-schema.md

**If .planning/ doesn't exist:** Error - project not initialized.

This ensures every execution has full project context.

**Load planning config:**

```bash
# Check if planning docs should be committed (default: true)
COMMIT_PLANNING_DOCS=$(cat .planning/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
# Auto-detect gitignored (overrides config)
git check-ignore -q .planning 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

Store `COMMIT_PLANNING_DOCS` for use in git operations.

**For atomic config.json operations:**
See @~/.claude/get-shit-done/references/atomic-json.md
</step>

<step name="check_autonomous_mode">
Read autonomous mode setting:

```bash
AUTONOMOUS=$(cat .planning/config.json 2>/dev/null | grep -o '"autonomous"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "false")
```

When `AUTONOMOUS=true`: checkpoint:human-verify uses POLICY-07, checkpoint:decision uses POLICY-06, checkpoint:human-action always requires human.

**If AUTONOMOUS=true:** Initialize session decision tracking:
1. Create DECISIONS.md if not exists (header + format table per @~/.claude/get-shit-done/references/autonomous.md)
2. Start new session section with timestamp and decision table header
3. Load recent decisions: `tail -30 .planning/DECISIONS.md`
4. Initialize `DECISION_ID=0` counter for session

Reference: @~/.claude/get-shit-done/references/decision-policies.md
Reference: @~/.claude/get-shit-done/references/context-assembly.md
</step>

<step name="identify_plan">
Find the next plan to execute:
- Check roadmap for "In progress" phase
- Find plans in that phase directory
- Identify first plan without corresponding SUMMARY

```bash
cat .planning/ROADMAP.md
# Look for phase with "In progress" status
# Then find plans in that phase
ls .planning/phases/XX-name/*-PLAN.md 2>/dev/null | sort
ls .planning/phases/XX-name/*-SUMMARY.md 2>/dev/null | sort
```

**Logic:**

- If `01-01-PLAN.md` exists but `01-01-SUMMARY.md` doesn't → execute 01-01
- If `01-01-SUMMARY.md` exists but `01-02-SUMMARY.md` doesn't → execute 01-02
- Pattern: Find first PLAN file without matching SUMMARY file

**Decimal phase handling:**

Phase directories can be integer or decimal format:

- Integer: `.planning/phases/01-foundation/01-01-PLAN.md`
- Decimal: `.planning/phases/01.1-hotfix/01.1-01-PLAN.md`

Parse phase number from path (handles both formats):

```bash
# Extract phase number (handles XX or XX.Y format)
PHASE=$(echo "$PLAN_PATH" | grep -oE '[0-9]+(\.[0-9]+)?-[0-9]+')
```

SUMMARY naming follows same pattern:

- Integer: `01-01-SUMMARY.md`
- Decimal: `01.1-01-SUMMARY.md`

Confirm with user if ambiguous.

<config-check>
```bash
cat .planning/config.json 2>/dev/null
```
</config-check>

<if mode="yolo">
```
⚡ Auto-approved: Execute {phase}-{plan}-PLAN.md
[Plan X of Y for Phase Z]

Starting execution...
```

Proceed directly to parse_segments step.
</if>

<if mode="interactive" OR="custom with gates.execute_next_plan true">
Present:

```
Found plan to execute: {phase}-{plan}-PLAN.md
[Plan X of Y for Phase Z]

Proceed with execution?
```

Wait for confirmation before proceeding.
</if>
</step>

<step name="record_start_time">
Record execution start time for performance tracking:

```bash
PLAN_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_START_EPOCH=$(date +%s)
```

Store in shell variables for duration calculation at completion.
</step>

<step name="segment_routing">
**Segment routing: Parse plan, route segments to optimal execution context (subagent vs main).**

@~/.claude/get-shit-done/references/execute-plan/segment-routing.md
</step>

<step name="load_prompt">
Read the plan prompt:
```bash
cat .planning/phases/XX-name/{phase}-{plan}-PLAN.md
````

This IS the execution instructions. Follow it exactly.

**If plan references CONTEXT.md:**
The CONTEXT.md file provides the user's vision for this phase — how they imagine it working, what's essential, and what's out of scope. Honor this context throughout execution.
</step>

<step name="previous_phase_check">
Before executing, check if previous phase had issues:

```bash
# Find previous phase summary
ls .planning/phases/*/SUMMARY.md 2>/dev/null | sort -r | head -2 | tail -1
```

If previous phase SUMMARY.md has "Issues Encountered" != "None" or "Next Phase Readiness" mentions blockers:

Use AskUserQuestion:

- header: "Previous Issues"
- question: "Previous phase had unresolved items: [summary]. How to proceed?"
- options:
  - "Proceed anyway" - Issues won't block this phase
  - "Address first" - Let's resolve before continuing
  - "Review previous" - Show me the full summary
    </step>

<step name="execute">
Execute each task in the prompt. **Deviations are normal** - handle them automatically using embedded rules below.

1. Read the @context files listed in the prompt

2. For each task:

   **If `type="auto"`:**

   **Before executing:** Check if task has `tdd="true"` attribute:
   - If yes: Follow TDD execution flow (see `<tdd_execution>`) - RED → GREEN → REFACTOR cycle with atomic commits per stage
   - If no: Standard implementation

   - Work toward task completion
   - **If CLI/API returns authentication error:** Handle as authentication gate (see below)
   - **When you discover additional work not in plan:** Apply deviation rules (see below) automatically
   - **For substantial Rule 1-3 work:** Declare inline task using format from deviation-rules.md. Inline tasks are part of current task commit and documented in Summary.
   - Continue implementing, applying rules as needed
   - Run the verification
   - Confirm done criteria met
   - **Commit the task** (see `<task_commit>` below)
   - Track task completion and commit hash for Summary documentation
   - Continue to next task

   **If `type="checkpoint:*"`:**

   - STOP immediately (do not continue to next task)
   - Execute checkpoint_protocol (see below)
   - Wait for user response
   - Verify if possible (check files, env vars, etc.)
   - Only after user confirmation: continue to next task

3. Run overall verification checks from `<verification>` section
4. Confirm all success criteria from `<success_criteria>` section met
5. Document all deviations in Summary (automatic - see deviation_documentation below)
   </step>

<authentication_gates>
See @~/.claude/get-shit-done/references/executor/checkpoint-protocol.md for authentication gate handling.
</authentication_gates>

<deviation_rules>
@~/.claude/get-shit-done/references/executor/deviation-rules.md
</deviation_rules>

<deviation_documentation>
Document all deviations in Summary using format from @~/.claude/get-shit-done/references/executor/deviation-rules.md.
Track: rule applied, issue, fix, files modified, commit hash.

For inline tasks specifically:
- Track task name, deviation rule, reason
- Include in parent task commit (not separate)
- Document in SUMMARY.md Deviations > Inline Tasks section
</deviation_documentation>

<tdd_plan_execution>
## TDD Plan Execution

When executing a plan with `type: tdd` in frontmatter, follow the RED-GREEN-REFACTOR cycle for the single feature defined in the plan.

**1. Check test infrastructure (if first TDD plan):**
If no test framework configured:
- Detect project type from package.json/requirements.txt/etc.
- Install minimal test framework (Jest, pytest, Go testing, etc.)
- Create test config file
- Verify: run empty test suite
- This is part of the RED phase, not a separate task

**2. RED - Write failing test:**
- Read `<behavior>` element for test specification
- Create test file if doesn't exist (follow project conventions)
- Write test(s) that describe expected behavior
- Run tests - MUST fail (if passes, test is wrong or feature exists)
- Commit: `test({phase}-{plan}): add failing test for [feature]`

**3. GREEN - Implement to pass:**
- Read `<implementation>` element for guidance
- Write minimal code to make test pass
- Run tests - MUST pass
- Commit: `feat({phase}-{plan}): implement [feature]`

**4. REFACTOR (if needed):**
- Clean up code if obvious improvements
- Run tests - MUST still pass
- Commit only if changes made: `refactor({phase}-{plan}): clean up [feature]`

**Commit pattern for TDD plans:**
Each TDD plan produces 2-3 atomic commits:
1. `test({phase}-{plan}): add failing test for X`
2. `feat({phase}-{plan}): implement X`
3. `refactor({phase}-{plan}): clean up X` (optional)

**Error handling:**
- If test doesn't fail in RED phase: Test is wrong or feature already exists. Investigate before proceeding.
- If test doesn't pass in GREEN phase: Debug implementation, keep iterating until green.
- If tests fail in REFACTOR phase: Undo refactor, commit was premature.

**Verification:**
After TDD plan completion, ensure:
- All tests pass
- Test coverage for the new behavior exists
- No unrelated tests broken

**Why TDD uses dedicated plans:** TDD requires 2-3 execution cycles (RED → GREEN → REFACTOR), each with file reads, test runs, and potential debugging. This consumes 40-50% of context for a single feature. Dedicated plans ensure full quality throughout the cycle.

**Comparison:**
- Standard plans: Multiple tasks, 1 commit per task, 2-4 commits total
- TDD plans: Single feature, 2-3 commits for RED/GREEN/REFACTOR cycle

See `~/.claude/get-shit-done/references/tdd.md` for TDD plan structure.
</tdd_plan_execution>

<task_commit>
See @~/.claude/agents/gsd-executor.md <task_commit_protocol> section for commit protocol.
</task_commit>

<step name="record_phase_commit">
**Record phase commit after first task of each phase for rollback capability.**

**Trigger:** After first task commit in a phase (check if this is plan 01 AND task 1).

**Logic:**

```bash
# Check if this is the first plan of the phase (plan number is 01)
PLAN_NUM=$(echo "{plan}" | grep -oE '[0-9]+$')
TASK_NUM=1  # Set during task execution

if [ "$PLAN_NUM" = "01" ] && [ "$TASK_NUM" = "1" ]; then
  COMMIT_HASH=$(git rev-parse --short HEAD)
  PHASE_NUM=$(echo "{phase}" | grep -oE '^[0-9]+(\.[0-9]+)?')
  PHASE_DIR=$(basename "$(dirname "$PLAN_PATH")")
  TODAY=$(date +%Y-%m-%d)

  # Check if Phase Commits section exists in STATE.md
  if ! grep -q "## Phase Commits" .planning/STATE.md 2>/dev/null; then
    # Add section before end of file or after Session Continuity
    cat >> .planning/STATE.md << 'EOF'

## Phase Commits

| Phase | First Commit | Phase Directory | Recorded |
|-------|--------------|-----------------|----------|
EOF
  fi

  # Check if phase already recorded
  if ! grep -q "| ${PHASE_NUM} |" .planning/STATE.md 2>/dev/null; then
    # Append new row to Phase Commits table
    # Find the table and append after header separator
    sed -i '' "/## Phase Commits/,/^$/ {
      /|-------|/a\\
| ${PHASE_NUM} | ${COMMIT_HASH} | ${PHASE_DIR} | ${TODAY} |
    }" .planning/STATE.md
  fi
fi
```

**Recording happens once:** Check if phase already in table before adding. Prevents duplicate entries.

**Used by:** `/gsd:rollback-phase` command to identify commit range for reverting.
</step>

<step name="checkpoint_protocol">
When encountering `type="checkpoint:*"`:

**Critical: Claude automates everything with CLI/API before checkpoints.** Checkpoints are for verification and decisions, not manual work.

### Autonomous Checkpoint Handling

**If AUTONOMOUS=true:**

Reference: @~/.claude/get-shit-done/references/autonomous-defaults.md

**For checkpoint:human-verify:**

Apply POLICY-07 (Checkpoint Human-Verify Auto-Approval):

1. Run all automated verifications specified in the task (tests, builds, curl checks)
2. If ALL pass:
   ```
   Auto-decided: approved -- All verification checks passed [POLICY-07, tests: {pass}/{total}, build: success]
   ```

   **Persist decision to DECISIONS.md:**
   ```bash
   DECISION_ID=$((DECISION_ID + 1))
   DECISION_ID_PADDED=$(printf "D%03d" $DECISION_ID)
   echo "| ${DECISION_ID_PADDED} | $(date -u +%H:%M:%S) | verify: ${TASK_NAME} | approved | All checks passed | ${VERIFICATION_RESULTS} | HIGH |" >> .planning/DECISIONS.md
   ```

   Update session decision history table with approval.
   Continue to next task.
3. If ANY fail: Fall back to human verification (present checkpoint even in autonomous mode)
   ```
   Verification failed -- Falling back to human [POLICY-07, test failures: {count}]
   ```

**For checkpoint:decision:**

Apply POLICY-06 (Checkpoint Decision Selection):

**Step 1: Gather decision context** (per context-assembly.md):

```markdown
1. Read PROJECT.md: Core Value, Constraints, Key Decisions sections
   - Extract explicit preferences relevant to this decision
   - If explicit preference found: Citation format [PROJECT.md:Section Name]

2. Read REQUIREMENTS.md: Active requirements relevant to this decision
   - Check for requirement that constrains valid choices
   - If requirement found: Citation format [REQUIREMENTS.md:requirement-id]

3. Check session decision history for related prior decisions
   - Scan "Session Decisions" table for related choices
   - If related decision exists: Note for consistency [S###]

4. Read RESEARCH.md if exists in phase directory
   - Check for technical recommendations
   - If recommendation found: Citation format [RESEARCH.md:Section]

Stop when context is sufficient for this decision (~2000 token cap).
```

**Step 2: Check session history before deciding:**
```markdown
Scan session decisions for related choices.
If related decision found (e.g., S001 chose database type):
  - For consistency: Include "consistent with S###" in reason
  - For override: Include "(overrides S###: [justification])" in reason
```

**Step 3: Make decision based on gathered context:**
1. Read available options from task
2. Select option that best matches gathered context
3. Output trace with citations (include POLICY-06):
   - If explicit preference found in context:
     ```
     Auto-decided: {option} -- {reason} [POLICY-06, {context_refs}, HIGH]
     ```
   - If research recommendation found:
     ```
     Auto-decided: {option} -- {reason} [POLICY-06, {context_refs}, MEDIUM]
     ```
   Examples:
   ```
   Auto-decided: postgresql -- Relational data model required [POLICY-06, PROJECT.md:Constraints, REQUIREMENTS.md:DB-01, HIGH]
   Auto-decided: jwt -- Stateless API, consistent with S001 [POLICY-06, PROJECT.md:L48, S001, MEDIUM]
   ```
   Continue with selected option.
4. If no clear match (use safest option):
   ```
   Auto-decided: {option} -- No policy match, selected safest option [POLICY-06, Assumption: {assumption}, LOW]
   ```

**Step 4: Determine confidence level:**
- HIGH: Context explicitly addresses this decision (user preference or requirement)
- MEDIUM: Context provides related guidance (research recommendation)
- LOW: Using default due to insufficient context

**Step 5: Persist decision to DECISIONS.md:**

```bash
# Increment decision counter
DECISION_ID=$((DECISION_ID + 1))
DECISION_ID_PADDED=$(printf "D%03d" $DECISION_ID)

# Append decision row to DECISIONS.md
echo "| ${DECISION_ID_PADDED} | $(date -u +%H:%M:%S) | ${DECISION_POINT} | ${CHOICE} | ${REASON} | ${CONTEXT_REFS} | ${CONFIDENCE} |" >> .planning/DECISIONS.md
```

Update session decision history table (in context):
```markdown
Add row to "## Session Decisions" table:
| S[ID] | [decision] | [choice] | [reason] | [context] |
```

This enables later decisions to reference this decision via S### format.

**For checkpoint:human-action:**
1. Cannot be automated (requires human-only action)
   ```
   Autonomous mode: Human action required for [action], pausing for user
   ```
2. Present checkpoint and wait for user (same as interactive mode)

**If AUTONOMOUS=false:**

Display checkpoint using format from @~/.claude/get-shit-done/references/checkpoints.md.
WAIT for user response. Do NOT hallucinate completion. Do NOT continue to next task.
After user responds: verify if specified, then continue or wait for resolution.
</step>

<step name="checkpoint_return_for_orchestrator">
**When spawned by an orchestrator (execute-phase or execute-plan command):**

If spawned via Task tool and you hit a checkpoint, RETURN to orchestrator with structured checkpoint state. Use format from @~/.claude/get-shit-done/references/executor/checkpoint-protocol.md (Checkpoint Return Format section).

Required: Completed Tasks table, Current Task + blocker, Checkpoint Details, Awaiting.

**After return:** Orchestrator parses return, presents to user, spawns fresh continuation agent. You will NOT be resumed.

**If running in main context (not spawned):** Use standard checkpoint_protocol with direct user interaction.
</step>

<step name="verification_failure_gate">
If any task verification fails:

STOP. Do not continue to next task.

### Autonomous Verification Failure Handling

**If AUTONOMOUS=true and task verification fails:**

1. Analyze failure output to determine if recoverable
2. If recoverable (syntax error, missing import, typo):
   ```
   Auto-decided: retry — Verification failed due to [issue], attempting fix
   ```
   Apply fix and retry (max 2 retries).
3. If not recoverable after retries or issue is unclear:
   ```
   Autonomous mode: Verification failed for [task], falling back to human review
   ```
   Present failure details and wait for user input.

**If AUTONOMOUS=false:**

[Interactive verification failure handling below - unchanged from original]

Present inline:
"Verification failed for Task [X]: [task name]

Expected: [verification criteria]
Actual: [what happened]

How to proceed?

1. Retry - Try the task again
2. Skip - Mark as incomplete, continue
3. Stop - Pause execution, investigate"

Wait for user decision.

If user chose "Skip", note it in SUMMARY.md under "Issues Encountered".
</step>

<step name="record_completion_time">
Record execution end time and calculate duration:

```bash
PLAN_END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_END_EPOCH=$(date +%s)

DURATION_SEC=$(( PLAN_END_EPOCH - PLAN_START_EPOCH ))
DURATION_MIN=$(( DURATION_SEC / 60 ))

if [[ $DURATION_MIN -ge 60 ]]; then
  HRS=$(( DURATION_MIN / 60 ))
  MIN=$(( DURATION_MIN % 60 ))
  DURATION="${HRS}h ${MIN}m"
else
  DURATION="${DURATION_MIN} min"
fi
```

Pass timing data to SUMMARY.md creation.
</step>

<step name="generate_user_setup">
**Generate USER-SETUP.md if plan has user_setup in frontmatter.**

```bash
grep -A 50 "^user_setup:" .planning/phases/XX-name/{phase}-{plan}-PLAN.md | head -50
```

**If user_setup exists:** Create `.planning/phases/XX-name/{phase}-USER-SETUP.md` using template from `~/.claude/get-shit-done/templates/user-setup.md`.

Parse each service in `user_setup` array. Generate: Environment Variables table, Account Setup checklist, Dashboard Configuration steps, Local Development notes, Verification section. Set status to "Incomplete".

**If user_setup is empty or missing:** Skip this step.

**Track for offer_next:** Set `USER_SETUP_CREATED=true` if file was generated.
</step>

<step name="create_summary">
Create `{phase}-{plan}-SUMMARY.md` as specified in the prompt's `<output>` section.
Use ~/.claude/get-shit-done/templates/summary.md for structure.

**File location:** `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md`

**Frontmatter population:**

Before writing summary content, populate frontmatter fields from execution context:

1. **Basic identification:**
   - phase: From PLAN.md frontmatter
   - plan: From PLAN.md frontmatter
   - subsystem: Categorize based on phase focus (auth, payments, ui, api, database, infra, testing, etc.)
   - tags: Extract tech keywords (libraries, frameworks, tools used)

2. **Dependency graph:**
   - requires: List prior phases this built upon (check PLAN.md context section for referenced prior summaries)
   - provides: Extract from accomplishments - what was delivered
   - affects: Infer from phase description/goal what future phases might need this

3. **Tech tracking:**
   - tech-stack.added: New libraries from package.json changes or requirements
   - tech-stack.patterns: Architectural patterns established (from decisions/accomplishments)

4. **File tracking:**
   - key-files.created: From "Files Created/Modified" section
   - key-files.modified: From "Files Created/Modified" section

5. **Decisions:**
   - key-decisions: Extract from "Decisions Made" section

6. **Metrics:**
   - duration: From $DURATION variable
   - completed: From $PLAN_END_TIME (date only, format YYYY-MM-DD)

Note: If subsystem/affects are unclear, use best judgment based on phase name and accomplishments. Can be refined later.

**Title format:** `# Phase [X] Plan [Y]: [Name] Summary`

The one-liner must be SUBSTANTIVE:

- Good: "JWT auth with refresh rotation using jose library"
- Bad: "Authentication implemented"

**Include performance data:**

- Duration: `$DURATION`
- Started: `$PLAN_START_TIME`
- Completed: `$PLAN_END_TIME`
- Tasks completed: (count from execution)
- Files modified: (count from execution)

**Next Step section:**

- If more plans exist in this phase: "Ready for {phase}-{next-plan}-PLAN.md"
- If this is the last plan: "Phase complete, ready for transition"
  </step>

<step name="update_current_position">
Update Current Position section in STATE.md:

```markdown
Phase: [current] of [total] ([phase name])
Plan: [just completed] of [total in phase]
Status: [In progress / Phase complete]
Last activity: [today] - Completed {phase}-{plan}-PLAN.md
Progress: [progress bar]
```

**Progress bar:** Count total plans (from ROADMAP.md), count completed (SUMMARY.md files exist). Progress = completed/total. Render: ░ for incomplete, █ for complete.

Verify: Phase X of total, Plan N of phase-total, correct Status, today's date, calculated progress bar.
</step>

<step name="extract_decisions_and_issues">
Extract decisions, issues, and concerns from SUMMARY.md into STATE.md accumulated context.

**Decisions Made:**

- Read SUMMARY.md "## Decisions Made" section
- If content exists (not "None"):
  - Add each decision to STATE.md Decisions table
  - Format: `| [phase number] | [decision summary] | [rationale] |`

**Blockers/Concerns:**

- Read SUMMARY.md "## Next Phase Readiness" section
- If contains blockers or concerns:
  - Add to STATE.md "Blockers/Concerns Carried Forward"
    </step>

<step name="update_session_continuity">
Update Session Continuity section in STATE.md to enable resumption in future sessions.

**Format:**

```markdown
Last session: [current date and time]
Stopped at: Completed {phase}-{plan}-PLAN.md
Resume file: [path to .continue-here if exists, else "None"]
```

**Size constraint note:** Keep STATE.md under 150 lines total.
</step>

<step name="issues_review_gate">
Before proceeding, check SUMMARY.md content.

If "Issues Encountered" is NOT "None":

<if mode="yolo">
```
⚡ Auto-approved: Issues acknowledgment
⚠️ Note: Issues were encountered during execution:
- [Issue 1]
- [Issue 2]
(Logged - continuing in yolo mode)
```

Continue without waiting.
</if>

<if mode="interactive" OR="custom with gates.issues_review true">
Present issues and wait for acknowledgment before proceeding.
</if>
</step>

<step name="update_roadmap">
Update the roadmap file:

```bash
ROADMAP_FILE=".planning/ROADMAP.md"
```

**If more plans remain in this phase:**

- Update plan count: "2/3 plans complete"
- Keep phase status as "In progress"

**If this was the last plan in the phase:**

- Mark phase complete: status → "Complete"
- Add completion date
</step>

<step name="git_commit_metadata">
Commit execution metadata (SUMMARY + STATE + ROADMAP).

All task code already committed during execution. This final commit captures execution results only.

**If `COMMIT_PLANNING_DOCS=false`:** Skip git operations, log "Skipping planning docs commit", proceed.

**If `COMMIT_PLANNING_DOCS=true` (default):**

```bash
git add .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md
git add .planning/STATE.md
git add .planning/ROADMAP.md
git status  # Verify only execution artifacts staged
git commit -m "$(cat <<'EOF'
docs({phase}-{plan}): complete [plan-name] plan

Tasks completed: [N]/[N]
- [Task 1 name]
- [Task 2 name]

SUMMARY: .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md
EOF
)"
```

See @~/.claude/get-shit-done/references/git-integration.md for commit conventions.
</step>

<step name="update_codebase_map">
**If .planning/codebase/ exists:**

Check what changed across all task commits in this plan:

```bash
# Find first task commit (right after previous plan's docs commit)
FIRST_TASK=$(git log --oneline --grep="feat({phase}-{plan}):" --grep="fix({phase}-{plan}):" --grep="test({phase}-{plan}):" --reverse | head -1 | cut -d' ' -f1)

# Get all changes from first task through now
git diff --name-only ${FIRST_TASK}^..HEAD 2>/dev/null
```

**Update only if structural changes occurred:**

| Change Detected | Update Action |
|-----------------|---------------|
| New directory in src/ | STRUCTURE.md: Add to directory layout |
| package.json deps changed | STACK.md: Add/remove from dependencies list |
| New file pattern (e.g., first .test.ts) | CONVENTIONS.md: Note new pattern |
| New external API client | INTEGRATIONS.md: Add service entry with file path |
| Config file added/changed | STACK.md: Update configuration section |
| File renamed/moved | Update paths in relevant docs |

**Skip update if only:**
- Code changes within existing files
- Bug fixes
- Content changes (no structural impact)

**Update format:**
Make single targeted edits - add a bullet point, update a path, or remove a stale entry. Don't rewrite sections.

```bash
git add .planning/codebase/*.md
git commit --amend --no-edit  # Include in metadata commit
```

**If .planning/codebase/ doesn't exist:**
Skip this step.
</step>

<step name="offer_next">
**Completion routing: Determine next step based on plan/phase/milestone status.**

@~/.claude/get-shit-done/references/execute-plan/offer-next.md
</step>

</process>

<success_criteria>

- All tasks from PLAN.md completed
- All verifications pass
- USER-SETUP.md generated if user_setup in frontmatter
- SUMMARY.md created with substantive content
- STATE.md updated (position, decisions, issues, session)
- ROADMAP.md updated
- If codebase map exists: map updated with execution changes (or skipped if no significant changes)
- If USER-SETUP.md created: prominently surfaced in completion output
  </success_criteria>
