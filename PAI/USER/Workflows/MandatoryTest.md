# Mandatory Test Workflow

**Purpose:** Prevent claiming build success without running tests. Block VERIFY phase until tests pass.

**Impact:** Saves ~18,800 tokens per untested build failure. Prevents 4 observed failure patterns (Jan-Feb 2026).

---

## Trigger Conditions

Execute this workflow when **ANY** of these occur:

1. **Build command succeeds:**
   - `npm run build`
   - `next build`
   - `tsc`
   - `cargo build`
   - Any compilation step

2. **Code changes committed** without test run

3. **User says "you test"** (indicates PAI skipped tests)

---

## Core Principle

**YOU CANNOT CLAIM BUILD SUCCESS WITHOUT RUNNING TESTS.**

Even if:
- Build compiles without errors ✓
- TypeScript types are correct ✓
- Linter passes ✓

**None of these prove functionality works.**

---

## Workflow Steps

### 1. After Build Success

When build succeeds, **IMMEDIATELY** add this ISC criterion:

```
🎯 ISC UPDATE ═════════════════════════════════════════════════════════════════
│ # │ Criterion                          │ Status          │ Δ              │
├───┼────────────────────────────────────┼─────────────────┼────────────────┤
│ 2 │ Build completes without errors     │ ✅ VERIFIED     │ ▲ VERIFIED     │
│ 3 │ All tests pass after build completion │ 🔄 IN_PROGRESS  │ ★ ADDED        │
└───┴────────────────────────────────────┴─────────────────┴────────────────┘
```

**Do NOT proceed to VERIFY phase until criterion 3 is ✅ VERIFIED.**

---

### 2. Determine Test Command

Check for test scripts:

```bash
# Check package.json
jq -r '.scripts | to_entries[] | select(.key | contains("test")) | .key + ": " + .value' package.json

# Common patterns
- npm test
- npm run test
- jest
- vitest
- pytest
- cargo test
```

If tests exist, run them. If no tests exist, ask user:

```
🤖 No test script found. Should I:
  A) Proceed without tests (not recommended)
  B) Wait for you to add tests
  C) Create basic smoke tests
```

---

### 3. Run Tests

Execute test command and capture **full output**:

```bash
npm test 2>&1
```

**Parse results for:**
- ✅ All tests passing
- ❌ Any test failures
- ⚠️ Warnings or skipped tests
- 📊 Test count and coverage

---

### 4. Update ISC Based on Results

#### If tests PASS:

```
🎯 ISC UPDATE ═════════════════════════════════════════════════════════════════
│ # │ Criterion                          │ Status          │ Δ              │
├───┼────────────────────────────────────┼─────────────────┼────────────────┤
│ 3 │ All tests pass after build completion │ ✅ VERIFIED     │ ▲ VERIFIED     │
└───┴────────────────────────────────────┴─────────────────┴────────────────┘

Evidence: 24 tests passed (npm test)
```

**→ NOW you can proceed to VERIFY phase.**

---

#### If tests FAIL:

```
🎯 ISC UPDATE ═════════════════════════════════════════════════════════════════
│ # │ Criterion                          │ Status          │ Δ              │
├───┼────────────────────────────────────┼─────────────────┼────────────────┤
│ 2 │ Build completes without errors     │ 🔀 ADJUSTED     │ ▼ TESTS FAILED │
│ 3 │ All tests pass after build completion │ ❌ FAILED       │ Test failures  │
└───┴────────────────────────────────────┴─────────────────┴────────────────┘

Failed tests:
- test/auth.test.ts: "user authentication"
- test/api.test.ts: "POST /api/users"

⚠️ BUILD IS NOT COMPLETE - Fix tests before claiming success
```

**→ DO NOT proceed to VERIFY. Return to BUILD/EXECUTE to fix failures.**

---

### 5. Prevent Premature Commits

**BEFORE `git commit`**, verify tests:

```bash
# Run tests FIRST
npm test

# Only commit if tests pass
if [ $? -eq 0 ]; then
  git commit -m "fix: ..."
else
  echo "❌ Tests failed - not committing"
  exit 1
fi
```

**Template for safe commits:**

```bash
npm test && git add . && git commit -m "fix: add feature" || echo "❌ Tests failed"
```

---

### 6. Integration with VERIFY Phase

VERIFY phase checklist:

```
━━━ ✅  V E R I F Y ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 6/7

🎯 FINAL ISC STATE ════════════════════════════════════════════════════════════
│ # │ Criterion                          │ Status          │ Evidence       │
├───┼────────────────────────────────────┼─────────────────┼────────────────┤
│ 1 │ Code changes implemented correctly │ ✅ VERIFIED     │ Files modified │
│ 2 │ Build completes without errors     │ ✅ VERIFIED     │ npm run build  │
│ 3 │ All tests pass after build completion │ ✅ VERIFIED     │ 24/24 passed (npm test) │
│ 4 │ Changes committed to repository    │ ✅ VERIFIED     │ Commit abc123  │
└───┴────────────────────────────────────┴─────────────────┴────────────────┘
```

