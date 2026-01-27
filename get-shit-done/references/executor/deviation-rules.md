# Executor Deviation Rules Reference

While executing plan tasks, you WILL discover work not explicitly in the plan. This is normal and expected. Apply these rules automatically to handle discovered work, then track all deviations for Summary documentation.

## Rule 1: Auto-fix Bugs

**Trigger:** Code doesn't work as intended (broken behavior, incorrect output, errors)

**Action:** Fix immediately, track for Summary

**Examples:**

- Wrong SQL query returning incorrect data
- Logic errors (inverted condition, off-by-one, infinite loop)
- Type errors, null pointer exceptions, undefined references
- Broken validation (accepts invalid input, rejects valid input)
- Security vulnerabilities (SQL injection, XSS, CSRF, insecure auth)
- Race conditions, deadlocks
- Memory leaks, resource leaks

**Process:**

1. Fix the bug inline
2. Add/update tests to prevent regression
3. Verify fix works
4. Continue task
5. Track in deviations list: `[Rule 1 - Bug] [description]`

**No user permission needed.** Bugs must be fixed for correct operation.

---

## Rule 2: Auto-add Missing Critical Functionality

**Trigger:** Code is missing essential features for correctness, security, or basic operation

**Action:** Add immediately, track for Summary

**Examples:**

- Missing error handling (no try/catch, unhandled promise rejections)
- No input validation (accepts malicious data, type coercion issues)
- Missing null/undefined checks (crashes on edge cases)
- No authentication on protected routes
- Missing authorization checks (users can access others' data)
- No CSRF protection, missing CORS configuration
- No rate limiting on public APIs
- Missing required database indexes (causes timeouts)
- No logging for errors (can't debug production)

**Process:**

1. Add the missing functionality inline
2. Add tests for the new functionality
3. Verify it works
4. Continue task
5. Track in deviations list: `[Rule 2 - Missing Critical] [description]`

**Critical = required for correct/secure/performant operation**
**No user permission needed.** These are not "features" - they're requirements for basic correctness.

---

## Rule 3: Auto-fix Blocking Issues

**Trigger:** Something prevents you from completing current task

**Action:** Fix immediately to unblock, track for Summary

**Examples:**

- Missing dependency (package not installed, import fails)
- Wrong types blocking compilation
- Broken import paths (file moved, wrong relative path)
- Missing environment variable (app won't start)
- Database connection config error
- Build configuration error (webpack, tsconfig, etc.)
- Missing file referenced in code
- Circular dependency blocking module resolution

**Process:**

1. Fix the blocking issue
2. Verify task can now proceed
3. Continue task
4. Track in deviations list: `[Rule 3 - Blocking] [description]`

**No user permission needed.** Can't complete task without fixing blocker.

---

## Rule 4: Ask About Architectural Changes

**Trigger:** Fix/addition requires significant structural modification

**Action:** STOP, present to user, wait for decision

**Examples:**

- Adding new database table (not just column)
- Major schema changes (changing primary key, splitting tables)
- Introducing new service layer or architectural pattern
- Switching libraries/frameworks (React to Vue, REST to GraphQL)
- Changing authentication approach (sessions to JWT)
- Adding new infrastructure (message queue, cache layer, CDN)
- Changing API contracts (breaking changes to endpoints)
- Adding new deployment environment

**Process:**

1. STOP current task
2. Return checkpoint with architectural decision needed
3. Include: what you found, proposed change, why needed, impact, alternatives
4. WAIT for orchestrator to get user decision
5. Fresh agent continues with decision

**User decision required.** These changes affect system design.

---

## Rule Priority

When multiple rules could apply:

1. **If Rule 4 applies** - STOP and return checkpoint (architectural decision)
2. **If Rules 1-3 apply** - Fix automatically, track for Summary
3. **If genuinely unsure which rule** - Apply Rule 4 (return checkpoint)

## Edge Case Guidance

| Situation | Rule | Reasoning |
|-----------|------|-----------|
| "This validation is missing" | Rule 2 | Critical for security |
| "This crashes on null" | Rule 1 | Bug |
| "Need to add table" | Rule 4 | Architectural |
| "Need to add column" | Rule 1 or 2 | Depends: fixing bug or adding critical field |

**Decision heuristic:** Ask yourself "Does this affect correctness, security, or ability to complete task?"

- **YES** - Rules 1-3 (fix automatically)
- **MAYBE** - Rule 4 (return checkpoint for user decision)
