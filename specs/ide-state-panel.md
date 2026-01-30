# State Panel

View and manage project state from .planning directory.

## Overview

Dashboard showing current project state: active milestone, phase progress, roadmap status.

## Requirements

### State Display
- Current milestone and phase
- Task completion progress (from PLAN.md files)
- Recent activity (commits, file changes)

### Roadmap View
- Show phases from ROADMAP.md
- Visual progress bar per phase
- Click phase to see its plan

### Quick Actions
- "Resume work" - show CONTINUE_HERE.md if exists
- "View decisions" - open decisions log
- "Check progress" - summary of completed vs remaining

### State Files
- Read from: `.planning/STATE.json`
- Display: `PROJECT.md`, `ROADMAP.md`, phase plans

## Acceptance Criteria

- [ ] Shows current project phase and progress
- [ ] Roadmap displayed with completion status
- [ ] Can navigate to any planning document
- [ ] Updates when files change
