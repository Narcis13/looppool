# Technology Stack

**Analysis Date:** 2026-01-26

## Languages

**Primary:**
- JavaScript - Latest version - Used throughout the codebase for installation, hooks, and build scripts

**Secondary:**
- Markdown - Documentation and command/agent specifications (YAML frontmatter + Markdown body)

## Runtime

**Environment:**
- Node.js 16.7.0 or higher (specified in `package.json` engines field)

**Package Manager:**
- npm - No lock file specified, but `package-lock.json` is present
- Lockfile: present at `package-lock.json`

## Frameworks

**Core:**
- None - Zero production dependencies by design. The system is CLI-based tooling and configuration distribution

**Build/Dev:**
- esbuild ^0.24.0 - Asset bundling for production distribution

## Key Dependencies

**No production dependencies** - This is intentional. GSD has zero runtime dependencies to minimize installation footprint.

**Development:**
- esbuild ^0.24.0 - JavaScript bundler used in build scripts

## Configuration

**Environment:**
- Environment variables for runtime configuration:
  - `CLAUDE_CONFIG_DIR` - Override default Claude Code config directory (~/.claude)
  - `OPENCODE_CONFIG_DIR` - Override default OpenCode config directory (~/.config/opencode)
  - `XDG_CONFIG_HOME` - XDG Base Directory Specification support (used by OpenCode)

**Build:**
- `scripts/build-hooks.js` - Copies hook files from `hooks/` to `hooks/dist/` for npm packaging
- Build command: `npm run build:hooks`
- Run via `npm run prepublishOnly` before publishing to npm

**Installation:**
- Interactive installer: `bin/install.js` - Handles runtime selection, location selection, and configuration
- Supports both Claude Code (~/.claude) and OpenCode (~/.config/opencode) installation paths
- Supports global and local (project-specific) installations
- Custom config directory support via `--config-dir` flag

## Platform Requirements

**Development:**
- Node.js >= 16.7.0
- macOS, Windows, or Linux
- npm for development (install via `npm install`)
- esbuild for building hooks distribution

**Production:**
- Node.js >= 16.7.0 installed and in PATH
- Claude Code or OpenCode installed (targeted runtime)
- ~3MB disk space for installation (commands, agents, workflows, hooks)

**Installation Target Directories:**
- Claude Code: `~/.claude/` (global) or `./.claude/` (local)
- OpenCode: `~/.config/opencode/` (global) or `./.opencode/` (local)
- Custom paths via `--config-dir` flag

## Package Distribution

**NPM Package:** `get-shit-done-cc`
- Published to npm registry
- Current version: 1.9.13
- Include list in `package.json` files field:
  - `bin/` - Installation script
  - `commands/` - Command definitions
  - `get-shit-done/` - Workflows, templates, references
  - `agents/` - Subagent prompts
  - `hooks/dist/` - Compiled hook scripts
  - `scripts/` - Build utilities

## Hooks & Automation

**Installed Hooks:**
- `hooks/gsd-statusline.js` - Reads Claude Code context window data from stdin and displays status line with model, task, directory, and context usage percentage
- `hooks/gsd-check-update.js` - Background version check, runs at SessionStart, caches result to `~/.claude/cache/gsd-update-check.json`

**Hooks Installation:**
- Global: Full paths used in settings.json
- Local: Relative paths (./` prefix used in settings.json)

---

*Stack analysis: 2026-01-26*
