#!/usr/bin/env bun

/**
 * FetchNotionTranscripts Tool
 *
 * Fetches meeting transcripts from a Notion database and saves them locally.
 * Supports pagination, collision detection, rate limiting, and activity logging.
 *
 * Usage:
 *   bun FetchNotionTranscripts.ts <client-name> --url <notion-database-url>
 *
 * Example:
 *   bun FetchNotionTranscripts.ts henderson --url "https://www.notion.so/workspace/db-id?v=view-id"
 *
 * Exit Codes:
 *   0: Success
 *   1: Auth error (NOTION_API_KEY)
 *   2: Page not found
 *   3: Permission denied
 *   4: Network error
 *   5: File system error
 *   6: Invalid input
 */

import { readFile, writeFile, readdir, mkdir, access } from 'fs/promises';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';

const execAsync = promisify(exec);

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Load NOTION_API_KEY from ~/.claude/.env
 */
function loadNotionApiKey(): string {
  const envPath = join(homedir(), '.claude', '.env');

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const apiKey = envContent
      .split('\n')
      .find(line => line.startsWith('NOTION_API_KEY='))
      ?.split('=')[1]
      ?.trim();

    if (!apiKey) {
      console.error('Error: NOTION_API_KEY not found in ~/.claude/.env');
      console.error('');
      console.error('Set your Notion API key:');
      console.error('  echo "NOTION_API_KEY=secret_xxx... or ntn_xxx..." >> ~/.claude/.env');
      console.error('');
      console.error('Get your key at: https://www.notion.so/my-integrations');
      process.exit(1);
    }

    // Validate format (Notion keys start with 'secret_' or 'ntn_')
    if (!apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_')) {
      console.error('Error: NOTION_API_KEY has invalid format');
      console.error(`Expected format: secret_xxx... or ntn_xxx...`);
      console.error(`Got: ${apiKey.slice(0, 10)}...`);
      process.exit(1);
    }

    return apiKey;
  } catch (error) {
    console.error('Error: Cannot read ~/.claude/.env file');
    console.error('Make sure NOTION_API_KEY is set in ~/.claude/.env');
    process.exit(1);
  }
}

// ============================================================================
// Type Definitions (Issue #8: TypeScript Type Safety)
// ============================================================================

interface NotionRichText {
  type: 'text';
  text: {
    content: string;
  };
  plain_text: string;
}

interface NotionProperty {
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  date?: {
    start: string;
    end?: string;
  };
  created_time?: string;
  last_edited_time?: string;
}

interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: {
    [key: string]: NotionProperty;
  };
  url?: string;
}

interface NotionPageWithFilename extends NotionPage {
  _filename: string;
  _title: string;
}

interface QueryDatabaseResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

interface FetchResult {
  pageId: string;
  path: string;
  title: string;
  wordCount: number;
}

interface FetchSummary {
  fetched: FetchResult[];
  skipped: Array<{ pageId: string; filename: string; reason: string }>;
  failed: Array<{ pageId: string; error: string }>;
}

interface CLIArgs {
  clientName: string;
  notionUrl: string;
  dryRun: boolean;
  help: boolean;
}

// ============================================================================
// Security Validations (Issues #2, #3)
// ============================================================================

/**
 * Validates client name to prevent path traversal attacks
 * Issue #2: Path Traversal Prevention
 */
function validateClientPath(clientName: string): string {
  // Only allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(clientName)) {
    console.error('Error: Invalid client name (alphanumeric, hyphens, underscores only)');
    process.exit(6);
  }

  const clientsBase = join(process.env.HOME!, '.claude', 'skills', 'CORE', 'USER', 'CLIENTS');
  const clientPath = join(clientsBase, clientName);

  // Ensure path is within CLIENTS/ directory (resolve to handle any sneaky paths)
  const resolvedClientPath = resolve(clientPath);
  const resolvedClientsBase = resolve(clientsBase);

  if (!resolvedClientPath.startsWith(resolvedClientsBase + '/')) {
    console.error('Error: Path traversal attempt detected');
    process.exit(6);
  }

  return resolvedClientPath;
}

/**
 * Validates Notion page ID format
 * Issue #3: Page ID Validation
 */
