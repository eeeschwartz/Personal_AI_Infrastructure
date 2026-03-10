# OpenClaw → OpenBrain Pipeline Instructions

_Last updated: 2026-03-10_

## What You Do (OpenClaw)

You are the **capture layer**. Your job when you receive a link (via Slack DM or elsewhere):

1. Fetch and process the content as you already do
2. Run quality grading (content_grade, content_rating, content_labels) as you already do
3. Call `capture_item` on the OpenBrain MCP with all fields you have

That's it. You do NOT score against TELOS goals. You do not have access to them and should not attempt it.

## What You Do NOT Do

- Do not attempt TELOS relevance scoring — PAI handles this separately
- Do not set `metadata.telos_scored` — leave metadata as-is
- Do not wait for PAI enrichment before confirming capture to the user

## The capture_item call

Call exactly as before. The MCP handles:
- Embedding generation
- Entity extraction
- Chunking long content
- Deduplication

Your grading fields (content_grade, content_rating, etc.) are still valuable — pass them.

## What happens after you capture

PAI runs a periodic enrichment job (`EnrichPendingItems.ts`) that:
- Queries for items where `metadata->>'telos_scored'` is NULL
- Scores each against Erik's TELOS goals (which only PAI has access to)
- Writes `telos_relevance` scores back to OpenBrain

You don't need to trigger this — it runs on its own schedule.

## Summary

**Your role:** Dumb capture with quality grading. Fast, no TELOS.
**PAI's role:** TELOS scoring, cross-item linking, synthesis. Scheduled, private.
