import { unstable_cache } from 'next/cache';
import { countSubmissionBlobs, listCommitFiles, listCommits } from './github';
import {
  DAILY_GOAL,
  TIMEZONE,
  calendarDay,
  computeStreak,
  dayCountsFromEvents,
  isSingleAddMessage,
  isSubmissionPath,
  totalSolutions,
} from './streak';

const MEMORY_TTL_MS = 10 * 60 * 1000;
const memoryCache = new Map();
const fileCache = new Map();

async function filesForCommit(owner, repo, sha) {
  const key = `${owner.toLowerCase()}/${repo.toLowerCase()}/${sha}`;
  if (fileCache.has(key)) return fileCache.get(key);
  const files = await listCommitFiles(owner, repo, sha);
  fileCache.set(key, files);
  return files;
}

async function mapPool(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current]);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function eventsFromCommits(owner, repo, commits, fetchAllFiles) {
  return mapPool(commits, 4, async (commit) => {
    const useMessage =
      !fetchAllFiles && isSingleAddMessage(commit.message);
    const files = useMessage
      ? null
      : await filesForCommit(owner, repo, commit.sha);
    return {
      committedAt: commit.committedAt,
      message: commit.message,
      files,
    };
  });
}

async function computeRepoStreak(owner, repo) {
  const commits = await listCommits(owner, repo);
  let events = await eventsFromCommits(owner, repo, commits, false);
  let counts = dayCountsFromEvents(events);

  const blobs = await countSubmissionBlobs(owner, repo, isSubmissionPath);
  if (blobs !== null && blobs !== totalSolutions(counts)) {
    // Adds/deletes drifted from the commit messages, so trust each file's
    // GitHub status instead of the message shortcut.
    events = await eventsFromCommits(owner, repo, commits, true);
    counts = dayCountsFromEvents(events);
  }

  const today = calendarDay(new Date());
  const streak = computeStreak(counts, today);

  return {
    owner,
    repo,
    timezone: TIMEZONE,
    goal: DAILY_GOAL,
    today,
    todayCount: streak.todayCount,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
  };
}

const getCachedRepoStreak = unstable_cache(
  async (owner, repo) => computeRepoStreak(owner, repo),
  ['neetcode-streak-v1'],
  { revalidate: 600 }
);

export async function getNeetcodeStreak(owner, repo) {
  const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.at < MEMORY_TTL_MS) {
    return hit.value;
  }

  const value = await getCachedRepoStreak(owner, repo);
  memoryCache.set(key, { at: Date.now(), value });
  return value;
}