function validatePageId(pageId: string): void {
  // UUID format: 8-4-4-4-12 hex digits
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Also accept 32-character hex (Notion sometimes returns this)
  const hexRegex = /^[0-9a-f]{32}$/i;

  if (!uuidRegex.test(pageId) && !hexRegex.test(pageId)) {
    console.error(`Error: Invalid page ID format: ${pageId}`);
    console.error('Expected UUID or 32-character hex string');
    process.exit(6);
  }
}

/**
 * Extracts database ID from Notion URL
 * Step 3: Database ID Extraction
 */
function extractDatabaseId(notionUrl: string): string {
  // Match 32-character hex database ID from URL
  const match = notionUrl.match(/([0-9a-f]{32})/i);

  if (!match) {
    console.error('Error: Could not extract database ID from URL');
    console.error('Expected URL format: https://www.notion.so/workspace/db-id?v=view-id');
    console.error('URL must contain a 32-character hex database ID');
    process.exit(6);
  }

  return match[1];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Slugifies a title for use in filenames
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')   // Trim leading/trailing hyphens
    .slice(0, 100);            // Limit length
}

/**
 * Generates expected filename from page metadata
 * Format: {created_time_date}_{slugified-title}.md
 */
function generateFilename(createdTime: string, title: string): string {
  const date = createdTime.split('T')[0]; // Extract YYYY-MM-DD
  const slug = slugify(title);
  return `${date}-${slug}.md`;
}

/**
 * Extracts title from Notion page properties
 */
function extractTitle(page: NotionPage): string {
  for (const [_key, prop] of Object.entries(page.properties)) {
    if (prop.type === 'title' && prop.title && prop.title.length > 0) {
      return prop.title.map(t => t.plain_text).join('');
    }
  }
  return 'untitled';
}

/**
 * Rate-limited function execution
 * Issue #6: Rate Limiting - 334ms delay for Notion API (3 req/sec)
 */
async function fetchWithRateLimit<T>(
  fetchFn: () => Promise<T>,
  delayMs: number = 334
): Promise<T> {
  const result = await fetchFn();
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return result;
}

/**
 * Counts words in markdown content
 */
function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { clientName: '', notionUrl: '', dryRun: false, help: true };
  }

  const clientName = args[0];
  const urlIndex = args.indexOf('--url');
  const dryRun = args.includes('--dry-run');

  if (urlIndex === -1 || !args[urlIndex + 1]) {
    console.error('Error: --url <notion-database-url> is required');
    process.exit(6);
  }

  const notionUrl = args[urlIndex + 1];

  return { clientName, notionUrl, dryRun, help: false };
}

function printHelp(): void {
  console.log(`
FetchNotionTranscripts Tool

Fetches meeting transcripts from a Notion database and saves them locally.

Usage:
  bun FetchNotionTranscripts.ts <client-name> --url <notion-database-url> [--dry-run]

Arguments:
  <client-name>    Name of the client (must match directory in USER/CLIENTS/)
  --url            Notion database URL with view (required)
  --dry-run        Show what would be fetched without actually fetching

Exit Codes:
  0: Success
  1: Auth error
  2: Page not found
  3: Permission denied
  4: Network error
  5: File system error
  6: Invalid input

Examples:
  bun FetchNotionTranscripts.ts henderson --url "https://www.notion.so/workspace/db-id?v=view-id"
  bun FetchNotionTranscripts.ts henderson --url "https://www.notion.so/workspace/db-id?v=view-id" --dry-run
`);
}

// ============================================================================
// Notion API Integration
// ============================================================================

const NOTION_API_VERSION = '2022-06-28';

/**
 * Queries Notion database with pagination support
 * Issue #7: Pagination Handling
 * Uses Notion API directly with fetch()
 *
 * @param clientName - Filter by Client multi_select field (e.g., "Henderson")
 */
