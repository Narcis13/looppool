# Codebase Concerns

**Analysis Date:** 2026-01-26

## Tech Debt

**Large, monolithic agent files:**
- Issue: `agents/gsd-planner.md` (1386 lines), `agents/gsd-debugger.md` (1203 lines), `agents/gsd-executor.md` (784 lines), and `get-shit-done/workflows/execute-plan.md` (1844 lines) are difficult to maintain and reason about. Changes risk cascading failures across the orchestration system.
- Files: `agents/gsd-planner.md`, `agents/gsd-debugger.md`, `agents/gsd-executor.md`, `get-shit-done/workflows/execute-plan.md`, `get-shit-done/workflows/verify-phase.md` (628 lines)
- Impact: Navigation and modification become error-prone. Debugging issues requires reading thousands of lines. New agents copying patterns perpetuate complexity.
- Fix approach: Extract pure helper functions/templates to separate reference files. Create `references/agent-patterns.md` documenting common flows (task execution, deviation handling, checkpoint logic). Split execute-plan workflow into `execute-segment.md` (segmented execution) and `execute-atomic.md` (fully autonomous).

**Install script fragility:**
- Issue: `bin/install.js` (1292 lines) handles file operations, path expansion, runtime selection, and configuration management in one script. Multiple regex replacements, recursive directory operations, and JSON manipulation create maintenance burden and error surface.
- Files: `bin/install.js`
- Impact: Windows path handling issues (#207 mentioned in CONTRIBUTING.md), cross-platform tilde expansion inconsistency, orphaned file cleanup dependencies (lines 476-534), settings.json corruption risk if JSON parse/stringify fails mid-operation.
- Fix approach: Extract path utilities to `bin/path-utils.js`, config management to `bin/config-manager.js`, and file operations to `bin/file-ops.js`. Add atomic write (write-temp, verify, move) for JSON files. Test Windows UNC paths in CI.

**State file dependencies:**
- Issue: Multiple workflows depend on reading/parsing `STATE.md`, `ROADMAP.md`, `CONTEXT.md`, and `config.json` without normalization. If a state file is missing or malformed, execution aborts with unclear error messages.
- Files: `get-shit-done/workflows/execute-plan.md` (lines 32-69), `get-shit-done/workflows/execute-phase.md` (lines 32-69), `agents/gsd-executor.md` (lines 18-52)
- Impact: Partial project initialization (user creates `.planning/` but misses a required file) causes cryptic failures. No recovery path. User must manually debug state directory.
- Fix approach: Create `get-shit-done/references/state-schema.md` defining all required state files and their structure. Create `bin/validate-state.js` that CI and orchestrators run before operations. Provide auto-recovery: if STATE.md missing but ROADMAP.md exists, reconstruct STATE.md from roadmap.

## Known Bugs

**Path expansion inconsistency (Windows):**
- Symptoms: `~/.claude/` paths fail on Windows with UNC paths (e.g., `\\server\share\users\name`), install script hangs or throws "path not found"
- Files: `bin/install.js` (lines 47-89 `getOpencodeGlobalDir`, `getGlobalDir`)
- Trigger: Run installer on Windows with OPENCODE_CONFIG_DIR or CLAUDE_CONFIG_DIR pointing to UNC path
- Workaround: Use absolute paths, not tilde expansion, on Windows. Set env vars to `C:\path\to\config` not `~/.config`
- Fix: Test `path.resolve(expandTilde(...))` on Windows before accepting. Add CI test for UNC paths.

**Orphaned hook cleanup race condition:**
- Symptoms: Upgraded to v1.9.x, then hooks still fire from old `hooks/statusline.js` (renamed to `gsd-statusline.js`). Multiple hook invocations in one session.
- Files: `bin/install.js` (lines 476-489 `cleanupOrphanedFiles`, lines 494-534 `cleanupOrphanedHooks`)
- Trigger: Fast installation (before file ops complete) or partial uninstall
- Workaround: Manual deletion: `rm -rf ~/.claude/hooks/statusline.js` then reinstall
- Fix: Use atomic renames instead of delete-then-create. Verify cleanup before reporting success.

**Settings.json JSON parse silently fails:**
- Symptoms: settings.json is corrupted (invalid JSON), install proceeds without modifying settings because try/catch swallows error (line 718), user loses hook registrations
- Files: `bin/install.js` (lines 717-719, lines 636-679 reading/writing settings)
- Trigger: Manual edit of settings.json (user adds trailing comma), then reinstall
- Workaround: Validate JSON before edit: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json'))"`
- Fix: Throw error on parse failure, not silent swallow. Provide JSON validation helper. Create backup before modifying.

**Interrupted agent tracking not cleaned up:**
- Symptoms: `.planning/current-agent-id.txt` persists after crash, prevents fresh agents from spawning (execute-plan checks for stale agent ID). User must manually `rm .planning/current-agent-id.txt`
- Files: `get-shit-done/workflows/execute-plan.md` (lines 317-327 clearing stale agent IDs), `agents/gsd-executor.md` (no explicit cleanup on failure)
- Trigger: Claude session crashes during task execution, interrupts before completing segment
- Workaround: `rm .planning/current-agent-id.txt` then retry
- Fix: Executor should create a lock file with PID, periodically check PID is alive, auto-remove stale locks. Workflow should validate agent-history.json entries reference real agent IDs.

## Security Considerations

**Unsafe recursive file deletion:**
- Risk: `bin/install.js` line 445 `fs.rmSync(destDir, { recursive: true })` deletes entire directories without whitelist. If pathPrefix calculation is wrong, could delete unintended files.
- Files: `bin/install.js` (lines 444-446)
- Current mitigation: Paths are hardcoded to known GSD directories (`.claude/get-shit-done`, `.opencode/get-shit-done`), not user-specified
- Recommendations: Add explicit path validation (must be within `.claude/` or `.opencode/`). Create backup of destDir before deletion. Log exact paths being deleted.

**Unvalidated environment variable expansion:**
- Risk: OPENCODE_CONFIG_DIR, CLAUDE_CONFIG_DIR, XDG_CONFIG_HOME read from env without validation. Path traversal via `../../sensitive` could read/write outside intended directory.
- Files: `bin/install.js` (lines 49-64 `getOpencodeGlobalDir`, lines 82-88 `getGlobalDir`)
- Current mitigation: os.homedir() resolves to user's home, paths are concatenated only with constants
- Recommendations: Validate expanded path is within home directory. Use `path.resolve()` then check resolved path starts with home. Reject paths containing `..`.

**JSON deserialization without schema validation:**
- Risk: `config.json`, `settings.json`, `opencode.json` are parsed and modified without schema validation. Malicious or corrupted JSON could inject unexpected fields.
- Files: `bin/install.js` (multiple JSON operations), any workflow reading config files
- Current mitigation: Only setting specific keys, not spreading entire objects
- Recommendations: Create schema files defining allowed keys and types. Validate before use: `if (!config.hasOwnProperty('version')) throw Error('invalid config')`. Use JSON Schema validator.

## Performance Bottlenecks

**Context window saturation in execute-plan:**
- Problem: `execute-plan.md` (1844 lines) loaded into orchestrator context before spawning executors. On large codebases with many files, loading PLAN.md + task descriptions + deviation rules can push orchestrator toward 50%+ context usage, degrading quality.
- Files: `get-shit-done/workflows/execute-plan.md` (entire file is loaded by orchestrator)
- Cause: No pagination or lazy loading of plan segments. All context loaded upfront.
- Improvement path: Create `get-shit-done/workflows/execute-plan-minimal.md` (orchestrator-focused) that references `get-shit-done/templates/phase-prompt.md` (full plan context). Orchestrator loads minimal, spawns executor with full plan. Reduces orchestrator burden.

**Agent-history.json not pruned:**
- Problem: `agent-history.json` grows unbounded (max 50 entries configured, but no enforcement). On long projects with 100+ phases, reading this file on every execute-plan slows startup.
- Files: `get-shit-done/workflows/execute-plan.md` (lines 337-342 mention pruning but don't show implementation), `.planning/agent-history.json`
- Cause: Max entries is documented but pruning logic not shown in workflow. Likely not implemented.
- Improvement path: Implement aggressive pruning: delete entries >30 days old, keep only last 20 spawned agents, compress old entries to single-line summary. Add `npm run prune:planning` script.

**Verifier scans all files for TODO comments:**
- Problem: `agents/gsd-verifier.md` (line 409) and `get-shit-done/workflows/verify-phase.md` (line 418) use `grep -rn "TODO|FIXME"` across entire `src/` directory without file-type filtering. On large codebases (>10k files), this is O(n) slowdown.
- Files: `agents/gsd-verifier.md` (line 409-410), `get-shit-done/workflows/verify-phase.md` (line 418)
- Cause: No `--include` glob pattern, scans all files including node_modules if not gitignored
- Improvement path: Add `--include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"` to grep. Cache results in `.planning/.verify-cache` with file modification timestamps, skip unchanged files.

## Fragile Areas

**Checkpoint routing logic (execute-plan.md):**
- Files: `get-shit-done/workflows/execute-plan.md` (lines 350-440 segment_execution)
- Why fragile: Determines whether segments route to subagent or main context based on checkpoint types. Three decision paths (human-verify → subagent, decision → main, human-action → main). If a checkpoint type is misspelled or new type added without updating routing, segment executes in wrong context.
- Safe modification: Create `get-shit-done/references/checkpoint-routing-table.md` documenting all checkpoint types and their routing. Add validation in planner to ensure checkpoint types match table. Test each routing path independently (add integration tests for 3-path checkpoint scenarios).
- Test coverage: No explicit test for checkpoint routing. Critical path.

**Deviation rule application (gsd-executor.md):**
- Files: `agents/gsd-executor.md` (lines 143-340 deviation_rules)
- Why fragile: Rules 1-5 define when executor auto-fixes vs. defers to user. Boundary between "auto-fix bug" and "ask user" is subjective. Rules reference examples but lack clear decision tree. If executor interprets Rule 2 (auto-add functionality) too broadly, adds features not in scope. Too narrow, skips critical security fixes.
- Safe modification: Convert Rules to explicit decision tree with measurable criteria: "Missing error handler MUST be added if catches >10 user-facing endpoints. MAY be added if <3 endpoints." Add examples at each decision point. Create test cases for boundary conditions (Rule 2: "Add validation for 3 form fields" → should add? Why/why not?).
- Test coverage: Rules documented with examples but no automated verification of executor behavior against rules.

**State file format drift:**
- Files: `get-shit-done/templates/state.md` (template), `agents/gsd-executor.md` (lines 18-52 reading STATE.md), various workflows parsing STATE.md
- Why fragile: STATE.md is template-based but actual fields parsed by regex (`grep -o '"phase"'` in execute-plan.md). If template adds new fields or changes format, existing parsing breaks silently.
- Safe modification: Define STATE.md schema in YAML or JSON (not Markdown). Create validation schema. Workflows parse schema, not string. Provide migration path: `bin/migrate-state.js` converts old format to new.
- Test coverage: No tests validating STATE.md format compatibility across tools that read it.

**Missing dependency tracking in workflows:**
- Files: All workflow files reference @-paths to context files, but if those files don't exist, behavior is undefined. No validation.
- Why fragile: `execute-plan.md` says "Read STATE.md before any operation" but doesn't validate it exists before spawning executor. Executor may inherit missing context file as prerequisite, fail mid-execution.
- Safe modification: Add `verify_dependencies()` step at start of each workflow. Check required files exist, are non-empty, parse successfully (JSON/YAML files). Fail fast with clear message.
- Test coverage: None.

## Scaling Limits

**Agent-history.json unbounded growth:**
- Current capacity: 50 entries nominal, but no enforcement. Large projects could accumulate 100+ entries.
- Limit: File size becomes noticeable (>100KB) when read on every phase execution. Context bloat.
- Scaling path: Implement pruning (see Performance section). Archive old entries to `.planning/.agent-history-archive/` by month. Only load last 20 entries into agent-history.json.

**Planning .planning/ directory structure:**
- Current capacity: Handles 10-20 phases comfortably. Each phase creates `01-name/` with multiple PLAN.md and SUMMARY.md files.
- Limit: Filesystem performance degrades with >1000 files in single directory. `ls .planning/phases/` becomes slow.
- Scaling path: Create `01-name/plans/` subdirectory, move all plans there. `01-name/summaries/` for summaries. Use nested structure for phases >10 phases.

**Verifier output size:**
- Current capacity: Verification reports for 5-10 requirements fit in single document.
- Limit: 50+ requirements → verification report >500KB, hard to navigate. Links to files become unwieldy.
- Scaling path: Split VERIFICATION.md into VERIFICATION-{phase}.md. Create VERIFICATION-INDEX.md with summary table. Generate HTML report with search.

## Missing Critical Features

**Rollback mechanism:**
- Problem: If a phase completes but verification fails, no way to revert commits. User must `git revert` manually or lose work.
- Blocks: Recovering from "executor made a wrong decision" without losing subsequent work
- Potential solution: Record first commit of phase in STATE.md. Provide `/gsd:rollback-phase` command that `git revert` all commits between phase start and end, then deletes phase directory. Confirmation prompt before rollback.

**Plan revision without re-planning:**
- Problem: If plan fails during execution (e.g., task 2 uncovers missing architecture), no way to modify remaining tasks without full replan. Executor must stop at checkpoint, user manually edits PLAN.md (fragile), rerun.
- Blocks: Incremental fixes during execution
- Potential solution: Allow executor to create inline tasks (`<task type="inline">`) for discovered work, treated as deviations. Document inline task behavior in deviation_rules.

**Cross-phase dependency tracking:**
- Problem: Phase 2 depends on deliverable from Phase 1, but if Phase 1 changes, Phase 2 may become invalid. No way to cascade invalidation.
- Blocks: Safe refactoring of completed phases
- Potential solution: Add `depends_on` field to ROADMAP phase entries. Verifier checks all dependents if phase changes. Warn user: "Phase 2 references User.ts from Phase 1 - verify changes are compatible."

**Automated environment setup validation:**
- Problem: User setup info (env vars, API keys, account creation) documented in PLAN.md frontmatter but not validated before execution. Executor may fail 30 minutes in due to missing API key.
- Blocks: Reliable automation of external service integrations
- Potential solution: Create `bin/validate-setup.js` that reads frontmatter, checks env vars exist and are non-empty, tests API connectivity if applicable. Run before execute-phase. Provide setup checklist for user.

## Test Coverage Gaps

**No integration tests for checkpoint routing:**
- What's not tested: Three checkpoint routing paths (human-verify → subagent, decision → main, human-action → main). No verification that segments execute in correct context.
- Files: `get-shit-done/workflows/execute-plan.md` (segment_execution step)
- Risk: Checkpoint type misspelling causes silent routing failure (executes in wrong context). User loses work.
- Priority: High (critical path for phase execution)

**No validation of STATE.md format consistency:**
- What's not tested: STATE.md format changes don't break parsing. Multiple tools read STATE.md (executor, orchestrator, workflows) - no test ensures they parse same format.
- Files: `get-shit-done/templates/state.md`, all tools reading STATE.md
- Risk: Silent parsing failures. Executor sees stale phase number, overwrites wrong files.
- Priority: High (state corruption)

**No tests for install.js on Windows with UNC paths:**
- What's not tested: Path handling with UNC paths (`\\server\share`), cross-platform tilde expansion, settings.json corruption recovery
- Files: `bin/install.js`
- Risk: Installer hangs or fails on Windows. Users cannot install on network drives (common in enterprise).
- Priority: Medium (affects Windows users, blocks enterprise adoption)

**No tests for orphaned file cleanup atomicity:**
- What's not tested: If installation is interrupted (network failure, disk full, user kills process), cleanup leaves inconsistent state. No test verifies all or nothing semantics.
- Files: `bin/install.js` (file operations)
- Risk: Partial installation → corrupted settings → next install fails to clean up
- Priority: Medium (affects reliability on unreliable networks)

**No tests for agent-history.json pruning logic:**
- What's not tested: Pruning correctly removes old entries, keeps spawned agents, respects max_entries limit
- Files: `get-shit-done/workflows/execute-plan.md` (pruning mentioned but not shown)
- Risk: File grows unbounded, slows orchestrator. Or pruning deletes needed entries, breaks resume capability.
- Priority: Medium (affects performance at scale)

**No end-to-end tests for multi-wave execution:**
- What's not tested: Plans with Wave 2 depending on Wave 1 results, wave ordering is correct, if Wave 1 fails, Wave 2 doesn't execute
- Files: `get-shit-done/workflows/execute-plan.md` (wave handling), `agents/gsd-executor.md` (wave execution)
- Risk: Waves execute out of order, task dependencies break silently
- Priority: Medium (affects complex phases)

---

*Concerns audit: 2026-01-26*
