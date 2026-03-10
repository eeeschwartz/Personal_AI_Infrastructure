# TimeBlocks Skill

Process and consolidate time-tracking data in 15-minute block format into readable time ranges.

## Quick Start

```bash
# Process CSV file
bun Tools/ConsolidateBlocks.ts input.csv

# Process from stdin
cat timedata.csv | bun Tools/ConsolidateBlocks.ts

# Output as CSV
bun Tools/ConsolidateBlocks.ts input.csv --format=csv
```

## Example

**Input:** (15-minute blocks)
```csv
Time,Activity/Task,Importance,Energy,client,project,type
7:30 AM,Get kids ready,10,6,,,
7:45 AM,Get kids ready,10,6,,,
8:00 AM,Call Josh Sapp,8,7,henderson,Job Master Automation,project management
```

**Output:** (Consolidated time ranges)
```
| Start Time | End Time | Duration | Activity/Task | Importance | Energy | Client | Project | Type |
| 7:30 AM | 8:00 AM | 30m | Get kids ready | 10 | 6 | - | - | - |
| 8:00 AM | 8:15 AM | 15m | Call Josh Sapp | 8 | 7 | henderson | Job Master Automation | project management |
```

## How It Works

1. Each row in your CSV represents a 15-minute block
2. Consecutive rows with identical Activity/Task values are merged
3. Start time = first block's time
4. End time = next different activity's start time
5. Duration = (number of consecutive blocks) × 15 minutes

See `SKILL.md` for full documentation.