**Tests MUST be criterion #3 - always verified before commit.**

---

## Browser Testing (UI Changes)

For UI/frontend changes, add browser verification:

```
│ 3 │ All jest tests pass successfully   │ ✅ VERIFIED     │ 24/24 passed   │
│ 4 │ Browser verification shows UI working correctly │ 🔄 IN_PROGRESS  │ ★ ADDED        │
```

Use Browser skill to screenshot and verify:

```bash
bun ~/.claude/skills/Browser/Tools/Browse.ts "http://localhost:3000/page"
```

Check screenshot for:
- ✅ No console errors
- ✅ UI renders correctly
- ✅ Functionality works as expected

---

## Examples from Real Failures

### Example 1: 2026-02-02-120802 (188 tool calls, rating 2/10)

**What happened:**
- Build succeeded
- PAI immediately claimed ✅ VERIFIED
- Never ran tests
- User discovered tests broken
- User: "you test fuckwad"
- 188 tool calls wasted

**What should happen with MandatoryTest:**

```
✓ Compiled successfully in 9.7s

🎯 ISC UPDATE ═════════════════════════════════════════════════════════════════
│ 2 │ Build completes without errors     │ ✅ VERIFIED     │ Build succeeded │
│ 3 │ All tests pass after build completion │ 🔄 IN_PROGRESS  │ Running tests...│

[Run npm test]

Test Suites: 5 passed, 5 total
Tests:       24 passed, 24 total

│ 3 │ All tests pass after build completion │ ✅ VERIFIED     │ 24/24 passed   │
```

**Result:** User satisfied, 0 follow-up corrections needed

---

### Example 2: 2026-02-02-113118 (74 tool calls, rating 1/10)

**What happened:**
- PAI added auth check
- Build succeeded
- Never tested end-to-end
- Auth check broke page completely
- Rating: 1/10 (worst failure)

**What should happen with MandatoryTest:**

```
✓ Build succeeded

│ 3 │ All tests pass after build completion │ 🔄 IN_PROGRESS  │ Running...     │

[Run npm test]
❌ FAIL app/settings/page.test.tsx
  ● renders without crashing when user not authenticated

│ 3 │ All tests pass after build completion │ ❌ FAILED       │ 1 test failed  │

⚠️ Fix test failure before claiming success
```

**Result:** Catch regression BEFORE user sees it

---

## Test Types by Project

| Project Type | Test Command | Verification |
|--------------|--------------|--------------|
| Next.js | `npm test` or `jest` | Unit + integration |
| Node.js | `npm test` | Unit tests |
| Python | `pytest` | All tests |
| Rust | `cargo test` | All tests |
| Browser app | Tests + Browser screenshot | Unit + visual |

---

## Anti-Criteria

Add to EVERY build task:

```
├───┴────────────────────────────────────┴─────────────────┴────────────────┤
│ ⚠️ ANTI-CRITERIA                                                          │
├───┬────────────────────────────────────┬─────────────────────────────────┤
│ ! │ No build claimed successful without running tests │ 👀 WATCHING     │
└───┴────────────────────────────────────┴─────────────────────────────────┘
```

Verify in VERIFY phase:

```
├───┴────────────────────────────────────┴─────────────────┴────────────────┤
│ ⚠️ ANTI-CRITERIA CHECK                                                    │
├───┬────────────────────────────────────┬─────────────────────────────────┤
│ ! │ No build claimed without tests     │ ✅ AVOIDED - Tests run first    │
└───┴────────────────────────────────────┴─────────────────────────────────┘
```

---

## Exceptions

**When can you skip tests?**

1. **No test suite exists AND:**
   - User explicitly says "skip tests"
   - It's a prototype/experiment
   - Tests would take > 10 minutes

2. **Document the skip:**

```
│ 3 │ All tests pass after build completion │ ⚠️ SKIPPED      │ User approved skip │
```

**But:** Always recommend adding tests for production code.

---

## Monitoring

Track test runs in MEMORY:

```
~/.claude/MEMORY/WORK/test-runs.jsonl
```

Log each test execution:
```json
{
  "timestamp": "2026-02-03T18:00:00Z",
  "command": "npm test",
  "result": "PASS",
  "test_count": 24,
  "duration_ms": 3420,
  "before_commit": true
}
```

---

**Document Status:** Active workflow - reference during BUILD/EXECUTE phases
**Created:** 2026-02-03
**Impact:** Prevents 4 known failure patterns, saves ~75,200 tokens/month
