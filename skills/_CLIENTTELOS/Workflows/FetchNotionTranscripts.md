# Fetch Notion Transcripts Workflow

Automatically fetch missing transcripts from a Notion database and update the client's Activity Log.

## Trigger

- "fetch notion transcripts"
- "sync transcripts from notion"
- "get missing transcripts"
- "update transcripts"

## Prerequisites

1. **Client TELOS exists** at `~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/`
2. **NOTION_API_KEY configured** in `~/.claude/.env`
3. **Notion database shared** with integration at notion.so/my-integrations
4. **Voice server running** on localhost:8888

## Steps

### 1. Get Client Name and Notion Database URL

Ask user for:
- Client name (must match directory in CLIENTS/)
- Notion database URL (full URL from browser)

### 2. Send Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running FetchNotionTranscripts workflow in ClientTelos skill to sync transcripts from Notion database"}' \
  > /dev/null 2>&1 &
```

Output:
```
Running **FetchNotionTranscripts** workflow in **ClientTelos** skill to sync transcripts from Notion database...
```

### 3. Extract Database ID from URL

Parse the Notion URL to extract the database ID (32-character hex string):

```typescript
// Example URL: https://www.notion.so/254b9debba3381bd9bb9d6f97f365a8c?v=2feb9debba338083b4a1000c285cde87
// Extract: 254b9debba3381bd9bb9d6f97f365a8c

function extractDatabaseId(url: string): string {
  const match = url.match(/\/([0-9a-f]{32})/);
  if (!match) {
    throw new Error('Invalid Notion database URL');
  }
  return match[1];
}
```

### 4. Query Notion Database for All Pages

Use Notion MCP tool to query the database:

```bash
# Use Notion MCP to get all pages in database
# This returns: { results: [...pages], has_more: boolean, next_cursor: string }
```

**Handle pagination** if `has_more` is true:
- Continue querying with `next_cursor` until `has_more` is false
- Accumulate all results

### 5. Get List of Existing Local Transcripts

```bash
ls ~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/TRANSCRIPTS/*.md
```

Parse filenames into a Set for O(1) lookup:
```typescript
const localFiles = new Set(
  listFiles.map(path => basename(path))
);
```

### 6. Identify Missing Transcripts

For each Notion page:
1. Generate expected filename: `{created_time_date}_{slugified-title}.md`
2. Check if filename exists in localFiles Set
3. If not found, add to `missing` list

**Handle collisions**: If two pages generate same filename, append `-2`, `-3`, etc.

```typescript
const missing: NotionPage[] = [];
const usedFilenames = new Set(localFiles);

for (const page of notionPages) {
  let filename = generateFilename(page.created_time, page.title);
  let counter = 2;

  // Check collision
  while (usedFilenames.has(filename)) {
    const [name, ext] = filename.split('.');
    filename = `${name}-${counter}.${ext}`;
    counter++;
  }

  if (!localFiles.has(filename)) {
    missing.push({ ...page, _filename: filename });
    usedFilenames.add(filename);
  }
}
```

### 7. Fetch Missing Transcripts

For each missing transcript:

```bash
notion-fetch \
  --id <page_id> \
  --output ~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/TRANSCRIPTS/ \
  --json
```

**Rate limiting**: Respect 3 requests/second Notion API limit
- Add 334ms delay between requests
- Handle 429 errors with exponential backoff

**Error handling**:
- Exit code 0: Success
- Exit code 1: Auth error (check NOTION_API_KEY)
- Exit code 2: Page not found
- Exit code 3: Permission denied (share page with integration)
- Exit code 4: Network error (retry with backoff)
- Exit code 5: File system error
- Exit code 6: Invalid input

**Track results**:
```typescript
interface FetchResult {
  fetched: Array<{ pageId: string; path: string; wordCount: number }>;
  skipped: Array<{ pageId: string; reason: string }>;
  failed: Array<{ pageId: string; error: string }>;
}
```

### 8. Update Activity Log

Read existing `ACTIVITY.md` and prepend new entry:

```markdown
## 2026-02-05

**Transcript ingestion from Notion:**
- Fetched 3 new transcripts from Notion database
- Stored in TRANSCRIPTS/:
  - `2026-02-05_strategy-meeting.md` (1847 words)
  - `2026-02-04_client-check-in.md` (542 words)
  - `2026-02-03_technical-review.md` (1205 words)
- Total transcripts now: 6
- Manual TELOS review recommended for strategic updates
```

**Use file locking** to prevent race conditions:
```bash
{
  flock -x 200
  content=$(cat ACTIVITY.md)
  echo -e "$new_entry\n\n$content" > ACTIVITY.md.tmp
  mv ACTIVITY.md.tmp ACTIVITY.md
} 200>/tmp/activity-${client_name}.lock
```

### 9. Report Summary

Output result summary:
```
✓ Transcript sync complete

Summary:
- Fetched: 3 transcripts
- Skipped: 2 (already present)
- Failed: 0
- Total local transcripts: 6

Stored in: ~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/TRANSCRIPTS/
Activity Log updated: ~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/ACTIVITY.md

Next steps:
- Review new transcripts for strategic context
- Update TELOS with new goals/priorities if needed
- Run: /client-telos prioritize <client-name>
```

## Error Handling

### Auth Errors (Exit 1)
```
❌ Error: Notion authentication failed
   Check NOTION_API_KEY in ~/.claude/.env
   Get API key from: https://www.notion.so/my-integrations
```

### Permission Errors (Exit 3)
```
❌ Error: Access denied to Notion database
   Share the database with your integration:
   1. Open database in Notion
   2. Click "..." → "Connections"
   3. Add your integration
```

### Network Errors (Exit 4)
- Retry up to 3 times with exponential backoff
- If still failing, suggest checking internet connection

### Rate Limit Errors (429)
- Respect Retry-After header
- Wait specified time before retry
- Continue with remaining transcripts

## Performance

**Expected timing** (for Henderson client):
- 10 transcripts: ~3-5 seconds
- 20 transcripts: ~7-10 seconds
- 50 transcripts: ~17-20 seconds

**Optimization strategies**:
- Use Set-based lookups (O(1) vs O(n))
- Batch progress updates (every 5 transcripts)
- Rate limit proactively (don't wait for 429)

## Security

**Validations applied**:
- Database ID format (32 hex chars)
- Page ID format (UUID)
- Output path (must be within CLIENTS/)
- File permissions (600 on .env)

**Data protection**:
- API keys never logged
- Transcripts saved with 644 permissions
- Activity Log is append-only

## Example Usage

```bash
# Interactive workflow trigger
/client-telos fetch-transcripts

# User provides:
# - Client: henderson
# - URL: https://www.notion.so/254b9debba3381bd9bb9d6f97f365a8c?v=2feb9debba338083b4a1000c285cde87

# Workflow executes and reports:
# ✓ Transcript sync complete
# - Fetched: 3 transcripts
# - Skipped: 2 (already present)
```

## Notes

- **Idempotent**: Safe to run multiple times - skips existing transcripts
- **Incremental**: Only fetches new transcripts since last sync
- **Auditable**: All fetches logged in Activity Log with timestamps
- **Manual TELOS review**: Workflow does NOT auto-update TELOS goals/priorities (user review required)
