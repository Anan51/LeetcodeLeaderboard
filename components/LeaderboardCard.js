'use client';

export default function LeaderboardCard({ user, rank, onRemove }) {
  const stats = user.submitStats?.acSubmissionNum || [];
  
  const allStat = stats.find(s => s.difficulty === 'All')?.count || 0;
  const easyStat = stats.find(s => s.difficulty === 'Easy')?.count || 0;
  const mediumStat = stats.find(s => s.difficulty === 'Medium')?.count || 0;
  const hardStat = stats.find(s => s.difficulty === 'Hard')?.count || 0;

  const easyPercent = allStat > 0 ? (easyStat / allStat) * 100 : 0;
  const mediumPercent = allStat > 0 ? (mediumStat / allStat) * 100 : 0;
  const hardPercent = allStat > 0 ? (hardStat / allStat) * 100 : 0;

  return (
    <div className="leaderboard-card glass-panel animate-fade-in" style={{ animationDelay: `${Math.min(rank, 10) * 0.1}s` }}>
      <div className={`rank-badge rank-${rank}`}>
        #{rank}
      </div>
      
      <div className="user-info">
        <img 
          src={user.profile?.userAvatar || 'https://assets.leetcode.com/users/avatar/avatar_150x150.png'} 
          alt={`${user.username}'s avatar`}
          className="avatar"
          onError={(e) => {
            e.target.src = 'https://assets.leetcode.com/users/avatar/avatar_150x150.png';
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="username" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.username}
          </div>
          {user.profile?.realName && (
            <div className="real-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.profile.realName}
            </div>
          )}
          
          <div className="progress-bar-container">
            <div className="progress-segment progress-easy" style={{ width: `${easyPercent}%` }}></div>
            <div className="progress-segment progress-medium" style={{ width: `${mediumPercent}%` }}></div>
            <div className="progress-segment progress-hard" style={{ width: `${hardPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-label">Total</span>
          <span className="stat-value stat-total">{allStat}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Easy</span>
          <span className="stat-value stat-easy">{easyStat}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Medium</span>
          <span className="stat-value stat-medium">{mediumStat}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Hard</span>
          <span className="stat-value stat-hard">{hardStat}</span>
        </div>
      </div>

      <button onClick={() => onRemove(user.username)} className="remove-btn" title="Remove friend">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}
