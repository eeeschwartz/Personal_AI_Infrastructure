---
name: TranscriptToIssues
description: Transform meeting transcripts into GitHub issue drafts. USE WHEN transcript, meeting notes, create issues from notion, analyze call, extract requirements from meeting.
---

# Transcript-to-Issues Skill

Analyzes meeting transcripts from Notion and generates GitHub issue draft files for human review before submission.

## 🚨 MANDATORY: Voice Notification

**REQUIRED BEFORE ANY ACTION.**

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running NotionTranscriptAnalysis workflow in TranscriptToIssues skill to extract requirements from transcript"}' \
  > /dev/null 2>&1 &
```

## Workflow Routing

| User Intent | Workflow File |
|-------------|---------------|
| `/transcript-to-issues <notion-url>` | `Workflows/NotionTranscriptAnalysis.md` |
| Extract requirements from transcript | `Workflows/NotionTranscriptAnalysis.md` |
| Analyze meeting and create issues | `Workflows/NotionTranscriptAnalysis.md` |

## Quick Reference

**Command:**
```
/transcript-to-issues https://www.notion.so/page-id
```

**Output:**
- Draft files in `docs/issues-draft/YYYY-MM-DD-requirement-slug.md`
- Ready for review and `gh issue create --body-file <draft>`

## How It Works

1. **Fetch:** Loads Notion page content via MCP
2. **Extract:** Uses AI to identify actionable requirements from transcript
3. **Context:** Searches codebase for related patterns (optional)
4. **Generate:** Creates markdown draft files for human review
5. **Review:** User edits drafts then creates issues via `gh issue create`

## Examples

**Example 1: Process meeting transcript**
```
User: /transcript-to-issues https://www.notion.so/Job-Master-Automation-2fdb9debba3381b3

Output:
✅ Extracted 5 requirements from transcript
✅ Created draft files:
   - docs/issues-draft/2026-02-04-add-lightpath-support.md
   - docs/issues-draft/2026-02-04-automate-attachment-sync.md
   - docs/issues-draft/2026-02-04-implement-stones-river-integration.md
   - docs/issues-draft/2026-02-04-handoff-workflow-to-mike.md
   - docs/issues-draft/2026-02-04-job-master-automation.md

Review drafts, edit as needed, then:
  gh issue create --body-file docs/issues-draft/2026-02-04-add-lightpath-support.md
```

**Example 2: Quick extraction**
```
User: "Extract requirements from https://notion.so/weekly-sync"

Skill activates automatically, processes transcript, generates 3 draft files.
```

## Integration

**Inputs:**
- Notion page URL (meeting transcript)
- Working directory for draft output

**Outputs:**
- Markdown files in `docs/issues-draft/`
- Summary of extracted requirements

**Downstream:**
- `/workflows:plan` - Use drafts as input for detailed planning
- `gh issue create` - Create GitHub issues from drafts

## Tips

**For best results:**
- Ensure Notion MCP is configured
- Transcripts should have clear discussion sections
- Review drafts before creating issues (AI may miss nuance)
- Edit draft files to add details if needed

**Troubleshooting:**
- **Notion fetch fails:** Check URL and permissions
- **No requirements extracted:** Transcript may lack actionable items
- **Low quality extractions:** Try simplifying transcript or adding context

## Configuration

**Optional customization:**
- Create `docs/issues-draft/.gitignore` to exclude drafts from version control
- Configure default labels in Tools/GenerateIssueDraft.ts
