# Atomic JSON Operations Reference

**Version:** 1.0
**Last Updated:** 2026-01-27

This reference documents the atomic write pattern for JSON files in LPL, ensuring config.json and other JSON files remain valid even if operations are interrupted.

## Problem Statement

JSON files (like `.planning/config.json`) can corrupt on interrupted writes:

- Partial writes leave invalid JSON (truncated, missing closing braces)
- Process interrupts mid-write result in unreadable files
- Workflows fail on next read with parse errors

**Impact:** A corrupted config.json breaks all LPL workflows that read it.

---

## Atomic Write Pattern

Use the write-temp-verify-move pattern to prevent corruption.

### Pattern

```bash
# 1. Read current config
CONFIG=$(cat .planning/config.json 2>/dev/null || echo '{}')

# 2. Modify in memory
NEW_CONFIG=$(echo "$CONFIG" | jq '.key = "value"')

# 3. Write to temp file
echo "$NEW_CONFIG" > .planning/config.json.tmp

# 4. Verify temp file is valid JSON
if ! jq empty .planning/config.json.tmp 2>/dev/null; then
  rm .planning/config.json.tmp
  echo "ERROR: JSON validation failed, config unchanged"
  exit 1
fi

# 5. Atomic move (replaces original)
mv .planning/config.json.tmp .planning/config.json

# 6. Log success
echo "Config updated successfully"
```

### Why This Works

1. **Temp file isolation:** Write happens to `.tmp` file, not original
2. **Validation before replace:** `jq empty` validates JSON syntax
3. **Atomic move:** `mv` is atomic on POSIX systems - file is either old or new, never partial
4. **Original preserved:** If validation fails, original config remains untouched

---

## Error Recovery

### Pre-flight Check

Before any config operation, check for and remove stale temp files:

```bash
# Remove stale temp files from interrupted operations
rm -f .planning/config.json.tmp
```

### Detecting Interrupted Writes

If `.planning/config.json.tmp` exists alongside `.planning/config.json`:
- Previous operation was interrupted between steps 3-5
- The `.tmp` file may be incomplete or invalid
- Original `config.json` is preserved

### Recovery Actions

```bash
# If temp file exists, remove it (interrupted write)
if [ -f .planning/config.json.tmp ]; then
  echo "Found interrupted write, cleaning up..."
  rm -f .planning/config.json.tmp
fi

# Then proceed with normal operation
```

---

## When to Use

### Use Atomic Pattern For

- `config.json` edits (autonomous mode, model profile, gates)
- `agent-history.json` updates
- Any JSON file that must remain valid
- Any file where partial content is unusable

### NOT Needed For

- Markdown files (partial markdown is still readable)
- Text files where partial content doesn't break parsing
- Files that are overwritten completely each time (not incremental)

---

## Complete Example

Setting autonomous mode in config.json:

```bash
#!/bin/bash
set -e

CONFIG_FILE=".planning/config.json"
TMP_FILE="${CONFIG_FILE}.tmp"

# Pre-flight: clean up any stale temp files
rm -f "$TMP_FILE"

# 1. Read current config (default to empty object)
CONFIG=$(cat "$CONFIG_FILE" 2>/dev/null || echo '{}')

# 2. Modify in memory
NEW_CONFIG=$(echo "$CONFIG" | jq '.autonomous = true')

# 3. Write to temp
echo "$NEW_CONFIG" > "$TMP_FILE"

# 4. Validate
if ! jq empty "$TMP_FILE" 2>/dev/null; then
  rm -f "$TMP_FILE"
  echo "ERROR: JSON validation failed"
  exit 1
fi

# 5. Atomic replace
mv "$TMP_FILE" "$CONFIG_FILE"

echo "Autonomous mode enabled"
```

---

## Integration with Workflows

Workflows that modify config.json should reference this pattern:

```markdown
**For atomic config.json operations:**
See @~/.claude/looppool/references/atomic-json.md
```

This ensures all config modifications follow the safe pattern.
