---
name: Notion
description: Notion API integration with CLI and MCP tools. USE WHEN fetching Notion pages, saving transcripts, querying databases, OR accessing Notion content. Provides context-efficient CLI tool for transcript fetching and MCP integration for interactive exploration.
---

# Notion

Notion API integration providing both CLI and MCP tools for different use cases.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running WORKFLOWNAME in Notion skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running **WorkflowName** in **Notion** skill...
   ```

**Full documentation:** `~/.claude/PAI/THENOTIFICATIONSYSTEM.md`

---

## Tool Selection Decision Tree

**Use this deterministic decision tree to choose the right tool:**

```
START: Need to interact with Notion
│
├─ Need to fetch page transcript/content? ─────────── YES → notion-fetch CLI
│                                                      NO  ↓
│
├─ Need minimal context usage (< 100 tokens)? ──────── YES → notion-fetch CLI
│                                                      NO  ↓
│
├─ Need to save content to disk? ──────────────────── YES → notion-fetch CLI
│                                                      NO  ↓
│
├─ Need to explore page structure interactively? ──── YES → Notion MCP
│                                                      NO  ↓
│
├─ Need to query databases or complex operations? ─── YES → Notion MCP
│                                                      NO  ↓
│
└─ Default: Use notion-fetch CLI for efficiency
```

---

## Tools Available

### 1. notion-fetch CLI (PREFERRED for transcripts)

**Context-efficient TypeScript CLI for fetching Notion pages.**

**Location:** `~/.claude/Bin/notion-fetch/notion-fetch.ts`

**When to use:**
- ✅ Fetching page transcripts/content
- ✅ Saving content to disk
- ✅ Batch processing multiple pages
- ✅ Minimal context overhead (50 tokens vs 13.8k tokens)
- ✅ Automation and scripting
- ✅ Deterministic workflows

**Usage:**
```bash
# Basic fetch
notion-fetch --id <page_id>

# Save to custom directory
notion-fetch --id <page_id> --output ./my-notes

# Get JSON metadata (machine-readable)
notion-fetch --id <page_id> --json

# Verbose mode for debugging
notion-fetch --id <page_id> --verbose

# Force overwrite existing file
notion-fetch --id <page_id> --force
```

**Output:**
```bash
# Default (human-readable)
Saved: ./transcripts/2026-02-05_page-title.md (1234 words)

# JSON mode (machine-readable)
{"id":"abc123","title":"Page Title","path":"/path/to/file.md","fetchedAt":"2026-02-05T10:30:00Z","wordCount":1234}
```

**File naming:** `{YYYY-MM-DD}_{slugified-title}.md`

**Configuration:** Requires `NOTION_API_KEY` in `~/.claude/.env`

**Documentation:**
- Full docs: `~/.claude/Bin/notion-fetch/README.md`
- Quick start: `~/.claude/Bin/notion-fetch/QUICKSTART.md`

**Context efficiency:**
- **MCP response:** ~13,800 tokens
- **CLI response:** ~50 tokens
- **Savings:** 99.6% reduction

---

### 2. Notion MCP (Use for interactive exploration)

**Full-featured Notion API access via Model Context Protocol.**

**When to use:**
- ✅ Interactive page structure exploration
- ✅ Need full page object with metadata
- ✅ Complex database queries
- ✅ Creating/updating pages
- ✅ Need to see all page properties
- ❌ NOT for simple transcript fetching (too much context)

**Available via:** MCP tools (`mcp__notion__*`)

**Common operations:**
- `mcp__notion__notion-fetch` - Fetch pages (includes full content)
- `mcp__notion__notion-search` - Search workspace
- `mcp__notion__notion-query-database-view` - Query databases
- `mcp__notion__notion-create-pages` - Create new pages
- `mcp__notion__notion-update-page` - Update existing pages

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **FetchTranscript** | "fetch notion page", "get transcript" | `Workflows/FetchTranscript.md` |

---

## Examples

### Example 1: Fetch page transcript (context-efficient)

```
User: "Fetch the Notion page abc123def456 and save the transcript"

→ Uses notion-fetch CLI (not MCP)
→ Runs: notion-fetch --id abc123def456 --json
→ Saves content to: ./transcripts/2026-02-05_page-title.md
→ Returns minimal metadata: {"id":"abc123","title":"...","path":"..."}
→ Context used: ~50 tokens (vs 13.8k with MCP)
```

### Example 2: Batch fetch multiple pages

```
User: "Fetch transcripts for pages abc123, def456, and ghi789"

