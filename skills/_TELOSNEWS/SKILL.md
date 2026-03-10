---
name: TelosNews
description: Weekly news aggregation based on TELOS interests. USE WHEN telos news, news about my interests, weekly news summary, find news about goals OR mentions news related to TELOS topics.
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/TelosNews/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.


## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the Search workflow in the TelosNews skill to find weekly news"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **Search** workflow in the **TelosNews** skill to find weekly news...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# TelosNews

Automatically searches for news related to your TELOS interests and posts results to Notion with source URLs.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Search** | "find TELOS news", "news about my interests", "weekly news" | `Workflows/Search.md` |

## How It Works

1. **Extract Topics** - Reads your TELOS files to understand your interests
2. **Search News** - Queries web search for news from last week
3. **Format Results** - Groups findings by topic area
4. **Post to Notion** - Creates a new page with all results and source URLs

## Examples

**Example 1: Weekly news check**
```
User: "find news about my TELOS from this week"
→ Invokes Search workflow
→ Extracts topics from GOALS.md, PROBLEMS.md, PREDICTIONS.md
→ Searches web for "AI job displacement 2026", "community building initiatives", etc.
→ Groups results by topic (AI/Economy, Community, Sustainability)
→ Posts to Notion with source URLs for each article
```

**Example 2: Specific timeframe**
```
User: "what's new this week related to my interests"
→ Same flow as Example 1
→ Automatically uses last 7 days as timeframe
```

## Topic Categories

Based on your TELOS, the skill searches these topic areas:

- **AI & Economy** - AI disruption, job market changes, economic transformation
- **Community Building** - Local resiliency, community initiatives, social connection
- **Sustainability** - Supply chains, energy systems, climate adaptation
- **Men's Development** - Rites of passage, mentorship, purpose
- **Predictions Tracking** - News validating or contradicting your predictions

## Output Format

Notion page organized as:
```
# Weekly TELOS News - [Date Range]

## AI & Economy
- [Article title](source URL) - Brief description
- [Article title](source URL) - Brief description

## Community Building
- [Article title](source URL) - Brief description

## Sustainability
- [Article title](source URL) - Brief description

[Additional sections as relevant]
```

---

**See:** `Workflows/Search.md` for the full search and posting workflow.
