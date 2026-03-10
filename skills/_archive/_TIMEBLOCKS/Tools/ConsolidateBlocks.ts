#!/usr/bin/env bun

/**
 * TimeBlocks Consolidator
 *
 * Processes time-tracking data in 15-minute block format and consolidates
 * consecutive identical activities into time ranges.
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

interface TimeBlock {
  time: string;
  activity: string;
  importance?: string;
  energy?: string;
  client?: string;
  project?: string;
  type?: string;
  [key: string]: string | undefined;
}

interface ConsolidatedBlock {
  startTime: string;
  endTime: string;
  duration: string;
  activity: string;
  importance?: string;
  energy?: string;
  client?: string;
  project?: string;
  type?: string;
  [key: string]: string | undefined;
}

/**
 * Parse time string (e.g., "7:45 AM") and add minutes
 */
function addMinutes(timeStr: string, minutes: number): string {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return timeStr;

  let hours = parseInt(match[1]);
  let mins = parseInt(match[2]);
  const period = match[3].toUpperCase();

  // Convert to 24-hour
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  // Add minutes
  mins += minutes;
  while (mins >= 60) {
    hours += 1;
    mins -= 60;
  }

  // Convert back to 12-hour
  const newPeriod = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;

  return `${displayHours}:${mins.toString().padStart(2, '0')} ${newPeriod}`;
}

/**
 * Calculate duration in minutes between two times
 */
function calculateDuration(startTime: string, endTime: string): number {
  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const mins = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + mins;
  };

  const startMins = parseTime(startTime);
  const endMins = parseTime(endTime);

  return endMins - startMins;
}

/**
 * Format duration as "Xh Ym" or "Ym"
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Consolidate time blocks
 */
function consolidateBlocks(blocks: TimeBlock[]): ConsolidatedBlock[] {
  if (blocks.length === 0) return [];

  const consolidated: ConsolidatedBlock[] = [];
  let currentGroup: TimeBlock[] = [blocks[0]];

  for (let i = 1; i < blocks.length; i++) {
    const current = blocks[i];
    const previous = blocks[i - 1];

    // Check if activity matches (treating empty/undefined as matching)
    const currentActivity = current.activity?.trim() || '';
    const previousActivity = previous.activity?.trim() || '';

    if (currentActivity === previousActivity) {
      // Same activity - add to current group
      currentGroup.push(current);
    } else {
      // Different activity - consolidate current group and start new one
      consolidated.push(consolidateGroup(currentGroup, current.time));
      currentGroup = [current];
    }
  }

  // Consolidate final group (end time is +15 minutes from last block)
  const lastBlock = currentGroup[currentGroup.length - 1];
  const endTime = addMinutes(lastBlock.time, 15);
  consolidated.push(consolidateGroup(currentGroup, endTime));

  return consolidated;
}

/**
 * Consolidate a group of consecutive identical blocks
 */
function consolidateGroup(group: TimeBlock[], endTime: string): ConsolidatedBlock {
  const first = group[0];
  const startTime = first.time;
  const duration = calculateDuration(startTime, endTime);

  return {
    startTime,
    endTime,
    duration: formatDuration(duration),
    activity: first.activity || '',
    importance: first.importance,
    energy: first.energy,
    client: first.client,
    project: first.project,
    type: first.type,
  };
}

/**
 * Format as markdown table
 */
function formatMarkdown(blocks: ConsolidatedBlock[]): string {
  const headers = ['Start Time', 'End Time', 'Duration', 'Activity/Task', 'Importance', 'Energy', 'Client', 'Project', 'Type'];
  const separator = headers.map(h => '-'.repeat(Math.max(h.length, 10)));

  const rows = blocks.map(b => [
    b.startTime,
    b.endTime,
    b.duration,
    b.activity || '(empty)',
    b.importance || '-',
    b.energy || '-',
    b.client || '-',
    b.project || '-',
    b.type || '-',
  ]);

  const table = [
    '| ' + headers.join(' | ') + ' |',
    '| ' + separator.join(' | ') + ' |',
    ...rows.map(row => '| ' + row.join(' | ') + ' |'),
  ];

  return table.join('\n');
}

/**
 * Format as CSV
 */
function formatCSV(blocks: ConsolidatedBlock[]): string {
  const records = blocks.map(b => ({
    'Start Time': b.startTime,
    'End Time': b.endTime,
    'Duration': b.duration,
    'Activity/Task': b.activity || '',
    'Importance': b.importance || '',
    'Energy': b.energy || '',
    'Client': b.client || '',
    'Project': b.project || '',
    'Type': b.type || '',
  }));

  return stringify(records, { header: true });
}

/**
 * Main processing function
 */
async function main() {
  const args = process.argv.slice(2);
  const formatFlag = args.find(arg => arg.startsWith('--format='));
  const format = formatFlag ? formatFlag.split('=')[1] : 'markdown';
  const inputFile = args.find(arg => !arg.startsWith('--'));

  let csvData: string;

  if (inputFile) {
    // Read from file
    csvData = await Bun.file(inputFile).text();
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    csvData = Buffer.concat(chunks).toString('utf-8');
  }

  // Parse CSV
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Normalize column names
  const blocks: TimeBlock[] = records.map((record: any) => {
    const normalized: TimeBlock = {
      time: record.Time || record.time || '',
      activity: record['Activity/Task'] || record.Activity || record.activity || '',
      importance: record.Importance || record.importance,
      energy: record.Energy || record.energy,
      client: record.client || record.Client,
      project: record.project || record.Project,
      type: record.type || record.Type,
    };
    return normalized;
  });

  // Consolidate
  const consolidated = consolidateBlocks(blocks);

  // Output
  if (format === 'csv') {
    console.log(formatCSV(consolidated));
  } else {
    console.log(formatMarkdown(consolidated));
  }
}

main().catch(console.error);
