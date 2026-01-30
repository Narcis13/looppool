# IDE Server

Lightweight local server for file system access.

## Overview

Simple Node.js server that provides file system operations for the IDE frontend.

## Requirements

### API Endpoints
- `GET /api/tree` - Return directory tree for commands/, looppool/, agents/
- `GET /api/file?path=...` - Read file content
- `PUT /api/file?path=...` - Write file content
- `GET /api/state` - Read .planning/STATE.json

### File Watching
- Watch for file changes
- Send updates via WebSocket or SSE
- Frontend updates automatically

### Security
- Only serve files within project directory
- Validate paths to prevent directory traversal
- Bind to localhost only (127.0.0.1)

### Startup
- Single command: `npm run ide` or `./ide.sh`
- Opens browser automatically
- Port: 3456 (configurable)

## Technology
- Node.js with minimal dependencies
- Express or native http module
- chokidar for file watching (or fs.watch)

## Acceptance Criteria

- [ ] Server starts with single command
- [ ] Can read/write markdown files via API
- [ ] File changes reflected in frontend within 1 second
- [ ] Cannot access files outside project directory
