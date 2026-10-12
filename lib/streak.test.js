import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAILY_GOAL,
  calendarDay,
  computeStreak,
  countSolutions,
  dayCountsFromEvents,
  totalSolutions,
} from './streak.js';

// Commit history of github.com/Anan51/neetcode-submissions as of 2026-10-12.
// "Add" commits are one new submission. The May 8 bulk sync added 8 files.
const HISTORY = [
  ['2026-10-12T05:21:13Z', 'Add: daily-temperatures - submission-7'],
  ['2026-10-12T05:13:43Z', 'Add: daily-temperatures - submission-5'],
  ['2026-10-12T04:21:41Z', 'Add: evaluate-reverse-polish-notation - submission-7'],
  ['2026-10-11T05:20:40Z', 'Add: minimum-stack - submission-0'],
  ['2026-10-11T05:06:47Z', 'Add: validate-parentheses - submission-1'],
  ['2026-10-08T19:09:40Z', 'Add: binary-tree-diameter - submission-1'],
  ['2026-10-08T18:56:17Z', 'Add: depth-of-binary-tree - submission-0'],
  ['2026-10-06T22:48:49Z', 'Add: minimum-recolors-to-get-k-consecutive-black-blocks - submission-1'],
  ['2026-10-06T22:23:47Z', 'Add: majority-element - submission-6'],
  ['2026-10-06T21:11:34Z', 'Add: search-2d-matrix - submission-2'],
  ['2026-10-06T21:08:03Z', 'Add: binary-search - submission-3'],
  ['2026-10-06T21:07:45Z', 'Add: binary-search - submission-1'],
  ['2026-10-06T05:08:50Z', 'Add: permutation-string - submission-2'],
  ['2026-10-06T05:07:40Z', 'Add: permutation-string - submission-1'],
  ['2026-10-06T03:15:58Z', 'Add: longest-substring-without-duplicates - submission-3'],
  ['2026-10-06T03:15:48Z', 'Add: longest-substring-without-duplicates - submission-2'],
  ['2026-10-06T03:04:22Z', 'Add: buy-and-sell-crypto - submission-0'],
  ['2026-10-05T06:26:27Z', 'Add: trapping-rain-water - submission-5'],
  ['2026-10-05T05:30:02Z', 'Add: max-water-container - submission-3'],
  ['2026-10-05T05:29:54Z', 'Add: max-water-container - submission-2'],
  ['2026-10-05T05:08:49Z', 'Add: three-integer-sum - submission-7'],
  ['2026-10-05T05:04:50Z', 'Add: three-integer-sum - submission-6'],
  ['2026-10-03T04:43:51Z', 'Add: two-integer-sum-ii - submission-1'],
  ['2026-10-03T04:42:41Z', 'Add: two-integer-sum-ii - submission-0'],
  ['2026-10-03T04:39:51Z', 'Add: is-palindrome - submission-0'],
  ['2026-10-03T04:39:27Z', 'Add: longest-consecutive-sequence - submission-7'],
  ['2026-10-03T04:38:18Z', 'Add: longest-consecutive-sequence - submission-5'],
  ['2026-10-03T04:38:04Z', 'Add: longest-consecutive-sequence - submission-4'],
  ['2026-10-03T03:46:04Z', 'Add: valid-sudoku - submission-1'],
  ['2026-10-03T03:03:05Z', 'Add: products-of-array-discluding-self - submission-3'],
  ['2026-10-02T02:54:24Z', 'Add: string-encode-and-decode - submission-3'],
  ['2026-10-02T02:54:12Z', 'Add: string-encode-and-decode - submission-2'],
  ['2026-10-01T05:13:17Z', 'Add: anagram-groups - submission-1'],
  ['2026-10-01T04:48:31Z', 'Add: duplicate-integer - submission-2'],
  ['2026-05-08T17:54:17Z', 'Bulk sync: 8 submissions', 8],
  ['2026-05-08T17:54:01Z', 'Initialize NeetCode solutions repository', 0],
];

