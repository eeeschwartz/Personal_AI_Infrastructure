# Init Workflow

Initialize a new client TELOS file.

## Trigger

- "initialize client"
- "create client TELOS"
- "new client"
- "set up client"

## Steps

### 1. Get Client Name

Ask user for client name (will be used as directory name, kebab-case recommended).

### 2. Create Directory Structure

```bash
mkdir -p ~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/{TRANSCRIPTS,DOCUMENTS}
```

### 3. Copy TELOS Template

```bash
cp ~/.claude/skills/ClientTelos/Templates/TELOS.md \
   ~/.claude/PAI/USER/BUSINESS/CLIENTS/<client-name>/TELOS.md
```

### 4. Gather Initial Context

Use `AskUserQuestion` to collect:

**Required:**
- Company name
- Industry
- Your role/engagement scope
- GitHub repository (owner/repo format)

**Optional:**
- Mission statement
- Top 3 strategic goals (G1, G2, G3)
- Current priorities (P1, P2, P3)

### 5. Populate TELOS File

Replace placeholders in template with user-provided values:
- `[CLIENT_NAME]` → client name
- `[DATE]` → today's date
- `[COMPANY_NAME]` → company name
- `[INDUSTRY]` → industry
- `[YOUR_ROLE_DESCRIPTION]` → role description
- `[REPO_OWNER/REPO_NAME]` → GitHub repo
- ...etc

If user didn't provide optional fields, leave placeholders for later.

### 6. Initialize ACTIVITY.md

Create activity log file:

```markdown
# Activity Log: [CLIENT_NAME]

Streaming updates (newest first). These updates modify the core TELOS context.

---

## [DATE]
- Client TELOS initialized
- Initial context captured
```

### 7. Confirm Success

Output:
```
✅ Client TELOS initialized for [CLIENT_NAME]

Location: ~/.claude/PAI/USER/BUSINESS/CLIENTS/[client-name]/

Next steps:
1. Review and refine the TELOS file: open ~/.claude/PAI/USER/BUSINESS/CLIENTS/[client-name]/TELOS.md
2. Update with more context as you learn about the client
3. Try prioritizing tasks: /client-telos prioritize [client-name]
```

## Example

```
User: "initialize client TELOS for Acme Corp"

PAI: Gathering information for Acme Corp...

[AskUserQuestion with fields]

PAI: ✅ Client TELOS initialized for Acme Corp

Location: ~/.claude/PAI/USER/BUSINESS/CLIENTS/acme-corp/

Next steps:
1. Review: open ~/.claude/PAI/USER/BUSINESS/CLIENTS/acme-corp/TELOS.md
2. Update with more context
3. Prioritize: /client-telos prioritize acme-corp
```
