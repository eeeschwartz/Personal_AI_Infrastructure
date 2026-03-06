# Repository Whitelist

**Allowed repositories for git push and GitHub CLI operations**

This file controls which repositories you're allowed to push code to or create issues/PRs in. Any operation targeting a repository not on this list will be blocked.

## Your Allowed Repositories

### Personal Repos
- `eeeschwartz/PAI` - Your PAI fork (personal customizations)
<!-- - `eeeschwartz/*` - All repos under your GitHub account -->

### Organization Repos
<!-- Add organization repos you contribute to -->
<!-- - `orgname/reponame` - Description -->

## Pattern Matching

The whitelist supports:
- **Exact match**: `eeeschwartz/PAI`
- **Wildcard**: `eeeschwartz/*` (all repos under account)
- **Comments**: Lines starting with `#` or `<!--` are ignored

## Usage

This whitelist is checked by:
1. **Git pre-push hook** - Blocks `git push` to non-whitelisted remotes
2. **`gh` command wrapper** - Blocks `gh issue create`, `gh pr create` to non-whitelisted repos

## Adding a Repository

1. Add the repo pattern to the appropriate section above
2. Save this file
3. No restart needed - changes take effect immediately

## Emergency Override

To bypass the whitelist for a single operation:
```bash
# Git push
ALLOW_PUSH=1 git push origin main

# GitHub CLI
ALLOW_GH=1 gh issue create --repo owner/repo
```

**Use emergency override sparingly and only when you're certain.**

## Examples

**Allowed:**
```bash
cd ~/eeeschwartz/PAI && git push origin main  ✅
```

**Blocked:**
```bash
cd ~/someone-elses-repo && git push origin main  ❌
gh issue create --repo danielmiessler/PAI  ❌
```

---

**Last updated:** 2026-02-02