function historyEvents() {
  return HISTORY.map(([committedAt, message, fileCount]) => {
    if (fileCount === 8) {
      return {
        committedAt,
        message,
        files: Array.from({ length: 8 }, (_, index) => ({
          filename: `Data Structures & Algorithms/problem-${index}/submission-0.py`,
          status: 'added',
        })),
      };
    }
    if (fileCount === 0) {
      return {
        committedAt,
        message,
        files: [{ filename: 'README.md', status: 'added' }],
      };
    }
    return { committedAt, message, files: null };
  });
}

function streakAt(iso) {
  const counts = dayCountsFromEvents(historyEvents());
  return computeStreak(counts, calendarDay(new Date(iso)));
}

test('Pacific calendar day follows America/Los_Angeles, including PST', () => {
  assert.equal(calendarDay(new Date('2026-10-12T05:21:13Z')), '2026-10-11');
  assert.equal(calendarDay(new Date('2026-10-12T07:00:00Z')), '2026-10-12');
  assert.equal(calendarDay(new Date('2026-11-02T07:30:00Z')), '2026-11-01');
  assert.equal(calendarDay(new Date('2026-11-02T08:30:00Z')), '2026-11-02');
});

test('Anan51 history: 42 accepted solutions and the streak at 2026-10-12 05:31Z', () => {
  const counts = dayCountsFromEvents(historyEvents());
  assert.equal(totalSolutions(counts), 42);
  assert.equal(DAILY_GOAL, 2);

  const streak = streakAt('2026-10-12T05:31:00Z');
  assert.deepEqual(streak, {
    todayCount: 3,
    currentStreak: 2,
    longestStreak: 3,
  });
});

test('a day that has not reached 2 solutions does not break the streak until it ends', () => {
  const duringGap = streakAt('2026-10-12T15:00:00Z');
  assert.equal(calendarDay(new Date('2026-10-12T15:00:00Z')), '2026-10-12');
  assert.deepEqual(duringGap, {
    todayCount: 0,
    currentStreak: 2,
    longestStreak: 3,
  });
});

test('longest run is three days, and a fresh qualifying day starts a new streak', () => {
  assert.deepEqual(streakAt('2026-10-06T23:00:00Z'), {
    todayCount: 5,
    currentStreak: 3,
    longestStreak: 3,
  });
  assert.deepEqual(streakAt('2026-10-08T20:00:00Z'), {
    todayCount: 2,
    currentStreak: 1,
    longestStreak: 3,
  });
});

test('file status "added" counts, modifications and non-solutions do not', () => {
  assert.equal(
    countSolutions({
      message: 'Update note',
      files: [
        {
          filename: 'Data Structures & Algorithms/two-integer-sum/submission-0.py',
          status: 'added',
        },
        {
          filename: 'Data Structures & Algorithms/two-integer-sum/submission-1.py',
          status: 'modified',
        },
        { filename: 'README.md', status: 'added' },
      ],
    }),
    1
  );
});

test('an explicit rejection marker drops the commit even if files were added', () => {
  assert.equal(
    countSolutions({
      message: 'Add: two-integer-sum - submission-2\n\nStatus: Wrong Answer',
      files: [
        {
          filename: 'Data Structures & Algorithms/two-integer-sum/submission-2.py',
          status: 'added',
        },
      ],
    }),
    0
  );
});

test('an accepted marker keeps added submission files', () => {
  assert.equal(
    countSolutions({
      message: 'Sync two-integer-sum\nStatus: Accepted',
      files: [
        {
          filename: 'Data Structures & Algorithms/two-integer-sum/submission-4.py',
          status: 'added',
        },
      ],
    }),
    1
  );
  assert.equal(
    countSolutions({
      message: 'Add: two-integer-sum - submission-4\nStatus: approved',
      files: null,
    }),
    1
  );
});
