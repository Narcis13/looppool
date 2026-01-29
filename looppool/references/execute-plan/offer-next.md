# Execute-Plan Offer Next Reference

This reference covers the completion routing logic for execute-plan workflow: how to determine what comes next after a plan completes, which route to take based on plan/phase/milestone status, and the completion message templates for each route.

## Overview

After a plan completes, the workflow must determine the correct next step. This involves counting plans and summaries, checking milestone status, and presenting the appropriate completion message with next action options.

**MANDATORY:** Verify remaining work before presenting next steps. Do NOT skip this verification. Do NOT assume phase or milestone completion without checking.

## Step 0: Check for USER-SETUP.md

If `USER_SETUP_CREATED=true` (from generate_user_setup step), always include this warning block at the TOP of completion output:

```
USER SETUP REQUIRED

This phase introduced external services requiring manual configuration:

.planning/phases/{phase-dir}/{phase}-USER-SETUP.md

Quick view:
- [ ] {ENV_VAR_1}
- [ ] {ENV_VAR_2}
- [ ] {Dashboard config task}

Complete this setup for the integration to function.
Run `cat .planning/phases/{phase-dir}/{phase}-USER-SETUP.md` for full details.

---
```

This warning appears BEFORE "Plan complete" messaging. User sees setup requirements prominently.

## Step 1: Count Plans and Summaries

List files in the phase directory:

```bash
ls -1 .planning/phases/[current-phase-dir]/*-PLAN.md 2>/dev/null | wc -l
ls -1 .planning/phases/[current-phase-dir]/*-SUMMARY.md 2>/dev/null | wc -l
```

State the counts: "This phase has [X] plans and [Y] summaries."

## Step 2: Route Based on Plan Completion

Compare the counts from Step 1:

| Condition | Meaning | Action |
|-----------|---------|--------|
| summaries < plans | More plans remain | Go to Route A |
| summaries = plans | Phase complete | Go to Step 3 |

---

## Route A: More Plans Remain in Phase

Identify the next unexecuted plan:
- Find the first PLAN.md file that has no matching SUMMARY.md
- Read its `<objective>` section

### Yolo Mode

```
Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

{Y} of {X} plans complete for Phase {Z}.

Auto-continuing: Execute next plan ({phase}-{next-plan})
```

Loop back to identify_plan step automatically.

### Interactive Mode

```
Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

{Y} of {X} plans complete for Phase {Z}.

---

## Next Up

**{phase}-{next-plan}: [Plan Name]** - [objective from next PLAN.md]

`/lpl:execute-phase {phase}`

`/clear` first - fresh context window

---

**Also available:**
- `/lpl:verify-work {phase}-{plan}` - manual acceptance testing before continuing
- Review what was built before continuing

---
```

Wait for user to clear and run next command.

**STOP here if Route A applies. Do not continue to Step 3.**

---

## Step 3: Check Milestone Status

Only reach this step when all plans in phase are complete (summaries = plans).

Read ROADMAP.md and extract:
1. Current phase number (from the plan just completed)
2. All phase numbers listed in the current milestone section

To find phases in the current milestone, look for:
- Phase headers: lines starting with `### Phase` or `#### Phase`
- Phase list items: lines like `- [ ] **Phase X:` or `- [x] **Phase X:`

Count total phases in the current milestone and identify the highest phase number.

State: "Current phase is {X}. Milestone has {N} phases (highest: {Y})."

## Step 4: Route Based on Milestone Status

| Condition | Meaning | Action |
|-----------|---------|--------|
| current phase < highest phase | More phases remain | Go to Route B |
| current phase = highest phase | Milestone complete | Go to Route C |

---

## Route B: Phase Complete, More Phases Remain

Read ROADMAP.md to get the next phase's name and goal.

```
Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

## Phase {Z}: {Phase Name} Complete

All {Y} plans finished.

---

## Next Up

**Phase {Z+1}: {Next Phase Name}** - {Goal from ROADMAP.md}

`/lpl:plan-phase {Z+1}`

`/clear` first - fresh context window

---

**Also available:**
- `/lpl:verify-work {Z}` - manual acceptance testing before continuing
- `/lpl:discuss-phase {Z+1}` - gather context first
- Review phase accomplishments before continuing

---
```

---

## Route C: Milestone Complete

When all phases in the milestone are done:

```
MILESTONE COMPLETE!

Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

## Phase {Z}: {Phase Name} Complete

All {Y} plans finished.

+-------------------------------------------------------+
|  All {N} phases complete! Milestone is 100% done.     |
+-------------------------------------------------------+

---

## Next Up

**Complete Milestone** - archive and prepare for next

`/lpl:complete-milestone`

`/clear` first - fresh context window

---

**Also available:**
- `/lpl:verify-work` - manual acceptance testing before completing milestone
- `/lpl:add-phase <description>` - add another phase before completing
- Review accomplishments before archiving

---
```

## Mode Handling Summary

| Mode | Route A Behavior | Route B/C Behavior |
|------|------------------|-------------------|
| yolo | Auto-continue to next plan | Present completion, wait |
| interactive | Present options, wait | Present options, wait |
| custom (gates.execute_next_plan: true) | Same as interactive | Same as interactive |

**Note:** Only Route A has automatic continuation in yolo mode. Routes B and C always present completion messages and wait for user action, regardless of mode.
