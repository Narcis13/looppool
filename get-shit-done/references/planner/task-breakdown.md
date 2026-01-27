# Task Breakdown Reference

Reference for GSD planner task decomposition, sizing, and scope estimation.

**Purpose:** Defines how to break down phases into executable tasks with proper anatomy, sizing constraints, and TDD/user-setup detection.

---

## Task Anatomy

Every task has four required fields:

**<files>:** Exact file paths created or modified.
- Good: `src/app/api/auth/login/route.ts`, `prisma/schema.prisma`
- Bad: "the auth files", "relevant components"

**<action>:** Specific implementation instructions, including what to avoid and WHY.
- Good: "Create POST endpoint accepting {email, password}, validates using bcrypt against User table, returns JWT in httpOnly cookie with 15-min expiry. Use jose library (not jsonwebtoken - CommonJS issues with Edge runtime)."
- Bad: "Add authentication", "Make login work"

**<verify>:** How to prove the task is complete.
- Good: `npm test` passes, `curl -X POST /api/auth/login` returns 200 with Set-Cookie header
- Bad: "It works", "Looks good"

**<done>:** Acceptance criteria - measurable state of completion.
- Good: "Valid credentials return 200 + JWT cookie, invalid credentials return 401"
- Bad: "Authentication is complete"

## Task Types

| Type | Use For | Autonomy |
|------|---------|----------|
| `auto` | Everything Claude can do independently | Fully autonomous |
| `checkpoint:human-verify` | Visual/functional verification | Pauses for user |
| `checkpoint:decision` | Implementation choices | Pauses for user |
| `checkpoint:human-action` | Truly unavoidable manual steps (rare) | Pauses for user |

**Automation-first rule:** If Claude CAN do it via CLI/API, Claude MUST do it. Checkpoints are for verification AFTER automation, not for manual work.

## Task Sizing

Each task should take Claude **15-60 minutes** to execute. This calibrates granularity:

| Duration | Action |
|----------|--------|
| < 15 min | Too small - combine with related task |
| 15-60 min | Right size - single focused unit of work |
| > 60 min | Too large - split into smaller tasks |

**Signals a task is too large:**
- Touches more than 3-5 files
- Has multiple distinct "chunks" of work
- You'd naturally take a break partway through
- The <action> section is more than a paragraph

**Signals tasks should be combined:**
- One task just sets up for the next
- Separate tasks touch the same file
- Neither task is meaningful alone

## Specificity Examples

Tasks must be specific enough for clean execution. Compare:

| TOO VAGUE | JUST RIGHT |
|-----------|------------|
| "Add authentication" | "Add JWT auth with refresh rotation using jose library, store in httpOnly cookie, 15min access / 7day refresh" |
| "Create the API" | "Create POST /api/projects endpoint accepting {name, description}, validates name length 3-50 chars, returns 201 with project object" |
| "Style the dashboard" | "Add Tailwind classes to Dashboard.tsx: grid layout (3 cols on lg, 1 on mobile), card shadows, hover states on action buttons" |
| "Handle errors" | "Wrap API calls in try/catch, return {error: string} on 4xx/5xx, show toast via sonner on client" |
| "Set up the database" | "Add User and Project models to schema.prisma with UUID ids, email unique constraint, createdAt/updatedAt timestamps, run prisma db push" |

**The test:** Could a different Claude instance execute this task without asking clarifying questions? If not, add specificity.

## TDD Detection Heuristic

For each potential task, evaluate TDD fit:

**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
- Yes: Create a dedicated TDD plan for this feature
- No: Standard task in standard plan

**TDD candidates (create dedicated TDD plans):**
- Business logic with defined inputs/outputs
- API endpoints with request/response contracts
- Data transformations, parsing, formatting
- Validation rules and constraints
- Algorithms with testable behavior
- State machines and workflows

**Standard tasks (remain in standard plans):**
- UI layout, styling, visual components
- Configuration changes
- Glue code connecting existing components
- One-off scripts and migrations
- Simple CRUD with no business logic

**Why TDD gets its own plan:** TDD requires 2-3 execution cycles (RED -> GREEN -> REFACTOR), consuming 40-50% context for a single feature. Embedding in multi-task plans degrades quality.

## User Setup Detection

For tasks involving external services, identify human-required configuration:

External service indicators:
- New SDK: `stripe`, `@sendgrid/mail`, `twilio`, `openai`, `@supabase/supabase-js`
- Webhook handlers: Files in `**/webhooks/**`
- OAuth integration: Social login, third-party auth
- API keys: Code referencing `process.env.SERVICE_*` patterns

For each external service, determine:
1. **Env vars needed** - What secrets must be retrieved from dashboards?
2. **Account setup** - Does user need to create an account?
3. **Dashboard config** - What must be configured in external UI?

Record in `user_setup` frontmatter. Only include what Claude literally cannot do (account creation, secret retrieval, dashboard config).

**Important:** User setup info goes in frontmatter ONLY. Do NOT surface it in your planning output or show setup tables to users. The execute-plan workflow handles presenting this at the right time (after automation completes).

---

## Scope Estimation

### Context Budget Rules

**Plans should complete within ~50% of context usage.**

Why 50% not 80%?
- No context anxiety possible
- Quality maintained start to finish
- Room for unexpected complexity
- If you target 80%, you've already spent 40% in degradation mode

**Each plan: 2-3 tasks maximum. Stay under 50% context.**

| Task Complexity | Tasks/Plan | Context/Task | Total |
|-----------------|------------|--------------|-------|
| Simple (CRUD, config) | 3 | ~10-15% | ~30-45% |
| Complex (auth, payments) | 2 | ~20-30% | ~40-50% |
| Very complex (migrations, refactors) | 1-2 | ~30-40% | ~30-50% |

### Split Signals

**ALWAYS split if:**
- More than 3 tasks (even if tasks seem small)
- Multiple subsystems (DB + API + UI = separate plans)
- Any task with >5 file modifications
- Checkpoint + implementation work in same plan
- Discovery + implementation in same plan

**CONSIDER splitting:**
- Estimated >5 files modified total
- Complex domains (auth, payments, data modeling)
- Any uncertainty about approach
- Natural semantic boundaries (Setup -> Core -> Features)

### Depth Calibration

Depth controls compression tolerance, not artificial inflation.

| Depth | Typical Plans/Phase | Tasks/Plan |
|-------|---------------------|------------|
| Quick | 1-3 | 2-3 |
| Standard | 3-5 | 2-3 |
| Comprehensive | 5-10 | 2-3 |

**Key principle:** Derive plans from actual work. Depth determines how aggressively you combine things, not a target to hit.

- Comprehensive auth phase = 8 plans (because auth genuinely has 8 concerns)
- Comprehensive "add config file" phase = 1 plan (because that's all it is)

Don't pad small work to hit a number. Don't compress complex work to look efficient.

### Estimating Context Per Task

| Files Modified | Context Impact |
|----------------|----------------|
| 0-3 files | ~10-15% (small) |
| 4-6 files | ~20-30% (medium) |
| 7+ files | ~40%+ (large - split) |

| Complexity | Context/Task |
|------------|--------------|
| Simple CRUD | ~15% |
| Business logic | ~25% |
| Complex algorithms | ~40% |
| Domain modeling | ~35% |
