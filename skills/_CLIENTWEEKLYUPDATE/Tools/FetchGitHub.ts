#!/usr/bin/env bun
/**
 * FetchGitHub.ts - Fetch merged PRs from the Henderson GitHub repo
 *
 * Usage:
 *   bun ~/.claude/skills/ClientWeeklyUpdate/Tools/FetchGitHub.ts [options]
 *
 * Options:
 *   --repo <owner/repo>   GitHub repo (default: eeeschwartz/aaa-henderson-pm-email-agent)
 *   --days <n>            Days to look back (default: 7)
 *   --help                Show this help
 *
 * Requires: gh CLI authenticated (run `gh auth status`)
 */

import { execSync } from "child_process";

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`FetchGitHub.ts — Fetch merged PRs from Henderson GitHub repo

Usage:
  bun FetchGitHub.ts [--repo owner/repo] [--days n]

Options:
  --repo <owner/repo>   GitHub repo (default: eeeschwartz/aaa-henderson-pm-email-agent)
  --days <n>            Days to look back (default: 7)
  --help                Show this help`);
  process.exit(0);
}

// Parse args
const repoIdx = args.indexOf("--repo");
const daysIdx = args.indexOf("--days");
const repo = repoIdx !== -1 ? args[repoIdx + 1] : "eeeschwartz/aaa-henderson-pm-email-agent";
const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1]) : 7;

// Verify gh is authenticated
try {
  execSync("gh auth status", { stdio: "pipe" });
} catch {
  console.error("❌ GitHub CLI not authenticated. Run: gh auth login");
  process.exit(1);
}

const since = new Date();
since.setDate(since.getDate() - days);
const sinceISO = since.toISOString();

console.log(`🔍 Fetching merged PRs from ${repo} (last ${days} days)...`);

try {
  const result = execSync(
    `gh pr list --repo ${repo} --state merged --json number,title,mergedAt,body,author --limit 50`,
    { encoding: "utf8" }
  );

  const prs = JSON.parse(result) as Array<{
    number: number;
    title: string;
    mergedAt: string;
    body: string;
    author: { login: string };
  }>;

  // Filter to within date range
  const filtered = prs.filter((pr) => new Date(pr.mergedAt) >= since);

  if (filtered.length === 0) {
    console.log(`📭 No merged PRs in the last ${days} days.`);
    console.log(JSON.stringify({ prs: [], count: 0, repo, days }));
    process.exit(0);
  }

  const output = filtered.map((pr) => ({
    number: pr.number,
    title: pr.title,
    mergedAt: pr.mergedAt,
    author: pr.author.login,
    body: pr.body?.slice(0, 500) ?? "(no description)",
  }));

  console.log(`✅ Found ${output.length} merged PR(s) since ${since.toDateString()}`);
  output.forEach((pr) => {
    console.log(`  #${pr.number}: ${pr.title} (merged ${new Date(pr.mergedAt).toLocaleDateString()})`);
  });

  // JSON output for orchestrator
  console.log("\n--- JSON OUTPUT ---");
  console.log(JSON.stringify({ prs: output, count: output.length, repo, days }));
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`❌ GitHub fetch failed: ${msg}`);
  process.exit(1);
}
