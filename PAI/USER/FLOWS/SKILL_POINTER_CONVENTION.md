# Skill Pointer Convention

_Inspired by Brian Casel's "thin task instructions" pattern — 2026-03-10_

## The Problem

Right now, Arbol flows contain all process logic inline. When you want to improve how YouTube monitoring works, you edit TypeScript in F_YOUTUBE_MONITOR.ts. The logic is buried in code, not improvable from a plain-language description.

Brian's insight: **the skill is the brain, the task is just the trigger.**

```
Current:  F_YOUTUBE_MONITOR.ts → [contains all logic]
Better:   F_YOUTUBE_MONITOR.ts → [points to skill] → skill defines the process
```

---

## The Convention

Every Arbol flow or action that has non-trivial process logic should declare its governing skill at the top of the file.

### In Flow/Action TypeScript files

Add a header comment block:

```typescript
/**
 * F_YOUTUBE_MONITOR — YouTube channel monitoring flow
 *
 * SKILL: ~/.claude/skills/ContentAnalysis/SKILL.md (YouTube monitoring section)
 *        OR
 * SKILL: ~/.claude/PAI/USER/FLOWS/skills/youtube-monitor.md (flow-specific process)
 *
 * To change how this flow works: improve the skill first, then update this implementation.
 */
```

### New flows: write the skill first

Before building a new Arbol flow, write a skill file that defines:
- What this job does and why
- The step-by-step process (in plain language)
- What a good output looks like
- Edge cases and error handling

Then the TypeScript implementation is just a runner for that process definition.

---

## Where Skill Files Live

| Scope | Location | Use for |
|-------|----------|---------|
| PAI-wide skills | `~/.claude/skills/{Category}/SKILL.md` | Processes used across PAI + OpenClaw |
| Flow-specific processes | `~/.claude/PAI/USER/FLOWS/skills/` | Process docs specific to a flow/job |
| Action process docs | `~/.claude/PAI/ACTIONS/{action}/PROCESS.md` | How a specific Arbol action works |

---

## Retroactive Skill Pointers (existing flows)

Existing flows mapped to their governing skill/process:

| Flow / Action | Governing Skill |
|---------------|----------------|
| F_YOUTUBE_MONITOR | `skills/ContentAnalysis/` (YouTube section) |
| F_SUBSTACK_MONITOR | `skills/ContentAnalysis/` (article section) |
| A_LABEL_AND_RATE | Inline prompt in action (self-contained) |
| CaptureSession.ts | `MEMORY/openclaw-openbrain-instructions.md` (capture spec) |
| EnrichPendingItems.ts | `PAI/USER/TELOS/GOALS.md` (TELOS scoring process) |

---

## The Improvement Loop

```
You notice output quality is off
  → Open the skill file (not the code)
  → Improve the plain-language process description
  → Update the TypeScript implementation to match
  → Next run is better
```

This is Brian's "working on your business = making your agents better" loop.
When you improve skills, you improve every job that uses them.

---

## Cross-Platform Portability

PAI SKILL.md files use the same format as Claude Code skills. This means:
- Skills you write for PAI work directly in Claude Code sessions
- Skills you develop through OpenClaw flows can be imported to PAI
- Process improvements compound across the whole stack

**Single source of truth:** The skill file. Not the TypeScript. Not the flow config.
