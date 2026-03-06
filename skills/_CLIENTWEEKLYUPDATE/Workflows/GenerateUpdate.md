# GenerateUpdate Workflow

Generate a weekly client update email for Henderson Services.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the GenerateUpdate workflow in the ClientWeeklyUpdate skill to draft the weekly Henderson email"}' \
  > /dev/null 2>&1 &
```

Running the **GenerateUpdate** workflow in the **ClientWeeklyUpdate** skill to draft the weekly Henderson email...

## Intent-to-Flag Mapping

| User Says | Flag | Effect |
|-----------|------|--------|
| "last week", "past week" (default) | `--days 7` | Pull last 7 days of data |
| "last two weeks", "past 2 weeks" | `--days 14` | Pull last 14 days |
| "skip github" | `--no-github` | Skip GitHub connector |
| "skip email" | `--no-gmail` | Skip Gmail connector |
| "skip transcripts", "skip fathom" | `--no-fathom` | Skip Fathom connector |

## Step 1: Load Client Context

Read these files for Henderson background:
- `~/.claude/PAI/USER/BUSINESS/CLIENTS/henderson/TELOS.md`
- `~/.claude/PAI/USER/BUSINESS/CLIENTS/henderson/ACTIVITY.md`

Summarize in 3-5 sentences: current priorities, active projects, key stakeholders.

## Step 2: Fetch GitHub Data

```bash
bun ~/.claude/skills/ClientWeeklyUpdate/Tools/FetchGitHub.ts \
  --repo eeeschwartz/aaa-henderson-pm-email-agent \
  --days [DAYS_FROM_MAPPING]
```

Capture output as `GITHUB_DATA`. If connector errors, note "GitHub: no data (error: ...)" and continue.

## Step 3: Fetch Fathom Transcripts

```bash
bun ~/.claude/skills/ClientWeeklyUpdate/Tools/FetchFathom.ts \
  --days [DAYS_FROM_MAPPING]
```

Capture output as `FATHOM_DATA`. If connector errors, note "Fathom: no data (error: ...)" and continue.

## Step 4: Fetch Gmail Threads

```bash
bun ~/.claude/skills/ClientWeeklyUpdate/Tools/FetchGmail.ts \
  --query "henderson OR luke OR josh sapp OR job master" \
  --days [DAYS_FROM_MAPPING]
```

Capture output as `GMAIL_DATA`. If connector errors or token missing, note "Gmail: no data (run SetupGmailAuth.ts first)" and continue.

## Step 5: Fetch Notion Notes

Use the Notion MCP to search for Henderson-related meeting notes from the past week:
- Call `mcp__notion__notion-search` with query "henderson"
- Call `mcp__notion__notion-search` with query "job master"
- Deduplicate results, take the 5 most recent pages
- Capture as `NOTION_DATA`

If no results found, note "Notion: no relevant pages found this week."

## Step 6: Generate Email Draft

Use PAI Inference Tool to synthesize all data into a client update email:

```bash
bun ~/.claude/PAI/Tools/Inference.ts standard
```

Pass this prompt (substituting actual data):

```
You are writing a weekly client update email on behalf of Erik Schwartz, AI/Automation Consultant, to Henderson Services.

CLIENT CONTEXT:
[CONTEXT_SUMMARY from Step 1]

DATA SOURCES THIS WEEK:
GitHub (merged PRs/commits):
[GITHUB_DATA]

Meeting transcripts (Fathom):
[FATHOM_DATA]

Email threads (Gmail):
[GMAIL_DATA]

Notion notes:
[NOTION_DATA]

---
Write a professional weekly update email with these sections:
1. **What We Did This Week** — concrete work completed, tied to Henderson's goals (G1-G4 where relevant)
2. **Key Decisions & Learnings** — anything decided or discovered that affects direction
3. **What's Coming Next Week** — specific planned work

Tone: direct, professional, brief. No corporate fluff. Assume the reader (Luke Templin) is busy and wants to scan this in 90 seconds.
Max length: 300 words.
Do NOT include a subject line — just the email body.
```

## Step 7: Write Output

Determine output path:
```
~/.claude/MEMORY/WORK/client-updates/henderson-[TODAY'S DATE YYYY-MM-DD].md
```

Write the draft email to that file. Include a header block:
```markdown
# Henderson Weekly Update — [DATE]
_Draft generated [TIMESTAMP] | Sources: GitHub([N] PRs), Fathom([N] calls), Gmail([N] threads), Notion([N] pages)_

---

[EMAIL BODY]
```

## Step 8: Report

Output to terminal:
```
✅ Draft saved to: ~/.claude/MEMORY/WORK/client-updates/henderson-YYYY-MM-DD.md
📊 Sources: GitHub (N PRs), Fathom (N calls), Gmail (N threads), Notion (N pages)
📝 Word count: N words
```

If any connector returned no data, flag it:
```
⚠️  Gmail: no data — run SetupGmailAuth.ts to configure Gmail access
```
