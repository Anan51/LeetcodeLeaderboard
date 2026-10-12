'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import LeaderboardCard from '../components/LeaderboardCard';

const FRIENDS_KEY = 'leetcode-friends';
const friendListeners = new Set();

function emptySubscribe() {
  return () => {};
}

function subscribeFriends(listener) {
  friendListeners.add(listener);
  return () => friendListeners.delete(listener);
}

function readRawFriends() {
  return localStorage.getItem(FRIENDS_KEY) || '[]';
}

function writeRawFriends(raw) {
  localStorage.setItem(FRIENDS_KEY, raw);
  friendListeners.forEach((listener) => listener());
}

function normalizeFriend(entry) {
  if (typeof entry === 'string') {
    const leetcode = entry.trim();
    if (!leetcode) return null;
    return { leetcode, githubOwner: '', githubRepo: '' };
  }

  if (!entry || typeof entry !== 'object') return null;

  const leetcode = String(entry.leetcode || entry.username || '').trim();
  if (!leetcode) return null;

  return {
    leetcode,
    githubOwner: String(entry.githubOwner || entry.owner || '').trim().replace(/^@/, ''),
    githubRepo: String(entry.githubRepo || entry.repo || '').trim().replace(/\.git$/, ''),
  };
}

function parseGithub(ownerInput, repoInput) {
  const owner = ownerInput.trim().replace(/^@/, '');
  const repo = repoInput.trim().replace(/\.git$/, '');
  const combined = `${owner} ${repo}`;
  const urlMatch = combined.match(/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/i);
  if (urlMatch) {
    return {
      githubOwner: urlMatch[1],
      githubRepo: urlMatch[2].replace(/\.git$/, ''),
    };
  }
  return { githubOwner: owner, githubRepo: repo };
}

function parseFriends(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeFriend).filter(Boolean);
  } catch (parseError) {
    console.error('Failed to parse saved friends', parseError);
    return [];
  }
}

