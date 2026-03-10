# FetchTranscript Workflow

Fetch Notion page transcripts using the context-efficient CLI tool.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Fetching Notion transcript using CLI"}' \
  > /dev/null 2>&1 &
```

Running **FetchTranscript** workflow in **Notion** skill...

---

## Overview

This workflow uses the `notion-fetch` CLI to fetch page transcripts with minimal context overhead (~50 tokens vs ~13.8k tokens with MCP).

---

## Intent-to-Flag Mapping

### Output Format

| User Says | Flag | Effect |
|-----------|------|--------|
| "JSON", "machine-readable", "metadata only" | `--json` | Output metadata JSON to stdout |
| (default), "human-readable" | (none) | Human-friendly output |
| "verbose", "debug", "show details" | `--verbose` | Include debugging information |

### Output Directory

| User Says | Flag | Effect |
|-----------|------|--------|
| "save to DIR", "output to DIR" | `--output DIR` | Save to custom directory |
| (default) | (none) | Save to `./transcripts/` |

### Overwrite Behavior

| User Says | Flag | Effect |
|-----------|------|--------|
| "force", "overwrite", "replace existing" | `--force` | Overwrite existing files |
| (default) | (none) | Error if file exists |

---

## Step 1: Validate Input

Extract page ID from user request:

**Supported formats:**
- Full URL: `https://notion.so/Page-Title-abc123def456`
- Short URL: `notion.so/abc123def456`
- Page ID only: `abc123def456`

**Extract ID:**
```bash
# If URL provided, extract the ID (last segment after last dash)
PAGE_ID=$(echo "$URL" | grep -oE '[a-f0-9]{32}$')

# If just ID provided, use directly
PAGE_ID="$USER_PROVIDED_ID"
```

---

## Step 2: Determine Flags from Intent

Based on user's natural language request, map to CLI flags:

```typescript
const flags: string[] = [];

// Output format
if (userSays("JSON") || userSays("metadata") || userSays("machine-readable")) {
  flags.push("--json");
}

// Verbose mode
if (userSays("verbose") || userSays("debug") || userSays("details")) {
  flags.push("--verbose");
}

// Output directory
if (userSays("save to") || userSays("output to")) {
  const dir = extractDirectory(userRequest);
  flags.push(`--output ${dir}`);
}

// Force overwrite
if (userSays("force") || userSays("overwrite") || userSays("replace")) {
  flags.push("--force");
}
```

---

## Step 3: Execute CLI

```bash
notion-fetch --id <page_id> [FLAGS_FROM_INTENT]
```

**Example commands:**

```bash
# Basic fetch
notion-fetch --id abc123def456

# Fetch with JSON output
notion-fetch --id abc123def456 --json

# Fetch to custom directory
notion-fetch --id abc123def456 --output ./meeting-notes

# Fetch with verbose debugging
notion-fetch --id abc123def456 --verbose

# Force overwrite existing file
notion-fetch --id abc123def456 --force

# Combination
notion-fetch --id abc123def456 --output ./docs --json --force
```

---

## Step 4: Handle Response

### Default Output (Human-Readable)

```
Saved: ./transcripts/2026-02-05_page-title.md (1234 words)
```

**Action:** Report success to user with file location and word count.

---

### JSON Output (Machine-Readable)

```json
{
  "id": "abc123def456",
  "title": "Page Title",
  "path": "/absolute/path/to/transcripts/2026-02-05_page-title.md",
  "fetchedAt": "2026-02-05T10:30:00.000Z",
  "wordCount": 1234,
  "lastEditedAt": "2026-02-04T15:20:00.000Z"
}
```

**Action:** Parse JSON and provide structured summary to user.

---

## Step 5: Error Handling

The CLI uses specific exit codes for different error types:

| Exit Code | Meaning | User-Friendly Message |
|-----------|---------|----------------------|
| 0 | Success | Report success |
| 1 | Auth error | "Check your NOTION_API_KEY in ~/.claude/.env" |
| 2 | Page not found | "Page ID not found. Verify it's correct." |
| 3 | Permission denied | "Share the page with your Notion integration" |
| 4 | Network error | "Network issue. Check your connection." |
| 5 | File system error | "Can't write file. Check permissions." |
| 6 | Invalid input | "Missing --id flag. Provide page ID." |

**Handle errors gracefully:**

