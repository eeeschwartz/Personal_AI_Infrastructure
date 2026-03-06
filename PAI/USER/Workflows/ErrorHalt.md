# Error Halt Workflow

**Purpose:** Prevent token waste by halting execution immediately when permission/sandbox errors occur.

**Impact:** Saves ~11,600 tokens per permission error failure. Prevents 6 observed failure patterns (Jan-Feb 2026).

---

## Trigger Conditions

Execute this workflow when **ANY** of these occur:

1. **Exit code > 0** from any Bash command
2. **Error message contains:**
   - "operation not permitted"
   - "permission denied"
   - "EACCES"
   - "EPERM"
   - "zsh:1: operation not permitted"
   - "/tmp/claude-501/cwd-" (sandbox path errors)

3. **Repeated identical errors** (same error 2+ times in a row)

---

## Workflow Steps

### 1. Detect Error

When tool result shows exit code > 0:

```
Exit code 1
zsh:1: operation not permitted: /tmp/claude-501/cwd-xxxx
```

**→ STOP IMMEDIATELY. Do not continue to next phase.**

---

### 2. Classify Error Type

| Error Pattern | Classification | Action |
|---------------|----------------|--------|
| "operation not permitted" + "/tmp/claude-501/" | **SANDBOX ERROR** | Halt + Report |
| "permission denied" | **PERMISSION ERROR** | Halt + Report |
| "EACCES" / "EPERM" | **PERMISSION ERROR** | Halt + Report |
| Exit code 1 without error message | **UNKNOWN** | Capture output + Halt |

---

### 3. Halt Execution

**CRITICAL: Do NOT proceed to next ISC criterion or phase.**

In ISC tracker, mark current criterion as:

```
│ X │ [Current criterion]                │ ❌ FAILED       │ ERROR HALT     │
```

Update status immediately:

```
🎯 ISC UPDATE ═════════════════════════════════════════════════════════════════
│ # │ Criterion                          │ Status          │ Δ              │
├───┼────────────────────────────────────┼─────────────────┼────────────────┤
│ 3 │ Build succeeds without errors      │ ❌ FAILED       │ ERROR HALT     │
└───┴────────────────────────────────────┴─────────────────┴────────────────┘

⚠️ EXECUTION HALTED: Permission error detected
```

---

### 4. Report to User

**Template:**

```
━━━ 🚨  ERROR HALT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Execution stopped to prevent token waste.**

**Error Type:** [SANDBOX ERROR | PERMISSION ERROR | UNKNOWN]

**Error Message:**
```
[Full error output]
```

**Context:**
- Command: `[command that failed]`
- Exit code: [X]
- Phase: [OBSERVE | THINK | PLAN | BUILD | EXECUTE | VERIFY | LEARN]
- ISC criterion: [criterion text]

**Why stopped:**
This error pattern has caused 6 failures in Jan-Feb 2026, wasting ~11,600 tokens per occurrence. Halting now prevents token burn.

**Next steps:**
1. Check sandbox settings: `/sandbox`
2. Verify command needs `dangerouslyDisableSandbox: true`
3. Or use alternative tool that doesn't require sandbox bypass

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 5. Do NOT Claim Success

**NEVER** mark criteria as ✅ VERIFIED if error occurred, even if:
- Previous step succeeded
- Output looks correct
- You "think" it worked despite error

**Example of WRONG behavior:**

```
Exit code 1
zsh:1: operation not permitted: /tmp/claude-501/cwd-2ff5

[main 8e308a1] fix: add null check
 1 file changed, 6 insertions(+)

━━━ ✅  V E R I F Y ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ 2 │ Build completes successfully       │ ✅ VERIFIED     │  ❌ WRONG!
```

**Correct behavior:**

```
Exit code 1
zsh:1: operation not permitted: /tmp/claude-501/cwd-2ff5

━━━ 🚨  ERROR HALT ━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ 2 │ Build completes successfully       │ ❌ FAILED       │ ERROR HALT
```

---

## Integration with ISC

Add this anti-criterion to EVERY task's ISC:

```
├───┴────────────────────────────────────┴─────────────────┴────────────────┤
│ ⚠️ ANTI-CRITERIA                                                          │
├───┬────────────────────────────────────┬─────────────────────────────────┤
│ ! │ No permission errors ignored during execution     │ 👀 WATCHING     │
└───┴────────────────────────────────────┴─────────────────────────────────┘
```

Verify in VERIFY phase:

```
├───┴────────────────────────────────────┴─────────────────┴────────────────┤
│ ⚠️ ANTI-CRITERIA CHECK                                                    │
├───┬────────────────────────────────────┬─────────────────────────────────┤
│ ! │ No permission errors ignored       │ ✅ AVOIDED - 0 errors ignored   │
└───┴────────────────────────────────────┴─────────────────────────────────┘
```

---

## Examples from Real Failures

### Example 1: 2026-02-02-085259 (116 tool calls)

**What happened:**
- Permission error on tool call 15
- PAI continued execution
- Made 101 MORE tool calls
- Claimed success
- Rating: 3/10

**What should happen with ErrorHalt:**
- Permission error on tool call 15
- **HALT immediately**
- Report error to user
- Save 101 tool calls (~10,100 tokens)

---

### Example 2: 2026-01-29-110805 (18 tool calls)

**What happened:**
```
Exit code 1
zsh:3: operation not permitted: /tmp/claude-501/cwd-2ff5

[Continued to VERIFY phase]
│ 2 │ TypeScript build completes successfully │ ✅ VERIFIED │  ❌ WRONG
```

**What should happen with ErrorHalt:**
```
Exit code 1
zsh:3: operation not permitted: /tmp/claude-501/cwd-2ff5

━━━ 🚨  ERROR HALT ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Execution stopped. Sandbox permission error detected.
```

---

## Monitoring

Track ErrorHalt invocations in MEMORY:

```
~/.claude/MEMORY/WORK/error-halts.jsonl
```

Log each halt:
```json
{
  "timestamp": "2026-02-03T18:00:00Z",
  "error_type": "SANDBOX_ERROR",
  "command": "git push origin main",
  "exit_code": 1,
  "phase": "EXECUTE",
  "tokens_saved_estimate": 11600
}
```

---

**Document Status:** Active workflow - reference during EXECUTE phase
**Created:** 2026-02-03
**Impact:** Prevents 6 known failure patterns, saves ~69,600 tokens/month
