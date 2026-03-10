# Instagram Monitoring — Implementation Plan

## Why Instagram Is Different

YouTube and Substack have native RSS. Instagram has none. Their official APIs (Basic Display API, Graph API) require Facebook Business verification and are increasingly restricted. The practical options are:

| Option | Reliability | Cost | Effort |
|--------|------------|------|--------|
| **Apify** | High | ~$0.05–0.20/run | Low |
| RSS bridge services (Picuki, etc.) | Low — breaks constantly | Free | Medium |
| Web scraping directly | Very low — blocked | Free | High |
| Official Graph API | High | Free | Very high (business verification) |

**Recommendation: Apify.** PAI already has an Apify key. The `apify/instagram-scraper` actor is maintained, handles auth/anti-bot, and returns clean JSON.

---

## What Apify Returns Per Post

```json
{
  "id": "abc123",
  "shortCode": "CxyzABC",
  "url": "https://www.instagram.com/p/CxyzABC/",
  "caption": "Full caption text...",
  "timestamp": "2026-03-10T12:00:00.000Z",
  "likesCount": 4521,
  "commentsCount": 83,
  "displayUrl": "https://...",
  "ownerUsername": "username",
  "ownerFullName": "Full Name",
  "type": "Image" | "Video" | "Sidecar"
}
```

The `caption` field is the content. It flows into `A_LABEL_AND_RATE` as the `content` field — no new action needed for that step.

---

## Actions To Build

### `A_FETCH_INSTAGRAM_FEED`

**What it does:** Calls Apify's `apify/instagram-scraper` actor for each configured account, returns new posts not seen before.

**Input:**
```json
{
  "usernames": ["username1", "username2"],
  "seen_file": "~/.claude/PAI/USER/FLOWS/instagram-seen.json",
  "max_per_account": 5
}
```

**Output:** Array of post items with `{url, post_id, caption, owner_username, timestamp, likes_count, type}`

**Apify call pattern:**
```typescript
// Run actor synchronously (waits for result)
POST https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items
Authorization: Bearer APIFY_TOKEN
{
  "usernames": ["username"],
  "resultsLimit": 10,
  "scrapeType": "posts"
}
```

**Env var needed:** `APIFY_TOKEN` in `~/.config/PAI/.env`

---

## Pipeline

```yaml
# P_INSTAGRAM_POST.yaml
name: P_INSTAGRAM_POST
actions:
  - A_LABEL_AND_RATE   # caption → content field, works as-is
```

That's it. `A_LABEL_AND_RATE` already accepts a `content` field. Instagram captions ARE the content.

---

## Flow

```
F_INSTAGRAM_MONITOR.ts
  ↓
A_FETCH_INSTAGRAM_FEED  → [{url, post_id, caption as content, owner_username, ...}]
  ↓ for each new post
A_LABEL_AND_RATE        → labels, rating, summary, bullet_points
  ↓
sendSlackDigest()       → same Slack helper, source: "Instagram"
```

Config file: `instagram-accounts.json`
```json
{
  "usernames": ["natebbjones", "thegreatsimplification"],
  "max_per_account": 5,
  "seen_file": "/Users/erikschwartz/.claude/PAI/USER/FLOWS/instagram-seen.json"
}
```

---

## One Wrinkle: Private Accounts / Login

Apify's Instagram scraper can scrape public accounts without auth. For accounts you follow that are private, you need to pass your Instagram session cookie (`sessionid`) to Apify.

**If needed:**
1. Browser → `instagram.com` → DevTools → Cookies → copy `sessionid`
2. Add to env: `INSTAGRAM_SESSION_ID=...`
3. Pass it in the Apify actor input as `sessionCookies: [{name: "sessionid", value: "..."}]`

Most accounts you'd want to monitor are public, so start without it.

---

## Apify Cost Estimate

Instagram scraper charges ~$0.10–0.20 per 1,000 results on Apify's pay-per-use tier.

At 10 accounts × 5 posts × 4 runs/day = 200 posts/day = ~$0.04/day = ~$1.20/month.

The $5 free monthly credit covers it entirely.

---

## What To Tell Claude When Implementing

> "Build Instagram monitoring for PAI using the same pipe model as YouTube/Substack.
> Reference INSTAGRAM_MONITORING_PLAN.md in PAI/USER/FLOWS/.
> Actions needed: A_FETCH_INSTAGRAM_FEED (uses Apify apify/instagram-scraper actor).
> Pipeline: P_INSTAGRAM_POST.yaml = [A_LABEL_AND_RATE].
> Flow: F_INSTAGRAM_MONITOR.ts using same pattern as F_SUBSTACK_MONITOR.ts.
> Config: instagram-accounts.json.
> Slack notifications via existing sendSlackDigest() helper."
