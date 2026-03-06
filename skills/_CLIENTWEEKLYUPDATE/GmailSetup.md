# Gmail OAuth Setup Guide

One-time setup to authorize read-only Gmail access for the ClientWeeklyUpdate skill.

## Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click **New Project** → name it `PAI-ClientUpdates` → **Create**
3. Make sure the new project is selected in the top dropdown

## Step 2: Enable Gmail API

1. In the left sidebar: **APIs & Services → Library**
2. Search for **Gmail API**
3. Click it → **Enable**

## Step 3: Create OAuth Credentials

1. **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID**
3. If prompted to configure consent screen:
   - User Type: **External**
   - App name: `PAI Client Updates`
   - User support email: your email
   - Add yourself as a test user
   - Scopes: add `gmail.readonly`
   - Save and continue
4. Back at Create Credentials → OAuth client ID:
   - Application type: **Desktop app**
   - Name: `PAI CLI`
   - **Create**
5. You'll see your **Client ID** and **Client Secret** — copy both

## Step 4: Set Environment Variables

Add to `~/.zshrc` (or your shell config):

```bash
export GOOGLE_CLIENT_ID="your-client-id-here"
export GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

Then reload: `source ~/.zshrc`

## Step 5: Run the Auth Setup Script

```bash
bun ~/.claude/skills/ClientWeeklyUpdate/Tools/SetupGmailAuth.ts
```

This will:
1. Open a browser window to Google's consent screen
2. Ask you to authorize read-only Gmail access
3. Redirect to `http://localhost:3333/callback`
4. Save the refresh token to `~/.claude/PAI/USER/secrets/gmail-token.json`

**The token file is gitignored and never shared.**

## Done

After setup, `FetchGmail.ts` will use the stored refresh token automatically — no re-login needed until the token expires (typically 6 months of inactivity).

## Troubleshooting

- **"redirect_uri_mismatch"**: Make sure the OAuth app type is "Desktop app", not "Web application"
- **"Access blocked"**: Add yourself as a test user in the OAuth consent screen
- **Token expired**: Delete `~/.claude/PAI/USER/secrets/gmail-token.json` and re-run SetupGmailAuth
