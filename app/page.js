'use client';

import { useState, useEffect } from 'react';
import LeaderboardCard from '../components/LeaderboardCard';

export default function Home() {
  const [usernames, setUsernames] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [inputName, setInputName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('leetcode-friends');
    if (saved) {
      try {
        setUsernames(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved usernames', e);
      }
    }
    // We will start loading data right away if there are usernames
    setIsLoading(false);
  }, []);

  // Save to local storage when usernames change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('leetcode-friends', JSON.stringify(usernames));
    }
  }, [usernames, isLoading]);

  // Fetch user data
  useEffect(() => {
    async function fetchAllUsers() {
      if (usernames.length === 0) {
        setUsersData([]);
        return;
      }
      
      const newData = [];
      for (const username of usernames) {
        try {
          const res = await fetch(`/api/leetcode?username=${encodeURIComponent(username)}`);
          if (res.ok) {
            const data = await res.json();
            newData.push(data);
          }
        } catch (err) {
          console.error(`Failed to fetch for ${username}`, err);
        }
      }
      setUsersData(newData);
    }

    if (!isLoading) {
      fetchAllUsers();
    }
  }, [usernames, isLoading]);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setError('');
    
    const name = inputName.trim();
    if (!name) return;

    if (usernames.some(u => u.toLowerCase() === name.toLowerCase())) {
      setError('User is already on your leaderboard.');
      return;
    }

    // Verify user exists before adding
    try {
      const res = await fetch(`/api/leetcode?username=${encodeURIComponent(name)}`);
      if (res.ok) {
        setUsernames([...usernames, name]);
        setInputName('');
      } else {
        const data = await res.json();
        setError(data.error || 'User not found on LeetCode.');
      }
    } catch (err) {
      setError('Failed to connect to API.');
    }
  };

  const handleRemoveFriend = (usernameToRemove) => {
    setUsernames(usernames.filter(u => u !== usernameToRemove));
  };

  // Sort by total solved problems (All)
  const sortedUsers = [...usersData].sort((a, b) => {
    const getCount = (user) => {
      const stats = user.submitStats?.acSubmissionNum || [];
      return stats.find(s => s.difficulty === 'All')?.count || 0;
    };
    return getCount(b) - getCount(a);
  });

  return (
    <div className="container">
      <div className="header-section">
        <h1>LeetCode Leaderboard</h1>
        <p>Track progress and stay consistent with your friends</p>
      </div>

      <form className="input-group" onSubmit={handleAddFriend}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Enter LeetCode username..." 
            value={inputName}
            onChange={(e) => {
              setInputName(e.target.value);
              setError('');
            }}
          />
          {error && <div style={{ color: 'var(--diff-hard)', fontSize: '0.85rem', position: 'absolute', bottom: '-1.5rem', left: '0.5rem' }}>{error}</div>}
        </div>
        <button type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Friend
        </button>
      </form>

      <div className="leaderboard-list">
        {usernames.length === 0 ? (
          <div className="empty-state glass-panel">
            <h3>No friends added yet!</h3>
            <p>Add some LeetCode usernames above to start competing.</p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="empty-state glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--accent-secondary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
            <p>Loading leaderboard stats...</p>
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
