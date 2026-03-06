# Repository Security System

**Prevents accidental pushes to unauthorized repositories**

## Overview

This system prevents you from accidentally:
- Push

ing code to repos you don't own
- Creating issues in unauthorized repos
- Creating PRs in unauthorized repos

## Components

1. **Whitelist** - `REPOWHITELIST.md` - List of allowed repositories
2. **Checker Tool** - `CORE/Tools/CheckRepoWhitelist.ts` - Validates repo against whitelist
3. **Git Pre-Push Hook** - Blocks unauthorized `git push` operations
4. **Shell Wrapper** - Blocks unauthorized `gh` CLI operations

## Setup

### 1. Configure Your Whitelist

Edit `~/.claude/skills/CORE/USER/REPOWHITELIST.md` and add your allowed repos:

```markdown
### Personal Repos
- `eeeschwartz/PAI` - Your PAI fork
- `eeeschwartz/*` - All your personal repos

### Organization Repos
- `companyname/project` - Work project
```

### 2. Install Git Pre-Push Hook

For the USER repository (already done):
```bash
cd ~/.claude/skills/CORE/USER
cat > .git/hooks/pre-push << 'EOF'
#!/usr/bin/env bash
# Repository whitelist enforcement

# Allow emergency override
if [[ "$ALLOW_PUSH" == "1" ]]; then
  echo "⚠️  ALLOW_PUSH override enabled - skipping whitelist check"
  exit 0
fi

# Get the remote URL being pushed to
remote="$1"
url="$2"

# If no URL provided, get it from git config
if [[ -z "$url" ]]; then
  url=$(git config --get "remote.${remote}.url")
fi

# Check whitelist
if ! bun ~/.claude/skills/CORE/Tools/CheckRepoWhitelist.ts "$url"; then
  echo ""
  echo "🚫 Push blocked by repository whitelist"
  echo ""
  echo "To allow this push:"
  echo "  1. Add repository to ~/.claude/skills/CORE/USER/REPOWHITELIST.md"
  echo "  2. Or use emergency override: ALLOW_PUSH=1 git push"
  exit 1
fi

exit 0
EOF

chmod +x .git/hooks/pre-push
```

**For other repositories**, run this in each repo directory:
```bash
curl -o .git/hooks/pre-push https://raw.githubusercontent.com/eeeschwartz/PAI/main/.claude/skills/CORE/USER/.git-hooks/pre-push
chmod +x .git/hooks/pre-push
```

### 3. Install GitHub CLI Wrapper

Add to your `~/.zshrc` (or `~/.bashrc`):

```bash
# Repository whitelist enforcement for gh CLI
gh() {
  # Allow emergency override
  if [[ "$ALLOW_GH" == "1" ]]; then
    command gh "$@"
    return $?
  fi

  # Check if command creates issues/PRs
  if [[ "$1" == "issue" && "$2" == "create" ]] || [[ "$1" == "pr" && "$2" == "create" ]]; then
    # Extract repo from args or use current directory
    local repo=""
    for ((i=1; i<=$#; i++)); do
      if [[ "${!i}" == "--repo" || "${!i}" == "-R" ]]; then
        ((i++))
        repo="${!i}"
        break
      fi
    done

    # If no --repo flag, get from current directory
    if [[ -z "$repo" ]]; then
      repo=$(git remote get-url origin 2>/dev/null)
    fi

    # Check whitelist
    if [[ -n "$repo" ]]; then
      if ! bun ~/.claude/skills/CORE/Tools/CheckRepoWhitelist.ts "$repo" 2>&1 | grep -q "✅"; then
        echo ""
        echo "🚫 GitHub operation blocked by repository whitelist"
        echo ""
        echo "Repository: $repo"
        echo ""
        echo "To allow this operation:"
        echo "  1. Add repository to ~/.claude/skills/CORE/USER/REPOWHITELIST.md"
        echo "  2. Or use emergency override: ALLOW_GH=1 gh $*"
        return 1
      fi
    fi
  fi

  # Run the actual gh command
  command gh "$@"
}
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Usage

### Normal Operations (Whitelisted Repos)

```bash
# These work normally if repos are whitelisted
git push origin main
gh issue create --repo eeeschwartz/myproject
gh pr create
```

### Blocked Operations

```bash
# These will be blocked if not whitelisted
cd ~/someone-elses-repo
git push origin main
# 🚫 Push blocked by repository whitelist

gh issue create --repo danielmiessler/PAI
# 🚫 GitHub operation blocked by repository whitelist
```

### Emergency Override

If you need to bypass the whitelist (use carefully):

```bash
# Git push
ALLOW_PUSH=1 git push origin main

# GitHub CLI
ALLOW_GH=1 gh issue create --repo owner/repo
```

## Testing

Test the system:

```bash
# Test whitelisted repo (should pass)
bun ~/.claude/skills/CORE/Tools/CheckRepoWhitelist.ts eeeschwartz/PAI

# Test non-whitelisted repo (should fail)
bun ~/.claude/skills/CORE/Tools/CheckRepoWhitelist.ts danielmiessler/PAI
```

## Troubleshooting

**"Whitelist is empty or could not be read"**
- Check that `~/.claude/skills/CORE/USER/REPOWHITELIST.md` exists
- Ensure it has at least one `- \`pattern\`` entry

**Git hook not running**
- Verify hook is executable: `ls -l .git/hooks/pre-push`
- Should show `-rwxr-xr-x` permissions
- If not: `chmod +x .git/hooks/pre-push`

**Shell wrapper not working**
- Verify `~/.zshrc` has the function definition
- Reload shell: `source ~/.zshrc`
- Test: `type gh` should show function definition

## Security Notes

- Emergency overrides are logged in your shell history
- The whitelist itself is version controlled in your PAI fork
- Git hooks are local - set them up in each repository
- Shell wrappers apply system-wide after shell reload

---

**Created:** 2026-02-02
**Last updated:** 2026-02-02