export default function Home() {
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const rawFriends = useSyncExternalStore(subscribeFriends, readRawFriends, () => '[]');
  const friends = useMemo(() => parseFriends(rawFriends), [rawFriends]);
  const [usersData, setUsersData] = useState([]);
  const [leetcodeInput, setLeetcodeInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [loadedKey, setLoadedKey] = useState(null);
  const statsReady = loadedKey === rawFriends;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const saveFriends = (nextFriends) => {
    writeRawFriends(JSON.stringify(nextFriends));
  };

  useEffect(() => {
    if (!hydrated) return undefined;

    let cancelled = false;
    const requestKey = rawFriends;

    async function fetchAllUsers() {
      if (friends.length === 0) return [];

      const results = await Promise.all(friends.map(async (friend) => {
        try {
          const leetcodePromise = fetch(`/api/leetcode?username=${encodeURIComponent(friend.leetcode)}`);
          const streakPromise = friend.githubOwner && friend.githubRepo
            ? fetch(`/api/neetcode?owner=${encodeURIComponent(friend.githubOwner)}&repo=${encodeURIComponent(friend.githubRepo)}`)
            : Promise.resolve(null);

          const [leetcodeRes, streakRes] = await Promise.all([leetcodePromise, streakPromise]);
          if (!leetcodeRes.ok) return null;

          const user = await leetcodeRes.json();
          let neetcode = null;
          let neetcodeError = '';

          if (!friend.githubOwner || !friend.githubRepo) {
            neetcodeError = 'No NeetCode repo linked';
          } else if (streakRes?.ok) {
            neetcode = await streakRes.json();
          } else if (streakRes) {
            const body = await streakRes.json().catch(() => ({}));
            neetcodeError = body.error || 'Streak unavailable';
          }

          return {
            ...user,
            githubOwner: friend.githubOwner,
            githubRepo: friend.githubRepo,
            neetcode,
            neetcodeError,
          };
        } catch (fetchError) {
          console.error(`Failed to fetch for ${friend.leetcode}`, fetchError);
          return null;
        }
      }));

      return results.filter(Boolean);
    }

    fetchAllUsers().then((users) => {
      if (!cancelled) {
        setUsersData(users);
        setLoadedKey(requestKey);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [friends, hydrated, rawFriends]);

  const handleAddFriend = async (event) => {
    event.preventDefault();
    setError('');

    const leetcode = leetcodeInput.trim();
    const { githubOwner, githubRepo } = parseGithub(ownerInput, repoInput);

    if (!leetcode || !githubOwner || !githubRepo) {
      setError('LeetCode username, GitHub username, and repository name are all required.');
      return;
    }

    if (friends.some((friend) => friend.leetcode.toLowerCase() === leetcode.toLowerCase())) {
      setError('That LeetCode user is already on your leaderboard.');
      return;
    }

    setIsSubmitting(true);
    try {
      const [leetcodeRes, streakRes] = await Promise.all([
        fetch(`/api/leetcode?username=${encodeURIComponent(leetcode)}`),
        fetch(`/api/neetcode?owner=${encodeURIComponent(githubOwner)}&repo=${encodeURIComponent(githubRepo)}`),
      ]);

      if (!leetcodeRes.ok) {
        const data = await leetcodeRes.json().catch(() => ({}));
        setError(data.error || 'User not found on LeetCode.');
        return;
      }

      if (!streakRes.ok) {
        const data = await streakRes.json().catch(() => ({}));
        setError(data.error || 'NeetCode repository not found.');
        return;
      }

      saveFriends([...friends, { leetcode, githubOwner, githubRepo }]);
      setLeetcodeInput('');
      setOwnerInput('');
      setRepoInput('');
    } catch {
      setError('Failed to connect to the leaderboard API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFriend = (leetcodeUsername) => {
    saveFriends(friends.filter(
      (friend) => friend.leetcode.toLowerCase() !== leetcodeUsername.toLowerCase()
    ));
  };

  const sortedUsers = [...usersData].sort((a, b) => {
    const getCount = (user) => {
      const stats = user.submitStats?.acSubmissionNum || [];
      return stats.find((stat) => stat.difficulty === 'All')?.count || 0;
    };
    return getCount(b) - getCount(a);
  });

  return (
    <div className="container">
      <div className="header-section">
        <h1>LeetCode Leaderboard</h1>
        <p>Track progress with your friends, plus a daily NeetCode streak.</p>
        <p className="streak-rule">
          A streak day is at least 2 new accepted solutions in a public NeetCode GitHub repo, counted in Pacific time.
        </p>
      </div>

      <form className="friend-form glass-panel" onSubmit={handleAddFriend}>
        <div className="friend-fields">
          <div className="field">
            <label htmlFor="leetcode-username">LeetCode</label>
            <input
              id="leetcode-username"
              type="text"
              placeholder="username"
              autoComplete="off"
              spellCheck={false}
              value={leetcodeInput}
              onChange={(event) => {
                setLeetcodeInput(event.target.value);
                setError('');
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="github-owner">GitHub username</label>
            <input
              id="github-owner"
              type="text"
              placeholder="Anan51"
              autoComplete="off"
              spellCheck={false}
              value={ownerInput}
              onChange={(event) => {
                setOwnerInput(event.target.value);
                setError('');
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="github-repo">Repository</label>
            <input
              id="github-repo"
              type="text"
              placeholder="neetcode-submissions"
              autoComplete="off"
              spellCheck={false}
              value={repoInput}
              onChange={(event) => {
                setRepoInput(event.target.value);
                setError('');
              }}
            />
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={isSubmitting}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {isSubmitting ? 'Checking…' : 'Add Friend'}
        </button>
      </form>

      <div className="leaderboard-list">
        {!hydrated || !statsReady ? (
          <div className="empty-state glass-panel loading-state">
            <div className="animate-spin spinner"></div>
            <p>Loading leaderboard stats...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="empty-state glass-panel">
            <h3>No friends added yet!</h3>
            <p>Add a LeetCode username and the GitHub repo where NeetCode syncs their solutions.</p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="empty-state glass-panel">
            <h3>Couldn&apos;t load those profiles</h3>
            <p>Check the usernames and try adding them again.</p>
          </div>
        ) : (
          sortedUsers.map((user, index) => (
            <LeaderboardCard
              key={user.username}
              user={user}
              rank={index + 1}
              onRemove={handleRemoveFriend}
            />
          ))
        )}
      </div>
    </div>
  );
}
