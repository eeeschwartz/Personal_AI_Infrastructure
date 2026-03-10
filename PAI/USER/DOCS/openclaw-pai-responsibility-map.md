# OpenClaw ↔ PAI Responsibility Map

_Last updated: 2026-03-10_

## Mental Model

```
OpenClaw → ambient layer (always watching, messaging surfaces)
PAI      → deep work layer (you invoke it, terminal, complex tasks)
```

**OpenClaw** = ambient, always-on, messaging-native intelligence
**PAI** = on-demand, deep-work, terminal intelligence

---

## Responsibility Map

| Domain | Owner | Notes |
|---|---|---|
| Gmail triage | OpenClaw | Async, background, already wired |
| ParentSquare / school alerts | OpenClaw | Notification class |
| Calendar checks | OpenClaw | Heartbeat polling |
| Slack DM responses | OpenClaw | Lives in the messaging surface |
| YouTube new video alerts | OpenClaw | Proactive monitoring |
| Link → auto-summary (Slack) | OpenClaw | Ambient inbox flow |
| Notion KB ingestion | OpenClaw | sync.py already handles this |
| Engineering / code | PAI | Algorithm mode, skills, worktrees |
| Deep research | PAI | Multi-agent Research skill |
| TELOS / life OS | PAI | Telos skill, project tracking |
| Client work | PAI | _CLIENTTELOS, _CLIENTWEEKLYUPDATE |
| Content creation | PAI | Media, writing, analysis |
| Deep content analysis | PAI | You explicitly request a dive |

---

## Overlap Zones

### Content Extraction
- **OpenClaw** = auto-triggered (link dropped in Slack → ExtractWisdom → post summary)
- **PAI** = explicit deep dive (you ask for analysis in a session)
- Rule: OpenClaw owns the ambient inbox flow. PAI goes deeper when you ask.

### Memory / Context
- **OpenClaw memory** = messaging history, integration state, social context
- **PAI memory** = work sessions, project decisions, engineering history
- Scoped differently — no consolidation needed.
- Handoff option: OpenClaw can write summaries to a shared Notion page or file that PAI reads for cross-context continuity.

### Notion KB
- OpenClaw *writes* (link ingestion, wisdom extraction)
- PAI *reads + reasons* (Research skill, _NOTION skill queries)

---

## Decision Rules

1. **Is it async / notification-class / messaging-surface?** → OpenClaw
2. **Are you in the terminal, starting a work session?** → PAI
3. **Is it "watch for X and tell me"?** → OpenClaw
4. **Is it "analyze X deeply" or "build Y"?** → PAI
5. **Don't ask PAI to check Gmail** — that's OpenClaw's job. Route it through Slack/WhatsApp.

---

## OpenBrain Integration

OpenBrain (eeeschwartz/openbrain) is the **third pillar** — the persistent knowledge graph.

| System | Role |
|---|---|
| OpenBrain | The brain — stores, scores, connects, synthesizes |
| OpenClaw | The senses + voice — captures from world, speaks back via Slack |
| PAI | The hands + deep mind — executes, researches, writes findings back |

**OpenBrain MCP is now wired into PAI directly** — full key (capture, search, list, stats).
`bun ~/.claude/PAI/USER/Tools/CaptureSession.ts` to capture a session. `--all` for bulk backfill.

**Remaining missing pieces:**
1. TELOS scoring on capture ✅ (EnrichPendingItems.ts runs on schedule)
2. Auto item_links (similarity + LLM to connect related items)
3. Weekly synthesis job (patterns across items → Slack via OpenClaw)
4. OpenClaw `get_telos_digest` MCP tool (read path from OpenBrain)
5. PAI Research → OpenBrain save ✅ (CaptureSession.ts — 2026-03-10)

## References

- OpenClaw config: https://github.com/eds-openclaw/openclaw-config
- OpenBrain: https://github.com/eeeschwartz/openbrain
- PAI memory: `~/.claude/MEMORY/`
- PAI skills: `~/.claude/skills/`