```bash
if ! notion-fetch --id "$PAGE_ID" --json 2>/tmp/error.txt; then
  exit_code=$?
  case $exit_code in
    1) echo "Authentication error. Check NOTION_API_KEY in ~/.claude/.env" ;;
    2) echo "Page not found. Verify page ID: $PAGE_ID" ;;
    3) echo "Access denied. Share page with your Notion integration." ;;
    4) echo "Network error. Check your internet connection." ;;
    5) echo "File write error. Check directory permissions." ;;
    6) echo "Invalid input. Page ID is required." ;;
  esac
  exit $exit_code
fi
```

---

## Step 6: Batch Processing (Multiple Pages)

If user provides multiple page IDs:

```bash
# User request: "Fetch pages abc123, def456, and ghi789"
page_ids=("abc123def456" "def456ghi789" "ghi789abc123")

results=()
for page_id in "${page_ids[@]}"; do
  result=$(notion-fetch --id "$page_id" --json 2>&1)
  if [ $? -eq 0 ]; then
    results+=("$result")
  else
    echo "Failed to fetch $page_id: $result" >&2
  fi
done

# Combine all results into JSON array
echo "${results[@]}" | jq -s '.'
```

---

## Examples

### Example 1: Basic Fetch

**User:** "Fetch Notion page abc123def456"

**Command:**
```bash
notion-fetch --id abc123def456
```

**Output:**
```
Saved: ./transcripts/2026-02-05_meeting-notes.md (1234 words)
```

---

### Example 2: JSON Metadata

**User:** "Fetch page abc123 and give me the JSON metadata"

**Command:**
```bash
notion-fetch --id abc123def456 --json
```

**Output:**
```json
{"id":"abc123def456","title":"Meeting Notes","path":"/path/to/file.md","fetchedAt":"2026-02-05T10:30:00Z","wordCount":1234}
```

---

### Example 3: Custom Directory

**User:** "Fetch page abc123 and save to my Documents folder"

**Command:**
```bash
notion-fetch --id abc123def456 --output ~/Documents/notion
```

**Output:**
```
Saved: /Users/you/Documents/notion/2026-02-05_page-title.md (1234 words)
```

---

### Example 4: Batch Fetch

**User:** "Fetch transcripts for pages abc123, def456, and ghi789"

**Command:**
```bash
for id in abc123def456 def456ghi789 ghi789abc123; do
  notion-fetch --id "$id" --json
done | jq -s '.'
```

**Output:**
```json
[
  {"id":"abc123def456","title":"Page 1",...},
  {"id":"def456ghi789","title":"Page 2",...},
  {"id":"ghi789abc123","title":"Page 3",...}
]
```

---

## Context Efficiency

**This workflow saves massive context:**

| Operation | MCP Tokens | CLI Tokens | Savings |
|-----------|-----------|-----------|---------|
| Single page | ~13,800 | ~50 | 99.6% |
| Three pages | ~41,400 | ~150 | 99.6% |
| Ten pages | ~138,000 | ~500 | 99.6% |

---

## Troubleshooting

### CLI Not Found

**Symptom:** `command not found: notion-fetch`

**Fix:**
```bash
# Check if CLI exists
ls -la ~/.claude/Bin/notion-fetch/notion-fetch.ts

# Make executable if needed
chmod +x ~/.claude/Bin/notion-fetch/notion-fetch.ts

# Use full path if not in PATH
~/.claude/Bin/notion-fetch/notion-fetch.ts --id abc123
```

---

### API Key Not Configured

**Symptom:** `Error: NOTION_API_KEY not found in ~/.claude/.env`

**Fix:**
```bash
echo "NOTION_API_KEY=secret_your_key_here" >> ~/.claude/.env
```

---

### Page Not Found

**Symptom:** `Error: Page not found (id: abc123)`

**Fix:**
1. Verify page ID is correct
2. Share page with your Notion integration:
   - Open page in Notion
   - Click "..." → "Connections"
   - Add your integration

---

## When NOT to Use This Workflow

**Use Notion MCP instead when you need:**
- Full page structure with all properties
- Database queries or complex filtering
- Page creation or updates
- Interactive exploration of page relationships

**This workflow is for:** Efficient transcript fetching with minimal context usage.

---

**The FetchTranscript workflow provides context-efficient Notion page fetching, saving 99.6% of context compared to MCP while persisting full content to disk.**
