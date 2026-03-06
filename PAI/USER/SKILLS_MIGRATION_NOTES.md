# User-Defined Skills Migration Notes

These skills from the old PAI install (`~/code/miessler_PAI_v2/.claude/skills/CORE/USER/SKILLS/`) have NOT been migrated yet. They need canonicalization before moving to `~/.claude/skills/`.

## Personal Skills (Business-Specific)

| Old Name | New Name Convention | Notes |
|----------|--------------------|----|
| `ClientTelos` | `_CLIENTTELOS` | Reads henderson TELOS.md + Notion transcripts |
| `DiscoveryCall` | `_DISCOVERYCALL` | Discovery call scripts |
| `Notion` | `_NOTION` | Notion transcript fetching workflows |
| `TelosNews` | `_TELOSNEWS` | News search filtered by TELOS |
| `TimeBlocks` | `_TIMEBLOCKS` | Time block consolidation (has node_modules) |
| `TranscriptToIssues` | `_TRANSCRIPTTOISSUES` | Notion transcript → GitHub issues |

## Reference Skills (Potentially Shareable)

| Old Name | Notes |
|----------|-------|
| `find-skills` | Utility for discovering skills |
| `next-best-practices` | Next.js patterns reference |
| `supabase-postgres-best-practices` | Supabase/Postgres patterns |
| `vercel-react-best-practices` | Vercel/React patterns |

## Migration Steps (When Ready)

1. Copy skill directory to `~/.claude/skills/`
2. Rename personal skills: prefix with `_` and use ALLCAPS (e.g., `_CLIENTTELOS`)
3. Update any path references from `~/.claude/skills/CORE/USER/...` to `~/.claude/PAI/USER/...`
4. Canonicalize SKILL.md format (see `~/.claude/PAI/SKILLSYSTEM.md`)
5. Add `## Examples` section to each SKILL.md
6. Ensure `Tools/` directory exists
7. Test trigger phrases load correctly

## Source Location

`~/code/miessler_PAI_v2/.claude/skills/CORE/USER/SKILLS/`
