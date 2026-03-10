# Agent Job Registry

_Last updated: 2026-03-10 | Based on Brian Casel "jobs not tasks" framework_

A **job** = a recurring ownership role an agent holds on a schedule without you prompting.
A **task** = a one-off you kick off manually.

If you're pressing go every morning, you haven't delegated — you created a job for yourself.

---

## Active Jobs (running now)

| Job | Owner | Schedule | Skill | Output |
|-----|-------|----------|-------|--------|
| YouTube channel monitor | OpenClaw | Daily | F_YOUTUBE_MONITOR.ts | Slack digest, A/S videos only |
| Substack feed monitor | OpenClaw | Daily | F_SUBSTACK_MONITOR.ts | Slack digest |
| Gmail triage | OpenClaw | Continuous | gmail integration | Slack alerts for high-priority |
| Link → auto-summary | OpenClaw | On trigger | slack-ingest edge fn | Inline Slack summary |
| TELOS enrichment | PAI (launchd) | Hourly | EnrichPendingItems.ts | OpenBrain grades + scores |
| PAI session capture | Manual (for now) | After sessions | CaptureSession.ts | OpenBrain item |

---

## Missing Jobs — Category A: Things on your plate you want off it

Things you're currently initiating manually that should run without you:

| What | Who should own it | Frequency | Notes |
|------|------------------|-----------|-------|
| Weekly client update email | PAI (scheduled) | Weekly (Mon) | `_CLIENTWEEKLYUPDATE` skill exists, needs cron |
| PAI session → OpenBrain capture | PAI (SessionEnd hook) | Per session | ✅ Wired to SessionEnd hook 2026-03-10 |
| Instagram account monitoring | OpenClaw | Daily | `INSTAGRAM_MONITORING_PLAN.md` already written |
| GitHub activity → OpenBrain | PAI (launchd) | Daily | Brian's "code activity capture" — session logs + commits |

---

## Missing Jobs — Category B: Opportunities not getting done at all

Things that should be happening but aren't because there's no agent owning them:

| What | Who should own it | Frequency | Value |
|------|------------------|-----------|-------|
| Weekly OpenBrain synthesis | PAI/OpenClaw | Weekly | Surface patterns across captured items → Slack digest |
| Pre-session briefing | PAI | On PAI start | Pull relevant OpenBrain items + recent TELOS context before work session |
| Weekly TELOS progress check | PAI | Weekly (Sun) | Review goal progress, surface blockers, suggest next actions |
| Client prep digest | OpenClaw | Before each meeting | Pull recent GitHub, emails, notes for that client before calls |
| Content radar scan | OpenClaw | Daily | Brian's pattern: scan announcements from tracked people/companies |

---

## Prioritized Build Order

1. **Wire CaptureSession.ts to SessionEnd hook** — zero new code, 1 settings.json line
2. **Instagram monitoring** — plan written, needs implementation
3. **Weekly OpenBrain synthesis** — closes the "auto item_links + patterns" gap
4. **GitHub activity → OpenBrain** — daily code capture (Brian's pattern)
5. **Weekly client update cron** — skill exists, needs a launchd plist

---

## The Rule

> Design jobs, not tasks. If you're triggering it manually on a recurring basis, it should be a job.
> — Brian Casel

**Audit trigger:** When you catch yourself doing the same thing a second or third time, that's a job candidate.
