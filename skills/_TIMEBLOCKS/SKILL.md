# TimeBlocks Skill

Process and consolidate time-tracking data in 15-minute block format into readable time ranges.

## Purpose

Converts detailed time logs where each row represents a 15-minute block into consolidated time ranges by merging consecutive identical activities. Useful for analyzing time-tracking data, creating summaries, and understanding how time was actually spent.

## Triggers

- "consolidate time blocks"
- "process time tracking"
- "merge time blocks"
- "time range from blocks"
- "summarize time log"

## Input Format

CSV or table format with these columns:
- **Time**: Start time of 15-minute block (e.g., "7:45 AM")
- **Activity/Task**: Description of activity
- **Importance**: 1-10 rating (optional)
- **Energy**: 1-10 rating (optional)
- **client**: Client name (optional)
- **project**: Project name (optional)
- **type**: Activity type (optional)

**Example Input:**
```
Time,Activity/Task,Importance,Energy,client,project,type
7:30 AM,Get kids ready,10,6,,,
7:45 AM,Get kids ready,10,6,,,
8:00 AM,Call Josh Sapp,8,7,henderson,Job Master Automation,project management
8:15 AM,Drive Granny to Doc,10,7,,,
8:30 AM,Drive Granny to Doc,10,7,,,
```

## Output Format

Consolidated time ranges showing:
- **Start Time**: First block's time
- **End Time**: Next different activity's time
- **Duration**: Calculated duration
- All other columns from input

**Example Output:**
```
| Start Time | End Time | Duration | Activity/Task | Importance | Energy | Client | Project | Type |
|------------|----------|----------|---------------|------------|--------|--------|---------|------|
| 7:30 AM | 8:00 AM | 30m | Get kids ready | 10 | 6 | - | - | - |
| 8:00 AM | 8:15 AM | 15m | Call Josh Sapp | 8 | 7 | henderson | Job Master Automation | project management |
| 8:15 AM | 8:45 AM | 30m | Drive Granny to Doc | 10 | 7 | - | - | - |
```

## Logic

1. Each row represents a 15-minute block starting at the specified time
2. Consecutive rows with identical Activity/Task values are merged
3. Start time = first row's time
4. End time = next different activity's start time (or +15 minutes for last row)
5. Duration = (number of consecutive blocks) × 15 minutes

## Usage

### Via Skill Tool

```typescript
// Process CSV file
const result = await processTimeBlocks('/path/to/timedata.csv');

// Process from clipboard or text
const result = await processTimeBlocks(csvText);
```

### Via CLI Tool

```bash
# Process CSV file
bun ~/.claude/skills/TimeBlocks/Tools/ConsolidateBlocks.ts input.csv

# Process from stdin
cat timedata.csv | bun ~/.claude/skills/TimeBlocks/Tools/ConsolidateBlocks.ts

# Output markdown table
bun ~/.claude/skills/TimeBlocks/Tools/ConsolidateBlocks.ts input.csv --format=markdown

# Output CSV
bun ~/.claude/skills/TimeBlocks/Tools/ConsolidateBlocks.ts input.csv --format=csv
```

## Implementation

The skill uses a TypeScript CLI tool (`Tools/ConsolidateBlocks.ts`) that:
1. Parses CSV input
2. Groups consecutive rows with matching Activity/Task
3. Calculates time ranges
4. Outputs formatted results (markdown table or CSV)

## Edge Cases

- **Empty rows**: Treated as distinct activity (merged if consecutive)
- **Last row**: End time = start time + 15 minutes
- **Single block activities**: Duration = 15 minutes
- **Missing columns**: Handled gracefully with "-" in output

## Example Workflow

1. Export time tracking data as CSV with 15-minute blocks
2. Run: `bun ~/.claude/skills/TimeBlocks/Tools/ConsolidateBlocks.ts data.csv`
3. Get consolidated time ranges showing actual time spent per activity
4. Analyze patterns, total time by project/client, or create reports