async function queryNotionDatabase(databaseId: string, apiKey: string, clientName: string): Promise<NotionPage[]> {
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
  let allPages: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined;
  let pageCount = 0;

  console.log('   Querying Notion database...');

  while (hasMore) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_cursor: startCursor,
        page_size: 100,
        filter: {
          property: "Client",
          multi_select: {
            contains: clientName
          }
        }
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Error: Unauthorized - Invalid API key');
        console.error('Check your NOTION_API_KEY in ~/.claude/.env');
        process.exit(1);
      } else if (response.status === 404) {
        console.error(`Error: Database not found (id: ${databaseId})`);
        console.error('Verify the database ID is correct and the integration has access');
        process.exit(2);
      } else if (response.status === 403) {
        console.error(`Error: Access denied to database (id: ${databaseId})`);
        console.error('Share the database with your Notion integration at notion.so/my-integrations');
        process.exit(3);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Error: Notion API request failed (status: ${response.status})`);
        console.error(JSON.stringify(errorData, null, 2));
        process.exit(4);
      }
    }

    const data: QueryDatabaseResponse = await response.json();
    allPages = allPages.concat(data.results);
    hasMore = data.has_more;
    startCursor = data.next_cursor || undefined;
    pageCount++;

    // Rate limiting: 334ms between requests (3 req/sec limit)
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 334));
    }
  }

  console.log(`   Found ${allPages.length} pages in database (${pageCount} API calls)`);
  return allPages;
}

// ============================================================================
// Local Transcript Management
// ============================================================================

/**
 * Gets list of local transcript files
 * Step 5: Get Local Transcripts
 */
async function getLocalTranscripts(transcriptsDir: string): Promise<Set<string>> {
  try {
    await access(transcriptsDir);
    const files = await readdir(transcriptsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    return new Set(mdFiles);
  } catch {
    // Directory doesn't exist yet
    return new Set();
  }
}

/**
 * Identifies missing transcripts with collision detection
 * Step 6: Identify Missing Transcripts
 * Issue #5: Set-Based Collision Detection
 */
function identifyMissingTranscripts(
  notionPages: NotionPage[],
  localFiles: Set<string>
): NotionPageWithFilename[] {
  const missing: NotionPageWithFilename[] = [];
  const usedFilenames = new Set(localFiles); // Start with existing files

  for (const page of notionPages) {
    const title = extractTitle(page);
    let filename = generateFilename(page.created_time, title);
    let counter = 2;

    // O(1) collision check with Set (Issue #9)
    while (usedFilenames.has(filename)) {
      const baseName = filename.replace('.md', '');
      filename = `${baseName}-${counter}.md`;
      counter++;
    }

    if (!localFiles.has(filename)) {
      missing.push({
        ...page,
        _filename: filename,
        _title: title
      });
      usedFilenames.add(filename); // Mark as used for collision detection
    }
  }

  return missing;
}

// ============================================================================
// Activity Log Management
// ============================================================================

/**
 * Updates Activity Log with file locking
 * Step 8: Update Activity Log
 * Issue #4: Race Condition Prevention
 */
async function updateActivityLog(
  clientPath: string,
  clientName: string,
  summary: FetchSummary
): Promise<void> {
  const activityPath = join(clientPath, 'ACTIVITY.md');

  const timestamp = new Date().toISOString().split('T')[0];
  const timeOfDay = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const fetchedList = summary.fetched
    .map(f => `  - ${f.title} (${f.wordCount} words)`)
    .join('\n');

  const newEntry = `### ${timestamp} ${timeOfDay}: Transcript Sync
- **Fetched:** ${summary.fetched.length} new transcripts from Notion
- **Skipped:** ${summary.skipped.length} (already local)
- **Failed:** ${summary.failed.length}
${summary.fetched.length > 0 ? `\nNew transcripts:\n${fetchedList}` : ''}
${summary.failed.length > 0 ? `\nFailed:\n${summary.failed.map(f => `  - ${f.pageId}: ${f.error}`).join('\n')}` : ''}`;

  // Use flock for file locking (Issue #4)
  const lockFile = `/tmp/activity-${clientName}.lock`;
  const shellScript = `
{
  flock -x 200
  if [ -f "${activityPath}" ]; then
    content=$(cat "${activityPath}")
    # Find the line after "---" header (after the first occurrence of "---" and newline)
    header=$(head -7 "${activityPath}")
    rest=$(tail -n +8 "${activityPath}")
    echo -e "$header\n\n${newEntry.replace(/"/g, '\\"').replace(/\$/g, '\\$')}\n\n$rest" > "${activityPath}.tmp"
    mv "${activityPath}.tmp" "${activityPath}"
  else
    echo "Activity log not found at ${activityPath}"
  fi
} 200>"${lockFile}"
`;

  try {
    await execAsync(`bash -c '${shellScript.replace(/'/g, "'\"'\"'")}'`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Warning: Failed to update activity log: ${errorMessage}`);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('');
  console.log('FetchNotionTranscripts');
  console.log('='.repeat(60));
  console.log(`Client: ${args.clientName}`);
  console.log(`Mode: ${args.dryRun ? 'Dry Run' : 'Live'}`);
  console.log('');

  // Step 1: Validate client path (Security Issue #2)
  const clientPath = validateClientPath(args.clientName);
  const telosPath = join(clientPath, 'TELOS.md');
  const transcriptsDir = join(clientPath, 'TRANSCRIPTS');

  // Step 2: Check TELOS exists
  try {
    await access(telosPath);
  } catch {
    console.error(`Error: Client TELOS not found at ${telosPath}`);
    console.error(`Run: /client-telos init ${args.clientName}`);
    process.exit(6);
  }

  console.log(`[OK] Client TELOS found: ${telosPath}`);

  // Step 3: Extract database ID from URL
  const databaseId = extractDatabaseId(args.notionUrl);
  console.log(`[OK] Database ID extracted: ${databaseId}`);

  // Step 4: Ensure TRANSCRIPTS directory exists
  try {
    await mkdir(transcriptsDir, { recursive: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: Failed to create TRANSCRIPTS directory: ${errorMessage}`);
    process.exit(5);
  }

  // Step 5: Get local transcripts (as Set for O(1) lookup - Issue #9)
  const localFiles = await getLocalTranscripts(transcriptsDir);
  console.log(`[OK] Local transcripts: ${localFiles.size} files`);

  // Step 6: Load API key and query Notion database
  const apiKey = loadNotionApiKey();
  console.log('[OK] Notion API key loaded');

  const notionPages = await queryNotionDatabase(databaseId, apiKey, args.clientName);
  console.log(`[OK] Found ${notionPages.length} pages in Notion database (filtered by Client=${args.clientName})`);

  // Step 7: Identify missing transcripts
  const missing = identifyMissingTranscripts(notionPages, localFiles);
  console.log(`[OK] Missing transcripts: ${missing.length}`);

  if (missing.length === 0) {
    console.log('');
    console.log('All transcripts are already synced. Nothing to fetch.');
    process.exit(0);
  }

  // Initialize summary
  const summary: FetchSummary = {
    fetched: [],
    skipped: [],
    failed: []
  };

  // Track already-local pages as skipped
  for (const page of notionPages) {
    const title = extractTitle(page);
    const filename = generateFilename(page.created_time, title);
    if (localFiles.has(filename)) {
      summary.skipped.push({
        pageId: page.id,
        filename,
        reason: 'Already exists locally'
      });
    }
  }

  // Dry run mode
  if (args.dryRun) {
    console.log('');
    console.log('DRY RUN - Would fetch:');
    for (const page of missing) {
      console.log(`  - ${page._filename} (${page._title})`);
    }
    console.log('');
    console.log(`Total: ${missing.length} transcripts would be fetched`);
    process.exit(0);
  }

  // Step 8: Fetch each missing transcript using notion-fetch CLI
  console.log('');
  console.log('Fetching missing transcripts...');
  console.log('');

  const notionFetchPath = join(process.env.HOME!, '.claude', 'Bin', 'notion-fetch', 'notion-fetch.ts');

  for (const missingPage of missing) {
    try {
      // Rate limiting: 334ms between requests (after first)
      if (summary.fetched.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 334));
      }

      validatePageId(missingPage.id); // Security validation

      const { stdout } = await execAsync(
        `bun "${notionFetchPath}" --id ${missingPage.id} --output "${transcriptsDir}" --json --force`
      );

      const result = JSON.parse(stdout.trim());
      summary.fetched.push({
        pageId: missingPage.id,
        path: result.path,
        title: result.title,
        wordCount: result.wordCount || 0
      });

      console.log(`  [FETCHED] ${result.title} (${result.wordCount || 0} words)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.failed.push({
        pageId: missingPage.id,
        error: errorMessage
      });
      console.error(`  [FAILED] ${missingPage._title || missingPage.id} - ${errorMessage}`);
    }
  }

  // Step 9: Update Activity Log
  if (summary.fetched.length > 0) {
    await updateActivityLog(clientPath, args.clientName, summary);
    console.log('');
    console.log('[OK] Activity log updated');
  }

  // Step 10: Report summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Transcript Sync Complete');
  console.log('='.repeat(60));
  console.log('');
  console.log('Summary:');
  console.log(`  - Fetched: ${summary.fetched.length} transcripts`);
  console.log(`  - Skipped: ${summary.skipped.length} (already present)`);
  console.log(`  - Failed: ${summary.failed.length}`);
  console.log(`  - Total local transcripts: ${localFiles.size + summary.fetched.length}`);

  if (summary.failed.length > 0) {
    console.log('');
    console.log('Failed transcripts:');
    for (const failed of summary.failed) {
      console.log(`  - ${failed.pageId}: ${failed.error}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

// ============================================================================
// Exported Functions for MCP Integration
// ============================================================================

/**
 * Process fetched Notion pages and save to local filesystem
 * Called after MCP tools retrieve the data
 */
export async function processNotionPages(
  notionPages: NotionPage[],
  transcriptsDir: string,
  clientPath: string,
  clientName: string,
  dryRun: boolean = false
): Promise<FetchSummary> {
  const localFiles = await getLocalTranscripts(transcriptsDir);
  const missing = identifyMissingTranscripts(notionPages, localFiles);

  const summary: FetchSummary = {
    fetched: [],
    skipped: [],
    failed: []
  };

  // Track already-local pages
  for (const page of notionPages) {
    const title = extractTitle(page);
    const filename = generateFilename(page.created_time, title);
    if (localFiles.has(filename)) {
      summary.skipped.push({
        pageId: page.id,
        filename,
        reason: 'Already exists locally'
      });
    }
  }

  if (dryRun) {
    console.log('');
    console.log('DRY RUN - Would fetch:');
    for (const page of missing) {
      console.log(`  - ${page._filename} (${page._title})`);
    }
    return summary;
  }

  // Fetch missing pages with rate limiting (Issue #6)
  for (const page of missing) {
    validatePageId(page.id); // Issue #3

    try {
      // In actual execution, the content would come from mcp__notion__notion-fetch
      // This is the processing logic once content is retrieved
      console.log(`Fetching: ${page._title}...`);

      // Placeholder for content - actual fetch happens via MCP
      // The content would be passed in from the MCP tool result
      const content = `# ${page._title}\n\nFetched from Notion on ${new Date().toISOString()}`;
      const filePath = join(transcriptsDir, page._filename);

      await writeFile(filePath, content, 'utf-8');

      summary.fetched.push({
        pageId: page.id,
        path: filePath,
        title: page._title,
        wordCount: countWords(content)
      });

      // Rate limiting (Issue #6)
      await new Promise(resolve => setTimeout(resolve, 334));

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.failed.push({
        pageId: page.id,
        error: errorMessage
      });
    }
  }

  // Update activity log with file locking (Issue #4)
  if (summary.fetched.length > 0 || summary.failed.length > 0) {
    await updateActivityLog(clientPath, clientName, summary);
  }

  return summary;
}

/**
 * Save a single transcript (called from MCP workflow)
 */
export async function saveTranscript(
  transcriptsDir: string,
  filename: string,
  content: string
): Promise<{ success: boolean; path: string; wordCount: number }> {
  try {
    const filePath = join(transcriptsDir, filename);
    await writeFile(filePath, content, 'utf-8');
    return {
      success: true,
      path: filePath,
      wordCount: countWords(content)
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save transcript: ${errorMessage}`);
  }
}

/**
 * Generate filename for a page (exported for MCP workflow use)
 */
export function generateTranscriptFilename(
  createdTime: string,
  title: string,
  existingFiles: Set<string>
): string {
  let filename = generateFilename(createdTime, title);
  let counter = 2;

  // O(1) collision check (Issue #5, #9)
  while (existingFiles.has(filename)) {
    const baseName = filename.replace('.md', '');
    filename = `${baseName}-${counter}.md`;
    counter++;
  }

  return filename;
}

// Re-export utilities for external use
export {
  validateClientPath,
  validatePageId,
  extractDatabaseId,
  extractTitle,
  getLocalTranscripts,
  updateActivityLog,
  slugify
};

// Run main if executed directly
main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Fatal error: ${errorMessage}`);
  process.exit(1);
});