→ Uses notion-fetch CLI in loop
→ Each fetch saves to disk with timestamp prefix
→ Returns JSON array of metadata for all pages
→ Total context: ~150 tokens (vs ~41k with MCP)
```

### Example 3: Interactive page exploration (use MCP)

```
User: "Show me the full structure of this Notion page including all properties and database relations"

→ Uses Notion MCP (appropriate for this use case)
→ Returns complete page object with all metadata
→ Context: ~13.8k tokens (acceptable for interactive exploration)
```

---

## Configuration

### Required Environment Variables

Add to `~/.claude/.env`:

```bash
NOTION_API_KEY=secret_your_integration_token_here
```

**Get your API key:**
1. Visit: https://www.notion.so/my-integrations
2. Create new integration (or use existing)
3. Copy the "Internal Integration Token"
4. Share target pages with the integration

---

## Best Practices

### 1. Prefer CLI for Transcripts

**Default to notion-fetch CLI** for fetching page content. Only use MCP when you need:
- Full page structure/properties
- Database queries
- Page creation/updates

### 2. Use JSON Mode for Automation

When calling from workflows or scripts:
```bash
notion-fetch --id "$PAGE_ID" --json | jq '.path'
```

### 3. Organize Transcripts by Date

The CLI's timestamp-prefixed naming keeps transcripts organized chronologically:
```
./transcripts/
  2026-02-05_meeting-notes.md
  2026-02-05_standup-summary.md
  2026-02-04_product-review.md
```

### 4. Batch Processing Pattern

```bash
# Process multiple pages efficiently
for page_id in $(cat page-ids.txt); do
  notion-fetch --id "$page_id" --output ./batch --json
done | jq -s '.'
```

### 5. Check Exit Codes

The CLI uses proper exit codes for error handling:
- `0` - Success
- `1` - Authentication error
- `2` - Page not found
- `3` - Permission denied
- `4` - Network error
- `5` - File system error
- `6` - Invalid input

---

## Troubleshooting

### "NOTION_API_KEY not found"

**Fix:**
```bash
echo "NOTION_API_KEY=secret_xxx..." >> ~/.claude/.env
```

### "Page not found" or "Access denied"

**Fix:** Share the page with your Notion integration:
1. Open page in Notion
2. Click "..." → "Connections"
3. Add your integration

### "File already exists"

**Fix:** Use `--force` flag to overwrite:
```bash
notion-fetch --id abc123 --force
```

---

## Integration Examples

### With jq (JSON processing)

```bash
# Extract just the file path
notion-fetch --id abc123 --json | jq -r '.path'

# Get word count
notion-fetch --id abc123 --json | jq '.wordCount'

# Check if edited today
notion-fetch --id abc123 --json | jq '.lastEditedAt | startswith("2026-02-05")'
```

### With Git

```bash
# Fetch and commit
notion-fetch --id abc123 --output ./docs
git add docs/
git commit -m "Update docs from Notion"
```

### With PAI Workflows

```typescript
// In a workflow script
const metadata = await Bash({
  command: `notion-fetch --id "${pageId}" --json`,
});
const data = JSON.parse(metadata);
console.log(`Fetched ${data.wordCount} words to ${data.path}`);
```

---

## Context Efficiency Comparison

| Operation | MCP Tokens | CLI Tokens | Savings |
|-----------|-----------|-----------|---------|
| Fetch single page | ~13,800 | ~50 | 99.6% |
| Fetch 3 pages | ~41,400 | ~150 | 99.6% |
| Fetch 10 pages | ~138,000 | ~500 | 99.6% |

**Result:** CLI enables batch operations that would be impossible with MCP due to context limits.

---

## Quick Reference

| Task | Tool | Command |
|------|------|---------|
| Fetch transcript | CLI | `notion-fetch --id <page_id>` |
| Fetch + JSON | CLI | `notion-fetch --id <page_id> --json` |
| Custom output dir | CLI | `notion-fetch --id <page_id> --output ./dir` |
| Explore structure | MCP | `mcp__notion__notion-fetch` |
| Search workspace | MCP | `mcp__notion__notion-search` |
| Query database | MCP | `mcp__notion__notion-query-database-view` |

---

**The Notion skill provides context-efficient CLI tools for common operations while maintaining MCP access for complex interactive work.**
