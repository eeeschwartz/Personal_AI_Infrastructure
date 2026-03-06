# FetchGitHub.ts — Help

Fetch merged PRs from the Henderson GitHub repository for use in weekly client updates.

## Usage

```bash
bun ~/.claude/skills/ClientWeeklyUpdate/Tools/FetchGitHub.ts [options]
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--repo <owner/repo>` | `eeeschwartz/aaa-henderson-pm-email-agent` | GitHub repository |
| `--days <n>` | `7` | Days to look back |
| `--help` | — | Show help |

## Requirements

- `gh` CLI installed and authenticated (`gh auth status`)

## Output

Prints human-readable summary, then a `--- JSON OUTPUT ---` block with:
```json
{
  "prs": [{ "number": 268, "title": "...", "mergedAt": "...", "author": "...", "body": "..." }],
  "count": 5,
  "repo": "eeeschwartz/aaa-henderson-pm-email-agent",
  "days": 7
}
```

## Error Handling

- Exits with code 1 and helpful message if `gh` is not authenticated
- Exits with code 1 if the GitHub API call fails
