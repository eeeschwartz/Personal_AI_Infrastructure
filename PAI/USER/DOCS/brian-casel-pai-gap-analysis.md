# Brian Casel — PAI Gap Analysis

_Session: 2026-03-10 | Videos analyzed by ContentAnalysis agents_

## Source Videos

| # | Video | URL |
|---|-------|-----|
| 1 | How to Create JOBS for OpenClaw Agents | https://youtu.be/uUN1oy2PRHo |
| 2 | OpenClaw vs Claude for Running an Agent Team | https://youtu.be/E6lW2AXsT2Q |

Both from **Brian Casel** (buildermethods.com). Companion pieces. Both added to OpenBrain via Slack → OpenClaw capture (2026-03-10).

---

## Video 1 Summary: Jobs for OpenClaw Agents

**Thesis:** Stop chatting with agents and start hiring them. The shift from task delegation to job design is what makes an agent team actually scale.

**Three systems required:**
1. **Scheduling** — automated dispatch (his: custom Rails app BMHQ, not OpenClaw's built-in cron)
2. **Skills** — markdown process documentation (same pattern as Claude Code, Cursor, Codex)
3. **Output artifacts** — markdown files + custom viewer (Brainown) linked via Telegram

**Key distinction — Task vs Job:**
- Task = one-off execution you kick off manually
- Job = recurring ownership role an agent holds without you prompting
- If you're pressing go every morning, you haven't delegated — you created another job for yourself

**Two-category audit for finding agent jobs:**
1. Things you're currently doing that you want off your plate
2. Missed opportunities that aren't getting done at all

---

## Video 2 Summary: OpenClaw vs Claude for Running an Agent Team

**Thesis:** Skills are the durable portable unit; platforms are interchangeable runners.

**OpenClaw vs Claude distinction:**
- OpenClaw = autonomous delegation (agents own jobs, report back, run 24/7 on dedicated machine)
- Claude/Claude Code = deep collaboration (pairs with you, not a delegatee)
- Claude Co-work = scheduled tasks, but: requires your machine awake, silent failure = unreliable

**Infrastructure model:**
- Dedicated Mac Mini (not his daily driver) running agents 24/7
- Dropbox as shared filesystem: syncs skills + memory across all machines including agent machine
- Skills are symlinked into Dropbox so he edits from any machine
- Telegram for personal agent reporting; Slack is team-facing

---

## Gap Analysis: Ideas vs Current PAI/OpenClaw/OpenBrain

### GAP 1: Job vs Task ontology — HIGH impact, LOW build effort
**Brian's idea:** Explicit "job registry" — agents own recurring roles, not just run tasks. Jobs have: owner agent, skill pointer, schedule, output artifact type.
**Current state:** OpenClaw runs flows (YouTube monitor, Substack monitor, Gmail triage) but these aren't framed as agent-owned jobs. There's no job registry.
**What's missing:** A `jobs.json` or `AGENT_JOBS.md` that maps recurring responsibilities to agents, with skill pointers and output expectations.
**Implementation:** Low-effort documentation/config. Arbol flows already approximate this — just needs explicit framing and registration.

### GAP 2: Thin task instructions → PAI skill pointer — HIGH impact, MEDIUM effort
**Brian's idea:** Task instructions = `"read skill X and run it"`. The skill holds all process detail. Tasks are schedulers, skills are brains.
**Current state:** Arbol F_/P_/A_ pipeline has standalone inline logic. OpenClaw flows (F_YOUTUBE_MONITOR, etc.) don't reference PAI SKILL.md files — they contain process logic directly.
**What's missing:** A convention for Arbol actions/pipelines to reference PAI skills as their process definition. The skill becomes the source of truth across PAI + OpenClaw.
**Implementation:** Medium effort — needs a skill-loading mechanism in Arbol actions, or a pattern where A_* workers call PAI skill logic.

### GAP 3: PAI session artifacts → OpenBrain — HIGH impact, MEDIUM effort
**Brian's idea:** Code activity capture agent: pulls GitHub activity + IDE session logs into the brain on a schedule.
**Current state:** PAI Algorithm sessions write PRDs + reflections to `MEMORY/WORK/` and `MEMORY/LEARNING/`. These are NOT flowing into OpenBrain. This is listed as one of the 5 known missing pieces.
**What's missing:** An Arbol flow (`F_PAI_SESSIONS`) that reads new MEMORY/WORK/ PRDs and calls OpenBrain `capture_item` on them. + A GitHub activity aggregator.
**Implementation:** Medium effort — needs F_PAI_SESSIONS flow + OpenBrain write access from Arbol.

### GAP 4: Agent output as first-class OpenBrain nodes — HIGH impact, HIGH effort
**Brian's idea:** Agent outputs = markdown files. Telegram links open them in Brainown. Artifacts are the primary output, not chat messages.
**Current state:** OpenClaw delivers Slack notifications with summaries. The underlying artifact (markdown) isn't surfaced as a linkable, reviewable item.
**What's missing:** OpenBrain items surfaced as linkable URLs. An OpenBrain read endpoint that returns a rendered markdown view. Mobile-accessible via Slack/Telegram link.
**Implementation:** High effort — needs OpenBrain read/render endpoint + mobile-friendly viewer. Notion could proxy this cheaply (OpenBrain → Notion sync already exists via sync.py).

### GAP 5: Dedicated always-on machine for agent workloads — MEDIUM impact, MEDIUM effort
**Brian's idea:** Mac Mini dedicated to agents. Not his daily driver. Always on. Separate OS user for security.
**Current state:** Unknown if OpenClaw runs on dedicated machine or Erik's primary machine.
**What's missing:** Dedicated hardware commitment for OpenClaw + Arbol workers.
**Implementation:** Hardware decision. If already on dedicated machine, just needs verification.

### GAP 6: Explicit agent job audit — MEDIUM impact, LOW effort
**Brian's idea:** Two-category audit: (1) things on your plate you want off it, (2) missed opportunities not getting done.
**Current state:** OpenClaw does Gmail, YouTube, Substack, link capture. No formal job inventory.
**What's missing:** A session where Erik runs the audit and outputs a job registry.
**Implementation:** One PAI session to run the audit. No code.

### GAP 7: Cross-platform skill standardization — MEDIUM impact, LOW effort
**Brian's idea:** Same skill format (markdown) works in OpenClaw, Claude Code, Cursor, Codex. Your process library is platform-portable.
**Current state:** PAI skills are SKILL.md format but only wired into Claude Code. Not referenced from OpenClaw agents.
**What's missing:** A convention doc that says "when building OpenClaw flows, reference ~/.claude/skills/X/SKILL.md as the process definition."
**Implementation:** Documentation + one test flow that does this.

---

## Top 3 Priority Gaps

| # | Gap | Why Now |
|---|-----|---------|
| **1** | PAI sessions → OpenBrain (Gap 3) | Already identified as missing piece #5. Brian's video confirms the pattern works. Closes the knowledge compounding loop. |
| **2** | Job vs Task audit (Gap 6) | Zero-build-effort strategic clarity. Run the audit in one session, get an agent team with actual job ownership. |
| **3** | Thin task → skill pointer convention (Gap 2) | Makes PAI skills the single source of truth. All future OpenClaw work benefits. Low-hanging architectural alignment. |

---

## Brian's Infrastructure Blueprint (for reference)

```
Mac Mini (dedicated, always-on)
  └── OpenClaw (separate OS user, scoped Dropbox access)
  └── BMHQ (custom Rails app — task board + cron dispatcher)
        └── dispatches to OpenClaw Gateway API
        └── agents report back via Telegram → link to markdown file
  └── Dropbox (shared filesystem — skills, brain, configs)
        └── Skills: folders with .md + optional scripts
        └── Brain: markdown files as canonical business record

Daily Mac / Mobile
  └── Brainown (custom markdown viewer, Dropbox sync)
  └── Telegram (agent reporting channel)
  └── Claude Code (skill iteration + deep work)
```

---

## Cross-Reference: Known OpenBrain Missing Pieces vs These Gaps

| Missing Piece | Brian's Gap |
|---|---|
| TELOS scoring on capture | Not in these videos |
| Auto item_links (similarity + LLM) | Partially: Gap 4 (artifacts as nodes) |
| Weekly synthesis job | Not in these videos |
| OpenClaw `get_telos_digest` MCP tool | Not in these videos |
| **PAI Research → OpenBrain save** | **Gap 3 — direct hit** |
