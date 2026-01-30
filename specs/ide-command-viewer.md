# Command Viewer

Display commands with parsed metadata and quick actions.

## Overview

When viewing a command file, show structured information extracted from YAML frontmatter alongside the raw content.

## Requirements

### Frontmatter Display
- Parse YAML frontmatter from command files
- Show as structured card: name, description, argument-hint, allowed-tools
- Visual badges for allowed tools

### Quick Actions
- "Copy command" button (copies `/lpl:command-name`)
- "View workflow" link (if command references a workflow)
- "Test in terminal" button (opens command in terminal context)

### Relationships
- Show which workflow the command delegates to
- List agents spawned by the workflow
- Show templates used

## Acceptance Criteria

- [ ] YAML frontmatter parsed and displayed as card
- [ ] Can copy command name with one click
- [ ] Related workflows/agents shown as clickable links
