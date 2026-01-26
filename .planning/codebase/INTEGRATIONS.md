# External Integrations

**Analysis Date:** 2026-01-26

## APIs & External Services

**npm Registry:**
- Service: npm version lookups
- What it's used for: Version checking and update notifications
- Implementation: `hooks/gsd-check-update.js` calls `npm view get-shit-done-cc version` via `child_process.execSync()`
- Timeout: 10 seconds
- Error handling: Graceful fallback - if npm call fails, latest version shows as "unknown"

**Claude Code API:**
- Integrated via stdin/stdout communication
- Statusline hook (`hooks/gsd-statusline.js`) receives JSON context data via stdin containing:
  - `model.display_name` - Model identifier
  - `context_window.remaining_percentage` - Token usage percentage
  - `session_id` - Current session identifier
  - `workspace.current_dir` - Current working directory

**Discord Community:**
- Community server: https://discord.gg/5JJgD5svVS
- Referenced in installation completion message and README

## Data Storage

**Databases:**
- None - No persistent database

**Local File Storage:**
- Installation directories:
  - Global: `~/.claude/` (Claude Code) or `~/.config/opencode/` (OpenCode)
  - Local: `./.claude/` or `./.opencode/` (project-specific)
- Cache location: `~/.claude/cache/gsd-update-check.json`
  - Contains: version check results (installed version, latest version, update_available flag, timestamp)
  - Updated by: `hooks/gsd-check-update.js` background process
  - Read by: `hooks/gsd-statusline.js` to show update available notification
- Todo tracking: `~/.claude/todos/` (read by statusline hook to display current task)

**File Formats:**
- JSON for configuration (`settings.json`, cache files)
- Markdown with YAML frontmatter for commands, agents, and workflows
- Plain text for version files

## Authentication & Identity

**Auth Provider:**
- None - GSD is a local system, no remote authentication required

**Installation Models:**
- Two deployment targets supported:
  - Claude Code (runtime)
  - OpenCode (runtime) - open source alternative

**Configuration:**
- Settings managed via `settings.json` in target runtime directory
- Hooks registered in settings.json `hooks.SessionStart` array
- Statusline command configured in settings.json `statusLine` field
- Permissions configuration: `opencode.json` for OpenCode runtime (read and external_directory permissions)

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service

**Logs:**
- Console output during installation
- Colored terminal output (using ANSI escape codes)
- Hook execution: `stdio: 'ignore'` (silent operation)
- No persistent logging

**Version Tracking:**
- VERSION file stored in installation directory (written during install)
- Used by `gsd-check-update.js` to compare against npm latest version
- Checked at SessionStart hook

## CI/CD & Deployment

**Hosting:**
- Published to npm registry at `https://www.npmjs.com/package/get-shit-done-cc`
- GitHub repository: `https://github.com/glittercowboy/get-shit-done`

**Release Process:**
- Manual npm publishing via `npm publish`
- Releases tagged in Git with version format `v1.X.Y`
- Changelog maintained in `CHANGELOG.md` (Keep a Changelog format)

**Installation Methods:**
- Interactive: `npx get-shit-done-cc` (prompts for runtime and location)
- Non-interactive flags:
  - `--claude` - Install for Claude Code only
  - `--opencode` - Install for OpenCode only
  - `--both` - Install for both runtimes
  - `--global` / `-g` - Install globally
  - `--local` / `-l` - Install locally
  - `--config-dir <path>` - Custom config directory
  - `--uninstall` - Remove GSD installation
  - `--force-statusline` - Replace existing statusline config

## Environment Configuration

**Required Environment Variables:**
- None required - all functionality is optional
- Optional env vars for configuration:
  - `CLAUDE_CONFIG_DIR` - Override Claude Code config location
  - `OPENCODE_CONFIG_DIR` - Override OpenCode config location
  - `XDG_CONFIG_HOME` - XDG Base Directory (OpenCode default)

**Secrets Location:**
- No secrets are stored - system is configuration-only
- Settings.json is user-editable configuration file

## Webhooks & Callbacks

**Incoming:**
- None - GSD is a local system with no incoming webhooks

**Outgoing:**
- None - GSD makes no outbound calls except for npm version checking

**Event Hooks:**
- SessionStart hook - Registered in `settings.json` hooks.SessionStart array
  - Executes: `gsd-check-update.js` at session start
  - Runs in background (detached, non-blocking)

**Statusline:**
- Registered in `settings.json` statusLine field
- Invoked by Claude Code when rendering UI
- Receives context data via stdin, outputs formatted status string to stdout

## Cross-Runtime Support

**Claude Code:**
- Installation path: `~/.claude/` (global) or `./.claude/` (local)
- Configuration: `~/.claude/settings.json`
- Cache: `~/.claude/cache/`
- Todos: `~/.claude/todos/`

**OpenCode:**
- Installation path: `~/.config/opencode/` (global) or `./.opencode/` (local)
- Configuration: `~/.config/opencode/opencode.json`
- Automatic permission configuration for GSD directories
- Flatfile command structure: `command/gsd-*.md` (not nested subdirectories)

**Path Conversion:**
- Installer automatically converts Markdown file references from `~/.claude/` to `~/.config/opencode/` paths for OpenCode installations
- Frontmatter tools converted: AskUserQuestion→question, SlashCommand→skill, TodoWrite→todowrite
- Commands converted from `/gsd:command` format to `/gsd-command` format for OpenCode

---

*Integration audit: 2026-01-26*
