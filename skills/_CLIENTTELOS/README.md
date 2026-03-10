# ClientTelos Skill

**Automated client goal management and task prioritization system.**

## What is ClientTelos?

ClientTelos maintains a "TELOS file" for each client—capturing their strategic goals, priorities, constraints, and impact model. It then uses this context to automatically score and prioritize GitHub issues, so you always know what work matters most.

Think of it as a "company TELOS" for your consulting clients.

## Quick Start

### 1. Initialize a Client

```bash
/client-telos init
```

This will:
- Create client directory
- Generate TELOS template
- Prompt for initial context (mission, goals, priorities, GitHub repo)

### 2. Prioritize Tasks

```bash
/client-telos prioritize <client-name>
```

This will:
- Read client TELOS
- Fetch open GitHub issues
- Score each issue against TELOS context
- Return ranked task list with rationale

### 3. Update Client Context

Edit the TELOS file as you learn more:

```bash
open ~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/TELOS.md
```

Or use the update workflow:

```bash
/client-telos update <client-name>
```

## How It Works

### The TELOS File

Each client gets a TELOS.md file with:

```markdown
## Strategic Goals (Prioritized)
- G1: Most important goal (highest priority)
- G2: Second goal (half as important as G1)
- G3: Third goal (half as important as G2)

## Current Priorities (Time-Bound)
- P1: Top priority THIS quarter/month
- P2: Second priority
- P3: Third priority

## Technical Constraints
- Architecture decisions
- Tech debt to avoid
- Patterns to follow

## Impact Scoring Model
How to measure task value for THIS client
```

### Prioritization Algorithm

When you run `/client-telos prioritize`:

1. **Reads TELOS** - Loads goals, priorities, constraints
2. **Fetches Issues** - Gets open issues from GitHub
3. **Scores Each** - LLM analyzes against TELOS:
   - Strategic alignment (40% weight)
   - User value (30% weight)
   - Revenue impact (15% weight)
   - Risk reduction (10% weight)
   - Current priority match (5% weight)
4. **Ranks** - Highest score = most impactful
5. **Proposes** - Returns list with rationale
6. **You Approve** - Review before starting work

## File Locations

```
~/.claude/PAI/USER/BUSINESS/CLIENTS/
├── acme-corp/
│   ├── TELOS.md           # Main context file
│   ├── ACTIVITY.md        # Streaming activity log
│   ├── TRANSCRIPTS/       # Call transcripts
│   └── DOCUMENTS/         # Client documents
├── globex-inc/
│   ├── TELOS.md
│   └── ...
```

## Workflows

| Command | What It Does |
|---------|--------------|
| `/client-telos init` | Set up new client |
| `/client-telos prioritize <name>` | Rank GitHub issues |
| `/client-telos update <name>` | Update TELOS context |
| `/client-telos ingest <name> <transcript>` | Parse call transcript |
| `/client-telos review <name>` | Show client status |

## Tools

### Prioritize.ts

Core prioritization engine.

```bash
bun ~/.claude/skills/ClientTelos/Tools/Prioritize.ts acme-corp
```

Flags:
- `--repo owner/repo` - Override GitHub repo
- `--limit N` - Max issues to fetch (default 50)

## Example Output

```
📊 PRIORITIZED TASK LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. [Score: 9.2/10] ██████████░
   Issue #42: Implement mobile authentication flow
   https://github.com/acme/main-app/issues/42

   Strategic Alignment: Directly serves G1 (mobile launch) and P1 (auth flow)

   Impact Breakdown:
   • Strategic:  10.0/10 (40% weight)
   • User Value: 8.0/10 (30% weight)
   • Revenue:    9.0/10 (15% weight)
   • Risk:       7.0/10 (10% weight)
   • Priority:   10.0/10 (5% weight)

   Rationale:
   Critical for G1 (mobile app launch by Q2). Addresses P1 which is
   blocking the launch. High revenue impact as mobile app is a key
   growth driver.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## TELOS Activity Log Pattern

The Activity Log is a streaming update system inspired by corporate TELOS files.

**Key concept:** Updates in the activity log MODIFY the core TELOS context.

Example:
```markdown
## Activity Log

### 2025-02-05
- G1 updated: Mobile launch moved to Q3 due to API delays
- P1 now focuses on API stabilization instead of auth flow
- New risk added: R4 - Third-party API instability

### 2025-01-28
- Client meeting: Confirmed Q2 mobile launch target
- Added G4: Launch in Europe by Q4
```

When prioritizing, the AI considers:
1. The core TELOS sections (goals, priorities, etc.)
2. Recent activity log updates that modify that context

This creates a living document that evolves with the engagement.

## Multi-Client Support

The system handles N clients:

```bash
# List all clients
ls ~/.claude/PAI/USER/BUSINESS/CLIENTS/

# Prioritize different clients
bun Prioritize.ts acme-corp
bun Prioritize.ts globex-inc
bun Prioritize.ts initech-co
```

Each client's context is isolated.

## Integration

Works with:
- **GitHub CLI** (`gh`) - Fetches issues
- **PAI Inference** - Uses smart tier for scoring
- **Telos skill** - Personal TELOS for your own goals
- **Research skills** - Can research client context
- **Browser skill** - Can verify deployed work

## Best Practices

1. **Update TELOS frequently** - After every client call, strategy change, or priority shift
2. **Keep goals prioritized** - G1 > G2 > G3 (each half as important)
3. **Time-bound priorities** - Update P1/P2/P3 each sprint/month/quarter
4. **Activity log everything** - Log all context changes with dates
5. **Review before prioritizing** - Make sure TELOS reflects current reality

## Future Enhancements

Possible additions:
- Transcript auto-ingestion (watch folder, auto-parse)
- GitHub webhook integration (auto-reprioritize on new issues)
- Multi-repo support (aggregate issues across repos)
- Team assignment (auto-assign based on skills + priorities)
- Burndown tracking (measure velocity against priorities)

---

**ClientTelos: Always work on what matters most to your clients.**
