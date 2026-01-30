# IDE Core Interface

A minimalist web-based IDE for managing the looppool-cc meta-prompting system.

## Overview

Single-page application with file tree navigation and editor panel. Focus on simplicity and speed.

## Requirements

### Layout
- Left sidebar: File tree showing commands/, looppool/, agents/ directories
- Main panel: Markdown editor with syntax highlighting
- Top bar: Project name, save status indicator

### File Tree
- Show only relevant directories: `commands/`, `looppool/`, `agents/`
- Collapse/expand directories
- Click file to open in editor
- Visual indicator for unsaved changes

### Editor
- Markdown editing with syntax highlighting
- YAML frontmatter support (for command files)
- Auto-save with debounce (2 seconds after last keystroke)
- Show line numbers

### Technology Stack
- React or vanilla JavaScript (keep minimal)
- Local file system access via File System Access API or simple backend
- No heavy frameworks - prioritize load speed

## Acceptance Criteria

- [ ] Can browse file tree of commands, workflows, agents
- [ ] Can open and edit markdown files
- [ ] Changes persist to disk
- [ ] Interface loads in under 1 second
- [ ] Works in modern browsers (Chrome, Firefox, Safari)
