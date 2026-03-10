# Notion Transcript Analysis Workflow

**Triggered by:** `/transcript-to-issues <notion-url>` or mentions of "extract requirements from transcript"

## Prerequisites

- Notion MCP configured and accessible
- Write access to `docs/issues-draft/` directory in current working directory
- GitHub CLI (`gh`) installed for issue creation

## Workflow Steps

### Step 1: Voice Notification (MANDATORY)

Send notification before any action:
```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyzing transcript from Notion to extract requirements"}' \
  > /dev/null 2>&1 &
```

Output text:
```
Running **NotionTranscriptAnalysis** workflow in **TranscriptToIssues** skill to extract requirements from transcript...
```

### Step 2: Extract Notion Page ID

From user's input, extract the Notion page ID:

```
Examples:
- https://www.notion.so/Job-Master-Automation-2fdb9debba3381b3b7fcea2c31bb318a
  → page_id: "2fdb9debba3381b3b7fcea2c31bb318a"

- https://www.notion.so/username/Page-Title-abc123def456
  → page_id: "abc123def456"
```

**Pattern:** Page ID is the last segment after the last hyphen in the URL.

### Step 3: Load Notion MCP Tools

```typescript
// Load deferred Notion MCP tools
ToolSearch({ query: "select:mcp__notion__notion-fetch" })
```

### Step 4: Fetch Transcript Content

```typescript
// Fetch page content using Notion MCP
const result = mcp__notion__notion_fetch({
  url: notionUrl  // Full URL works
})

// Validate fetch succeeded
if (!result || result.error) {
  console.error('❌ Failed to fetch Notion page.')
  console.error('Check: (1) URL is valid, (2) You have access permissions')
  console.error('Error:', result?.error)
  process.exit(1)
}

const transcriptContent = result.content || result.markdown || result.text
```

### Step 5: Extract Requirements via AI

Use Task tool with Algorithm agent to analyze transcript:

```typescript
// Launch extraction task
Task({
  subagent_type: "Algorithm",
  description: "Extract requirements from transcript",
  prompt: `Analyze this meeting transcript and extract actionable requirements.

For each requirement, provide:
1. **Title** (3-6 words, imperative form, e.g., "Add User Authentication")
2. **Summary** (2-3 sentences describing what needs to be built/fixed)
3. **Context** (relevant discussion snippet from transcript showing why)
4. **Priority** (high/medium/low based on urgency signals in discussion)

IGNORE:
- Scheduling discussions ("let's meet next week")
- Off-topic tangents
- Clarifying questions without decisions

FOCUS ON:
- Decisions made ("we should add...", "let's implement...")
- Problems identified ("the issue is...", "users are complaining...")
- Action items assigned ("Mike will handle...", "need to fix...")

Return as a JSON array:
[
  {
    "title": "Add User Authentication",
    "summary": "Implement OAuth-based login...",
    "context": "Discussion: Current password system is insecure...",
    "priority": "high"
  }
]

Transcript:
---
${transcriptContent}
---`
})
```

**Expected output structure:**
```json
{
  "requirements": [
    {
      "title": "Add Lightpath Support",
      "summary": "Integrate Lightpath API for tracking shipments...",
      "context": "Erik mentioned: We need Lightpath integration...",
      "priority": "high"
    }
  ]
}
```

### Step 6: Search Codebase for Context (Optional)

For each extracted requirement, search for related code:

```typescript
for (const req of requirements) {
  // Extract keywords from title
  const keywords = req.title.toLowerCase().split(' ')
    .filter(word => word.length > 3)  // Skip short words
    .slice(0, 3)  // Top 3 keywords

  // Search codebase using Grep
  try {
    const pattern = keywords.join('|')
    const searchResults = Grep({
      pattern: pattern,
      output_mode: 'files_with_matches',
      head_limit: 5,
      '-i': true  // Case insensitive
    })

    req.codeReferences = searchResults
      .split('\n')
      .filter(f => f.trim())
      .map(file => ({ file }))
  } catch (err) {
    // No matches found - that's OK for new features
    req.codeReferences = []
  }
}
```

