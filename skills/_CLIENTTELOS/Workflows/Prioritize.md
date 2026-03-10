# Prioritize Workflow

Prioritize GitHub issues against client TELOS context.

## Trigger

- "prioritize tasks"
- "what should I work on"
- "rank issues"
- "prioritize [client-name]"

## Steps

### 1. Identify Client

- If client name provided in command, use it
- Otherwise, ask user which client to prioritize for
- Validate that client TELOS exists

### 2. Execute Prioritization Tool

Run the prioritization script:

```bash
bun ~/.claude/skills/ClientTelos/Tools/Prioritize.ts <client-name>
```

Optional flags:
- `--repo owner/repo` - Override GitHub repository from TELOS
- `--limit N` - Limit number of issues to fetch (default 50)

### 3. Display Results

The tool outputs:
- Ranked list of issues (highest score → lowest)
- Score for each issue (0-10)
- Visual score bar
- Strategic alignment explanation
- Impact dimension breakdown
- Rationale for each ranking

### 4. Get User Confirmation

Ask user:
```
These are the recommended priorities based on [CLIENT_NAME]'s TELOS.

Which issue would you like to start with?
1. Issue #42 (Score: 9.2)
2. Issue #19 (Score: 7.8)
3. Issue #37 (Score: 4.1)
[Custom issue number]
```

### 5. Optional: Start Work

If user selects an issue:
- Open issue in browser: `gh issue view <number> --web`
- Or begin implementation directly

## Example

```
User: "prioritize tasks for acme-corp"

PAI: 🎯 ClientTelos Prioritization
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Client: acme-corp
     Limit: 50 issues

     📖 Loading client TELOS...
        ✓ TELOS loaded (4521 chars)
        ✓ GitHub repo: acme/main-app

     📋 Fetching GitHub issues...
        ✓ Found 23 open issues

     🤖 Scoring issues against TELOS context...
        ✓ All issues scored

     📊 PRIORITIZED TASK LIST
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     1. [Score: 9.2/10] ██████████░
        Issue #42: Implement mobile authentication flow
        https://github.com/acme/main-app/issues/42

        Strategic Alignment: Directly serves G1 (mobile app launch by Q2) and P1 (auth flow)

        Impact Breakdown:
        • Strategic:  10.0/10 (40% weight)
        • User Value: 8.0/10 (30% weight)
        • Revenue:    9.0/10 (15% weight)
        • Risk:       7.0/10 (10% weight)
        • Priority:   10.0/10 (5% weight)

        Rationale:
        This issue is critical for G1 (mobile app launch). Addresses P1 which is blocking
        the launch. High revenue impact as mobile app is a key growth driver for Q2.

     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     [... more issues ...]

     ✅ Prioritization complete. Recommend starting with #42.

PAI: Which issue would you like to start with?
```

## Notes

- Prioritization is based on TELOS context at time of execution
- TELOS should be kept up to date for accurate prioritization
- Scores are relative to client's goals and priorities
- Update TELOS frequently (after calls, strategy changes, etc.)
