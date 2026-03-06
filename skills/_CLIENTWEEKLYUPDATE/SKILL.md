---
name: _CLIENTWEEKLYUPDATE
description: Generate weekly client update emails from GitHub, Gmail, Fathom transcripts, and Notion. USE WHEN weekly update, client email, Henderson update, weekly summary, generate update email, what happened this week, client report.
---

# ClientWeeklyUpdate

Aggregates data from GitHub (merged PRs), Gmail (client email threads), Fathom (meeting transcripts), and Notion, then generates a drafted weekly client update email using Henderson's strategic context.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/ClientWeeklyUpdate/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the ClientWeeklyUpdate skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **ClientWeeklyUpdate** skill to ACTION...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **GenerateUpdate** | "weekly update", "client email", "generate update", "what happened this week" | `Workflows/GenerateUpdate.md` |

## Quick Reference

- **Client:** Henderson Services
- **GitHub repo:** `eeeschwartz/aaa-henderson-pm-email-agent`
- **Context files:** `~/.claude/PAI/USER/BUSINESS/CLIENTS/henderson/`
- **Output:** `~/.claude/MEMORY/WORK/client-updates/henderson-YYYY-MM-DD.md`
- **Gmail setup:** Run `bun ~/.claude/skills/ClientWeeklyUpdate/Tools/SetupGmailAuth.ts` first

## Prerequisites

Before running GenerateUpdate for the first time:
1. Set `FATHOM_API_KEY` env var (you have this)
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars (see `GmailSetup.md`)
3. Run `bun ~/.claude/skills/ClientWeeklyUpdate/Tools/SetupGmailAuth.ts` to authorize Gmail

## Examples

**Example 1: Generate this week's update**
```
User: "generate the weekly Henderson update"
→ Invokes GenerateUpdate workflow
→ Fetches GitHub PRs, Gmail threads, Fathom transcripts, Notion notes
→ Drafts email to ~/.claude/MEMORY/WORK/client-updates/henderson-2026-03-06.md
```

**Example 2: Update with date range**
```
User: "weekly update for last week"
→ Invokes GenerateUpdate workflow with --days 14 flag
→ Pulls data from prior 14 days
→ Drafts email with full context
```