### Step 7: Generate Draft Issue Files

```typescript
// Create draft directory if needed
Bash({
  command: 'mkdir -p docs/issues-draft',
  description: 'Create issues-draft directory'
})

// Generate timestamp for filenames
const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD

for (const req of requirements) {
  // Slugify title: lowercase, spaces to hyphens
  const slug = req.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const filename = `${timestamp}-${slug}.md`
  const filepath = `docs/issues-draft/${filename}`

  // Build markdown content
  const markdown = buildIssueDraft(req, notionUrl)

  // Write draft file
  Write({ file_path: filepath, content: markdown })

  console.log(`✅ Created: ${filepath}`)
}
```

**Helper function: buildIssueDraft**

```typescript
function buildIssueDraft(req, notionUrl) {
  const { title, summary, context, priority, codeReferences = [] } = req

  let referencesSection = ''
  if (codeReferences.length > 0) {
    referencesSection = `\n## Related Code\n\n`
    referencesSection += codeReferences
      .map(ref => `- \`${ref.file}\``)
      .join('\n')
  }

  const markdown = `## Summary

${summary}

## Context from Call

> ${context}

${referencesSection}

## Priority

${priority}

## Transcript Source

[Meeting Transcript](${notionUrl})

---

**Generated by TranscriptToIssues skill on ${new Date().toISOString().split('T')[0]}**
`

  return markdown
}
```

### Step 8: Summary & Next Steps

```
✅ Extracted ${requirements.length} requirements from transcript

Draft files created in docs/issues-draft/:
${requirements.map(r => {
  const slug = r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `  - ${timestamp}-${slug}.md`
}).join('\n')}

Next steps:
1. Review draft files in docs/issues-draft/
2. Edit as needed (add details, clarify requirements, fix extraction errors)
3. Create issues using gh CLI:

   gh issue create --title "${requirements[0].title}" --body-file docs/issues-draft/${timestamp}-${slug}.md --label "enhancement"

Tips:
- Add --label to categorize (enhancement, bug, refactor)
- Add --assignee to assign immediately
- Add --milestone to track in sprint
- Remember: NEVER use heredocs with gh CLI - always use --body-file
```

## Error Handling

**Notion fetch fails:**
```
❌ Failed to fetch Notion page.
Check:
1. URL is valid Notion page link
2. You have access permissions to the page
3. Notion MCP is configured

Test with:
  mcp__notion__notion-fetch "https://notion.so/your-page"
```

**Extraction returns empty:**
```
❌ No requirements extracted from transcript.

Possible reasons:
1. Transcript has no actionable items (all discussion, no decisions)
2. Content is very short
3. AI couldn't identify clear requirements

Suggestions:
- Check if transcript has decisions or action items
- Try again with more context in the transcript
```

**No codebase matches found:**
```
Note: No related code found for requirement "${title}"

This is normal for entirely new features. The requirement will still be created
as a draft without code references.
```

**Draft file already exists:**
```
⚠️  File exists: docs/issues-draft/${filename}

Appending unique suffix: ${filename.replace('.md', '-2.md')}
```

## Testing Checklist

- [ ] Voice notification sent at start
- [ ] Notion page fetched successfully
- [ ] AI extraction produces valid JSON
- [ ] Draft files created with proper naming
- [ ] Draft markdown is well-formatted
- [ ] User can create issue with `gh issue create --body-file`
- [ ] Error messages are clear and actionable

## Integration Notes

**With /workflows:plan:**
```
User: /transcript-to-issues https://notion.so/meeting

[Drafts created]

User: /workflows:plan docs/issues-draft/2026-02-04-add-feature.md
[Plan workflow uses draft as input for detailed planning]
```

**With gh CLI:**
```bash
# Create issue from draft (remember: no heredocs!)
gh issue create \
  --title "Add Feature X" \
  --body-file docs/issues-draft/2026-02-04-add-feature.md \
  --label "enhancement" \
  --assignee "@me"
```
