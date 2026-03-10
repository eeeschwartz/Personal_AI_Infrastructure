---
name: ClientTelos
description: Client goal management and task prioritization. USE WHEN client TELOS, client goals, prioritize tasks, client context. SkillSearch('clienttelos') for docs.
---

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the ClientTelos skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **ClientTelos** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# ClientTelos

ClientTelos is a system for maintaining persistent client context and using it to automatically prioritize work. It's like a TELOS file but for clients—capturing their goals, priorities, constraints, and using that to rank GitHub issues by impact.

## Core Concept

**The Problem:** You have GitHub issues, but which ones matter most to the client RIGHT NOW?

**The Solution:** Maintain a "Client TELOS" file that captures:
- Strategic goals (what they're trying to achieve)
- Current priorities (what matters THIS quarter/month)
- Technical constraints (architecture decisions, patterns to follow/avoid)
- Impact scoring model (how to measure task value)

Then use AI to score each GitHub issue against this context and propose a prioritized task list.

## System Architecture

```
Input Sources          Client TELOS File         GitHub Tasks           Prioritized Output
───────────────       ─────────────────         ────────────           ─────────────────
│ Call transcripts │   │ Strategic goals  │       │ Issue #42 │          │ 1. Issue #42 │
│ Questionnaires  │ → │ Current priorities│   →   │ Issue #37 │    →     │ 2. Issue #19 │
│ Client docs     │   │ Tech constraints │       │ Issue #19 │          │ 3. Issue #37 │
                       │ Impact model     │
```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Init** | "initialize client", "create client TELOS", "new client" | `Workflows/Init.md` |
| **Update** | "update client TELOS", "add to client context", "update goals" | `Workflows/Update.md` |
| **Prioritize** | "prioritize tasks", "what should I work on", "rank issues" | `Workflows/Prioritize.md` |
| **Ingest** | "parse transcript", "add transcript", "ingest call notes" | `Workflows/Ingest.md` |
| **Review** | "review TELOS", "show client context", "client status" | `Workflows/Review.md` |

## Location

**Client TELOS files are stored at:**
```
~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/
├── TELOS.md              # Main TELOS file
├── ACTIVITY.md           # Streaming activity log
├── TRANSCRIPTS/          # Call transcripts
└── DOCUMENTS/            # Client documents
```

## Client TELOS File Structure

Based on the SPQA (State, Policy, Quality, Activity) pattern, inspired by corporate TELOS files.

### Required Sections

1. **Client Overview**
   - Company name and context
   - Your relationship and engagement scope
   - History of work together

2. **Client Mission**
   - What is the client trying to achieve overall?
   - Why does this matter to them?

3. **Strategic Goals** (Prioritized)
   - G1: Most important goal
   - G2: Second most important (half as important as G1)
   - G3: Third most important (half as important as G2)
   - ...etc

4. **Current Priorities** (Time-Bound)
   - P1: What matters most THIS quarter/month/sprint
   - P2: Next priority
   - Clear ranking, updated frequently

5. **Technical Constraints**
   - Architecture decisions to follow
   - Tech debt to avoid
   - Patterns and conventions
   - Security/compliance requirements

6. **Impact Scoring Model**
   - How to measure task value for THIS client
   - Example: User value, revenue impact, risk reduction, strategic alignment

7. **KPIs (Key Performance Indicators)**
   - How you measure success with this client
   - Example: Deployment frequency, bug count, feature velocity

8. **Risk Register**
   - What could go wrong?
   - Current blockers or concerns

9. **Team Context**
   - Key stakeholders
   - Decision makers
   - Technical team structure

10. **Activity Log**
    - Streaming updates (newest first)
    - Date + what changed
    - Modifies core content dynamically

## Prioritization Algorithm

When prioritizing GitHub issues, the system:

1. **Reads Client TELOS** - Loads goals, priorities, constraints, scoring model
2. **Fetches GitHub Issues** - Gets open issues from configured repo(s)
3. **Scores Each Issue** - LLM analyzes each issue against TELOS context:
   - Strategic alignment (does this serve G1, G2, G3?)
   - Current priority match (does this address P1, P2?)
   - Impact scoring (user value, revenue, risk, strategic)
   - Technical fit (follows constraints, reduces debt)
   - Urgency (blockers, dependencies)
4. **Ranks by Score** - Highest score = most impactful work right now
5. **Proposes List** - Returns ranked task list with rationale for each
6. **Human Approval** - You review and approve before execution

## Usage Examples

**Example 1: Initialize new client**
```
User: "initialize client TELOS for Acme Corp"
→ Invokes Init workflow
→ Creates ~/.claude/PAI/USER/BUSINESS/CLIENTS/acme-corp/ directory
→ Generates TELOS.md template
→ Prompts for initial context (mission, goals, priorities)
```

**Example 2: Update client context**
```
User: "update Acme Corp TELOS: G1 is now to launch mobile app by Q2"
→ Invokes Update workflow
→ Creates timestamped backup
→ Updates G1 in TELOS.md
→ Logs change in ACTIVITY.md with timestamp
```

**Example 3: Prioritize tasks**
```
User: "prioritize Acme Corp tasks"
→ Invokes Prioritize workflow
→ Reads ~/.claude/PAI/USER/BUSINESS/CLIENTS/acme-corp/TELOS.md
→ Fetches open issues from GitHub (via gh CLI)
→ Scores each issue against TELOS context
→ Returns ranked list:
   1. Issue #42 - Mobile auth flow (Score: 9.2/10 - directly serves G1)
   2. Issue #19 - API performance (Score: 7.8/10 - serves P2, high impact)
   3. Issue #37 - Dark mode toggle (Score: 4.1/10 - nice-to-have, low priority)
```

**Example 4: Ingest call transcript**
```
User: "parse this transcript and update Acme Corp TELOS"
→ Invokes Ingest workflow
→ LLM analyzes transcript for:
   - New goals mentioned
   - Priority shifts
   - New constraints or context
   - Action items
→ Updates TELOS.md sections
→ Logs changes in ACTIVITY.md
→ Saves transcript to TRANSCRIPTS/ directory
```

**Example 5: Review client status**
```
User: "show me Acme Corp status"
→ Invokes Review workflow
→ Displays:
   - Current goals and progress
   - Recent activity (last 10 entries from ACTIVITY.md)
   - Next priorities
   - Open risks
   - Key metrics
```

## Tools

### Prioritize.ts

Located at `Tools/Prioritize.ts`, this script:
- Reads client TELOS file
- Fetches GitHub issues via `gh` CLI
- Uses LLM to score each issue against TELOS context
- Returns ranked list with scores and rationale

**Usage:**
```bash
bun ~/.claude/skills/ClientTelos/Tools/Prioritize.ts <client-name> [--repo owner/repo]
```

### Ingest.ts

Located at `Tools/Ingest.ts`, this script:
- Takes transcript text as input
- Extracts goals, priorities, constraints, action items
- Updates TELOS.md sections
- Logs changes to ACTIVITY.md

**Usage:**
```bash
bun ~/.claude/skills/ClientTelos/Tools/Ingest.ts <client-name> <transcript-file>
```

## Templates

### TELOS.md Template

Located at `Templates/TELOS.md`, this provides the structure for new client TELOS files.

## Configuration

**GitHub Repository:**
- Default: Configured in client TELOS file (field: `github_repo`)
- Override: Pass `--repo` flag to Prioritize.ts
- Multiple repos: List in TELOS.md, separated by commas

**LLM Model:**
- Uses PAI's inference system (`Tools/Inference.ts`)
- Defaults to "smart" tier (Opus 4.5) for prioritization
- Uses "fast" tier (Haiku) for transcript parsing

## Multi-Client Support

The system is designed to scale from 1 → N clients:
- Each client gets their own directory
- TELOS files are isolated
- Prioritization is per-client
- Activity logs are separate

**Switching clients:**
```bash
# List all clients
ls ~/.claude/PAI/USER/BUSINESS/CLIENTS/

# Prioritize for specific client
bun ~/.claude/skills/ClientTelos/Tools/Prioritize.ts acme-corp
bun ~/.claude/skills/ClientTelos/Tools/Prioritize.ts globex-inc
```

## Integration with PAI

ClientTelos integrates with:
- **Telos skill** - Personal TELOS for your own goals
- **GitHub CLI** - Fetches issues, PRs, discussions
- **Research skills** - Can research client industry/competitors
- **Browser skill** - Can verify web-based client work
- **Voice notifications** - Announces workflow execution

## Security & Privacy

**Sensitive Data:**
- Client TELOS files may contain confidential information
- Never commit to public repos
- Use `.gitignore` to exclude `USER/CLIENTS/`
- Backup before updates (automatic in workflows)

**Best Practices:**
- Don't share client TELOS files without permission
- Redact sensitive info when creating examples
- Use generic placeholders in documentation

## Key Principles

1. **Goal-Driven Prioritization** - Tasks ranked by strategic alignment, not urgency
2. **Persistent Context** - TELOS file captures what matters, doesn't get stale
3. **Activity Log Pattern** - Streaming updates modify core context dynamically
4. **Weighted Goals** - Each goal is half as important as the one before it
5. **Human-in-the-Loop** - AI proposes, human approves before execution
6. **Multi-Client Ready** - Designed to scale from 1 to N clients
7. **Privacy-Aware** - Respects client confidentiality

---

**ClientTelos helps you work on what matters most to your clients, automatically.**
