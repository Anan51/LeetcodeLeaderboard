// NeetCode GitHub sync layout (see Anan51/neetcode-submissions):
//   <topic>/<problem-id>/submission-<n>.<ext>
//   Commit "Add: <problem> - submission-<n>" adds one new file.
//   Commit "Bulk sync: <n> submissions" adds n files at once.
//   README-only "Initialize NeetCode solutions repository" is not a solution.
// GitHub marks a newly landed file with status "added". Non-accepted attempts
// are absent when the repo's status filter is "accepted only" (submission
// indexes are not contiguous). An explicit accepted/approved or rejected
// marker in the commit message overrides that when one is present.

export const TIMEZONE = 'America/Los_Angeles';
export const DAILY_GOAL = 2;

const ADD_MESSAGE = /^Add:\s+.+?\s+-\s+submission-\d+\s*$/;
const BULK_MESSAGE = /^Bulk sync:\s+(\d+)\s+submissions?\s*$/i;
const SUBMISSION_PATH = /(?:^|\/)submission-\d+\.[A-Za-z0-9]+$/i;
const ACCEPTED_MARKER = /\b(accepted|approved)\b/i;
const REJECTED_MARKER =
  /\b(wrong answer|runtime error|compile error|time limit exceeded|memory limit exceeded|output limit exceeded|rejected)\b/i;

export function isSingleAddMessage(message) {
  const firstLine = firstLineOf(message);
  return ADD_MESSAGE.test(firstLine);
}

export function calendarDay(date, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  if (!year || !month || !day) {
    throw new Error(`Unable to format ${date.toISOString()} in ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

export function shiftCalendarDay(day, delta) {
  const [year, month, date] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

function firstLineOf(message) {
  return String(message || '').split(/\r?\n/, 1)[0].trim();
}

function messageSaysRejected(message) {
  return REJECTED_MARKER.test(message) && !ACCEPTED_MARKER.test(message);
}

export function isSubmissionPath(filename) {
  return SUBMISSION_PATH.test(filename || '');
}

function countAddedSubmissionFiles(files) {
  return files.filter(
    (file) =>
      file &&
      String(file.status || '').toLowerCase() === 'added' &&
      isSubmissionPath(file.filename)
  ).length;
}

// files === null means the commit body was not fetched; use the message.
// An array of { filename, status } is authoritative (GitHub file status).
export function countSolutions(event) {
  const message = event.message || '';
  if (messageSaysRejected(message)) return 0;

  if (Array.isArray(event.files)) {
    return countAddedSubmissionFiles(event.files);
  }

  const firstLine = firstLineOf(message);
  if (ADD_MESSAGE.test(firstLine)) return 1;

  const bulk = firstLine.match(BULK_MESSAGE);
  if (bulk) return Number(bulk[1]);

  return 0;
}

export function dayCountsFromEvents(events, timeZone = TIMEZONE) {
  const counts = new Map();
  for (const event of events) {
    if (!event?.committedAt) continue;
    const solved = countSolutions(event);
    if (solved <= 0) continue;
    const day = calendarDay(new Date(event.committedAt), timeZone);
    counts.set(day, (counts.get(day) || 0) + solved);
  }
  return counts;
}

export function totalSolutions(counts) {
  let total = 0;
  for (const count of counts.values()) total += count;
  return total;
}

export function computeStreak(counts, today, goal = DAILY_GOAL) {
  const todayCount = counts.get(today) || 0;

  let currentStreak = 0;
  let cursor = todayCount >= goal ? today : shiftCalendarDay(today, -1);
  while ((counts.get(cursor) || 0) >= goal) {
    currentStreak += 1;
    cursor = shiftCalendarDay(cursor, -1);
    if (currentStreak > 20000) break;
  }

  const qualifying = [...counts.keys()]
    .filter((day) => day <= today && (counts.get(day) || 0) >= goal)
    .sort();

  let longestStreak = 0;
  let run = 0;
  let previous = null;
  for (const day of qualifying) {
    if (previous && shiftCalendarDay(previous, 1) === day) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    previous = day;
  }

  return {
    todayCount,
    currentStreak,
    longestStreak,
  };
}
