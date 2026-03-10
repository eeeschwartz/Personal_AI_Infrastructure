#!/usr/bin/env bun

/**
 * ClientTelos Prioritization Tool
 *
 * Scores GitHub issues against client TELOS context and returns a prioritized task list.
 *
 * Usage:
 *   bun Prioritize.ts <client-name> [--repo owner/repo] [--limit N]
 *
 * Example:
 *   bun Prioritize.ts acme-corp
 *   bun Prioritize.ts acme-corp --repo myorg/myrepo --limit 10
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

interface Issue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  url: string;
  state: string;
}

interface ScoredIssue extends Issue {
  score: number;
  rationale: string;
  strategicAlignment: string;
  impactDimensions: {
    strategic: number;
    userValue: number;
    revenue: number;
    risk: number;
    priority: number;
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
ClientTelos Prioritization Tool

Usage:
  bun Prioritize.ts <client-name> [--repo owner/repo] [--limit N]

Arguments:
  <client-name>    Name of the client (must match directory in USER/CLIENTS/)
  --repo           GitHub repository (default: from TELOS file)
  --limit          Max number of issues to fetch (default: 50)

Examples:
  bun Prioritize.ts acme-corp
  bun Prioritize.ts acme-corp --repo myorg/myrepo --limit 10
`);
    process.exit(0);
  }

  const clientName = args[0];
  const repoFlag = args.indexOf('--repo');
  const limitFlag = args.indexOf('--limit');

  const repo = repoFlag !== -1 ? args[repoFlag + 1] : null;
  const limit = limitFlag !== -1 ? parseInt(args[limitFlag + 1]) : 50;

  console.log(`🎯 ClientTelos Prioritization`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Client: ${clientName}`);
  console.log(`Limit: ${limit} issues`);
  console.log();

  // Step 1: Load client TELOS
  console.log(`📖 Loading client TELOS...`);
  const telosPath = join(process.env.HOME!, '.claude', 'skills', 'CORE', 'USER', 'CLIENTS', clientName, 'TELOS.md');

  try {
    await access(telosPath);
  } catch {
    console.error(`❌ Error: Client TELOS not found at ${telosPath}`);
    console.error(`   Run: /client-telos init ${clientName}`);
    process.exit(1);
  }

  const telosContent = await readFile(telosPath, 'utf-8');

  // Extract GitHub repo from TELOS if not provided
  let githubRepo = repo;
  if (!githubRepo) {
    const repoMatch = telosContent.match(/\*\*GitHub Repository:\*\*\s+(.+)/);
    if (repoMatch) {
      githubRepo = repoMatch[1].trim();
    }
  }

  if (!githubRepo) {
    console.error(`❌ Error: No GitHub repository specified`);
    console.error(`   Either add to TELOS.md or use --repo flag`);
    process.exit(1);
  }

  console.log(`   ✓ TELOS loaded (${telosContent.length} chars)`);
  console.log(`   ✓ GitHub repo: ${githubRepo}`);
  console.log();

  // Step 2: Fetch GitHub issues
  console.log(`📋 Fetching GitHub issues...`);
  const issues = await fetchGitHubIssues(githubRepo, limit);

  if (issues.length === 0) {
    console.log(`   ℹ️  No open issues found in ${githubRepo}`);
    process.exit(0);
  }

  console.log(`   ✓ Found ${issues.length} open issues`);
  console.log();

  // Step 3: Score each issue
  console.log(`🤖 Scoring issues against TELOS context...`);
  const scoredIssues = await scoreIssues(issues, telosContent, clientName);
  console.log(`   ✓ All issues scored`);
  console.log();

  // Step 4: Display results
  console.log(`📊 PRIORITIZED TASK LIST`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log();

  scoredIssues.forEach((issue, index) => {
    const rank = index + 1;
    const score = issue.score.toFixed(1);
    const bar = '█'.repeat(Math.floor(issue.score)) + '░'.repeat(10 - Math.floor(issue.score));

    console.log(`${rank}. [Score: ${score}/10] ${bar}`);
    console.log(`   Issue #${issue.number}: ${issue.title}`);
    console.log(`   ${issue.url}`);
    console.log();
    console.log(`   Strategic Alignment: ${issue.strategicAlignment}`);
    console.log();
    console.log(`   Impact Breakdown:`);
    console.log(`   • Strategic:  ${issue.impactDimensions.strategic.toFixed(1)}/10 (40% weight)`);
    console.log(`   • User Value: ${issue.impactDimensions.userValue.toFixed(1)}/10 (30% weight)`);
    console.log(`   • Revenue:    ${issue.impactDimensions.revenue.toFixed(1)}/10 (15% weight)`);
    console.log(`   • Risk:       ${issue.impactDimensions.risk.toFixed(1)}/10 (10% weight)`);
    console.log(`   • Priority:   ${issue.impactDimensions.priority.toFixed(1)}/10 (5% weight)`);
    console.log();
    console.log(`   Rationale:`);
    console.log(`   ${issue.rationale}`);
    console.log();
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log();
  });

  console.log(`✅ Prioritization complete. Recommend starting with #${scoredIssues[0].number}.`);
}

async function fetchGitHubIssues(repo: string, limit: number): Promise<Issue[]> {
  try {
    const { stdout } = await execAsync(
      `gh issue list --repo ${repo} --state open --limit ${limit} --json number,title,body,labels,url,state`
    );

    const issues = JSON.parse(stdout);
    return issues.map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      labels: issue.labels?.map((l: any) => l.name) || [],
      url: issue.url,
      state: issue.state
    }));
  } catch (error: any) {
    console.error(`❌ Error fetching GitHub issues: ${error.message}`);
    console.error(`   Make sure gh CLI is installed and authenticated`);
    process.exit(1);
  }
}

async function scoreIssues(issues: Issue[], telosContent: string, clientName: string): Promise<ScoredIssue[]> {
  const systemPrompt = `You are a task prioritization system for ${clientName}.

You have been given:
1. The client's TELOS file (strategic goals, priorities, constraints, impact model)
2. A list of open GitHub issues

Your job: Score each issue from 0-10 based on how well it aligns with the client's TELOS context.

## Client TELOS Context

${telosContent}

## Scoring Instructions

For each issue, provide:

1. **Overall Score** (0-10): Weighted score based on impact model
2. **Strategic Alignment**: Which goals (G1, G2, G3...) does this serve? How directly?
3. **Impact Dimensions**: Score 0-10 for each:
   - Strategic (40% weight): Alignment with strategic goals
   - User Value (30% weight): Direct benefit to end users
   - Revenue (15% weight): Revenue or growth impact
   - Risk (10% weight): Reduces technical or business risk
   - Priority (5% weight): Addresses current priorities (P1, P2, P3)
4. **Rationale**: 2-3 sentences explaining the score

## Output Format

Return valid JSON only. No markdown, no explanations outside the JSON. Array of objects:

[
  {
    "number": 42,
    "score": 9.2,
    "strategicAlignment": "Directly serves G1 (mobile app launch) and P1 (authentication flow)",
    "impactDimensions": {
      "strategic": 10,
      "userValue": 8,
      "revenue": 9,
      "risk": 7,
      "priority": 10
    },
    "rationale": "This issue is critical for G1 (mobile app launch by Q2). It addresses P1 (authentication flow) which is blocking the launch. High revenue impact as mobile app is a key growth driver."
  }
]

Return scores from highest to lowest.`;

  const userPrompt = `Score these GitHub issues:

${issues.map(issue => `
### Issue #${issue.number}: ${issue.title}

**Labels:** ${issue.labels.join(', ') || 'none'}

**Description:**
${issue.body.slice(0, 500)}${issue.body.length > 500 ? '...' : ''}

**URL:** ${issue.url}
`).join('\n---\n')}`;

  try {
    // Use PAI's inference system
    const inferencePath = join(process.env.HOME!, '.claude', 'skills', 'CORE', 'Tools', 'Inference.ts');

    // Write prompts to temp files
    await execAsync('mkdir -p /tmp/claude');
    const systemFile = `/tmp/claude/prioritize-system-${Date.now()}.txt`;
    const userFile = `/tmp/claude/prioritize-user-${Date.now()}.txt`;
    await Bun.write(systemFile, systemPrompt);
    await Bun.write(userFile, userPrompt);

    // Call inference tool with smart level, passing prompts as file arguments
    const { stdout } = await execAsync(`bun ${inferencePath} --json --level smart "$(cat ${systemFile})" "$(cat ${userFile})"`);

    // Parse LLM response
    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON array');
    }

    const scores = JSON.parse(jsonMatch[0]);

    // Merge scores with original issues
    const scoredIssues: ScoredIssue[] = scores.map((scored: any) => {
      const originalIssue = issues.find(i => i.number === scored.number);
      if (!originalIssue) {
        throw new Error(`Issue #${scored.number} not found in original list`);
      }

      return {
        ...originalIssue,
        score: scored.score,
        rationale: scored.rationale,
        strategicAlignment: scored.strategicAlignment,
        impactDimensions: scored.impactDimensions
      };
    });

    // Sort by score descending
    return scoredIssues.sort((a, b) => b.score - a.score);

  } catch (error: any) {
    console.error(`❌ Error scoring issues: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
