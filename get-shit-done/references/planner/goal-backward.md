# Goal-Backward Methodology Reference

Reference for GSD planner goal-backward planning approach that derives must_haves from outcomes.

**Purpose:** Transforms phase goals into observable truths, required artifacts, and key links that plans must satisfy.

---

## Goal-Backward vs Forward Planning

**Forward planning asks:** "What should we build?"
**Goal-backward planning asks:** "What must be TRUE for the goal to be achieved?"

Forward planning produces tasks. Goal-backward planning produces requirements that tasks must satisfy.

---

## The 5-Step Process

### Step 1: State the Goal

Take the phase goal from ROADMAP.md. This is the outcome, not the work.

- Good: "Working chat interface" (outcome)
- Bad: "Build chat components" (task)

If the roadmap goal is task-shaped, reframe it as outcome-shaped.

### Step 2: Derive Observable Truths

Ask: "What must be TRUE for this goal to be achieved?"

List 3-7 truths from the USER's perspective. These are observable behaviors.

For "working chat interface":
- User can see existing messages
- User can type a new message
- User can send the message
- Sent message appears in the list
- Messages persist across page refresh

**Test:** Each truth should be verifiable by a human using the application.

### Step 3: Derive Required Artifacts

For each truth, ask: "What must EXIST for this to be true?"

"User can see existing messages" requires:
- Message list component (renders Message[])
- Messages state (loaded from somewhere)
- API route or data source (provides messages)
- Message type definition (shapes the data)

**Test:** Each artifact should be a specific file or database object.

### Step 4: Derive Required Wiring

For each artifact, ask: "What must be CONNECTED for this artifact to function?"

Message list component wiring:
- Imports Message type (not using `any`)
- Receives messages prop or fetches from API
- Maps over messages to render (not hardcoded)
- Handles empty state (not just crashes)

### Step 5: Identify Key Links

Ask: "Where is this most likely to break?"

Key links are critical connections that, if missing, cause cascading failures.

For chat interface:
- Input onSubmit -> API call (if broken: typing works but sending doesn't)
- API save -> database (if broken: appears to send but doesn't persist)
- Component -> real data (if broken: shows placeholder, not messages)

---

## Must-Haves Output Format

```yaml
must_haves:
  truths:
    - "User can see existing messages"
    - "User can send a message"
    - "Messages persist across refresh"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "Message list rendering"
      min_lines: 30
    - path: "src/app/api/chat/route.ts"
      provides: "Message CRUD operations"
      exports: ["GET", "POST"]
    - path: "prisma/schema.prisma"
      provides: "Message model"
      contains: "model Message"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/chat"
      via: "fetch in useEffect"
      pattern: "fetch.*api/chat"
    - from: "src/app/api/chat/route.ts"
      to: "prisma.message"
      via: "database query"
      pattern: "prisma\\.message\\.(find|create)"
```

---

## Common Failures

**Truths too vague:**
- Bad: "User can use chat"
- Good: "User can see messages", "User can send message", "Messages persist"

**Artifacts too abstract:**
- Bad: "Chat system", "Auth module"
- Good: "src/components/Chat.tsx", "src/app/api/auth/login/route.ts"

**Missing wiring:**
- Bad: Listing components without how they connect
- Good: "Chat.tsx fetches from /api/chat via useEffect on mount"
