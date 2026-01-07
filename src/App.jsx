import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Tradeport API - Replace with actual API calls
const fetchCollectionMetadata = async (contractAddress) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    name: `Collection ${contractAddress.slice(0, 8)}`,
    thumbnail: `https://via.placeholder.com/80?text=${contractAddress.slice(0, 4)}`,
    floorPrice: (Math.random() * 10).toFixed(2),
    volume24h: (Math.random() * 100).toFixed(2),
    items: Math.floor(Math.random() * 10000)
  };
};

// Discord OAuth Mock - Replace with actual Discord OAuth
const initiateDiscordAuth = () => {
  // In production, redirect to Discord OAuth endpoint
  const clientId = 'YOUR_DISCORD_CLIENT_ID';
  const redirectUri = encodeURIComponent(window.location.origin + '/callback');
  const scope = 'identify guilds.members.read';
  window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
};

const MovementVote = () => {
  // State Management
  const [currentPeriod, setCurrentPeriod] = useState('submission'); // 'submission', 'voting', 'winner'
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [votes, setVotes] = useState([]);
  const [winners, setWinners] = useState([]);
  const [newContract, setNewContract] = useState('');
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load stored data on mount
  useEffect(() => {
    const storedUser = window.storage ? null : localStorage.getItem('user');
    const storedSubmissions = window.storage ? null : localStorage.getItem('submissions');
    const storedVotes = window.storage ? null : localStorage.getItem('votes');
    const storedWinners = window.storage ? null : localStorage.getItem('winners');
    const storedPeriod = window.storage ? null : localStorage.getItem('period');

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedSubmissions) setSubmissions(JSON.parse(storedSubmissions));
    if (storedVotes) setVotes(JSON.parse(storedVotes));
    if (storedWinners) setWinners(JSON.parse(storedWinners));
    if (storedPeriod) setCurrentPeriod(storedPeriod);

    // Load from persistent storage if available
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    if (!window.storage) return;
    
    try {
      const userData = await window.storage.get('user-data');
      const submissionsData = await window.storage.get('submissions-data');
      const votesData = await window.storage.get('votes-data');
      const winnersData = await window.storage.get('winners-data');
      const periodData = await window.storage.get('period-data');

      if (userData?.value) setUser(JSON.parse(userData.value));
      if (submissionsData?.value) setSubmissions(JSON.parse(submissionsData.value));
      if (votesData?.value) setVotes(JSON.parse(votesData.value));
      if (winnersData?.value) setWinners(JSON.parse(winnersData.value));
      if (periodData?.value) setCurrentPeriod(periodData.value);
    } catch (error) {
      console.log('No stored data found or storage not available');
    }
  };

  const saveToStorage = async (key, value) => {
    if (window.storage) {
      try {
        await window.storage.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (error) {
        console.error('Storage error:', error);
      }
    } else {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  };

  // Authentication
  const handleLogin = () => {
    // Mock login - Replace with actual Discord OAuth
    const mockUser = {
      id: 'user_' + Date.now(),
      username: 'TestUser',
      discriminator: '1234',
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      hasRequiredRole: true
    };
    setUser(mockUser);
    saveToStorage('user-data', mockUser);
    
    // Check if admin
    const adminIds = ['admin_discord_id_1', 'admin_discord_id_2'];
    setIsAdmin(adminIds.includes(mockUser.id));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    if (window.storage) {
      window.storage.delete('user-data');
    } else {
      localStorage.removeItem('user');
    }
  };

  // Submission Handler
  const handleSubmitCollection = async () => {
    if (!newContract.trim()) return;
    
    setLoadingMetadata(true);
    try {
      const metadata = await fetchCollectionMetadata(newContract);
      const submission = {
        id: Date.now(),
        contractAddress: newContract,
        submitter: user.id,
        submittedAt: new Date().toISOString(),
        ...metadata,
        voteCount: 0
      };
      
      const updatedSubmissions = [...submissions, submission];
      setSubmissions(updatedSubmissions);
      saveToStorage('submissions-data', updatedSubmissions);
      setNewContract('');
    } catch (error) {
      alert('Failed to fetch collection metadata');
    } finally {
      setLoadingMetadata(false);
    }
  };

  // Voting Handler
  const handleVote = (submissionId) => {
    const userVotes = votes.filter(v => v.userId === user.id);
    
    // Check if already voted for this collection
    if (userVotes.find(v => v.submissionId === submissionId)) {
      // Remove vote
      const updatedVotes = votes.filter(v => !(v.userId === user.id && v.submissionId === submissionId));
      setVotes(updatedVotes);
      saveToStorage('votes-data', updatedVotes);
      
      // Update submission vote count
      const updatedSubmissions = submissions.map(s => 
        s.id === submissionId ? { ...s, voteCount: s.voteCount - 1 } : s
      );
      setSubmissions(updatedSubmissions);
      saveToStorage('submissions-data', updatedSubmissions);
    } else if (userVotes.length < 5) {
      // Add vote
      const newVote = {
        id: Date.now(),
        userId: user.id,
        submissionId,
        votedAt: new Date().toISOString()
      };
      const updatedVotes = [...votes, newVote];
      setVotes(updatedVotes);
      saveToStorage('votes-data', updatedVotes);
      
      // Update submission vote count
      const updatedSubmissions = submissions.map(s => 
        s.id === submissionId ? { ...s, voteCount: s.voteCount + 1 } : s
      );
      setSubmissions(updatedSubmissions);
      saveToStorage('submissions-data', updatedSubmissions);
    }
  };

  const hasVoted = (submissionId) => {
    return votes.some(v => v.userId === user.id && v.submissionId === submissionId);
  };

  const getUserVoteCount = () => {
    return votes.filter(v => v.userId === user.id).length;
  };

  // Period Management
  const advancePeriod = () => {
    if (currentPeriod === 'submission') {
      setCurrentPeriod('voting');
      saveToStorage('period-data', 'voting');
    } else if (currentPeriod === 'voting') {
      // Calculate winners
      const sorted = [...submissions].sort((a, b) => b.voteCount - a.voteCount);
      const top15 = sorted.slice(0, 15);
      setWinners(top15);
      saveToStorage('winners-data', top15);
      setCurrentPeriod('winner');
      saveToStorage('period-data', 'winner');
    } else if (currentPeriod === 'winner') {
      // Reset for new cycle
      setSubmissions([]);
      setVotes([]);
      setWinners([]);
      saveToStorage('submissions-data', []);
      saveToStorage('votes-data', []);
      saveToStorage('winners-data', []);
      setCurrentPeriod('submission');
      saveToStorage('period-data', 'submission');
    }
  };

  // Admin exports
  const exportData = (type) => {
    let data, filename;
    if (type === 'winners') {
      data = winners;
      filename = 'winners.json';
    } else if (type === 'votes') {
      data = votes;
      filename = 'votes.json';
    } else if (type === 'logins') {
      data = [user]; // In production, collect all login records
      filename = 'logins.json';
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white font-sans overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="border-b border-cyan-500/30 backdrop-blur-xl bg-slate-950/50"
        >
          <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-black">M</span>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Movement Vote
                </h1>
                <p className="text-xs text-cyan-300/60 tracking-wider uppercase">NFT Collection Voting</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 border border-cyan-500/30 rounded-lg">
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                >
                  Connect Discord
                </button>
              )}
            </div>
          </div>
        </motion.header>

        {/* Period Indicator */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-7xl mx-auto px-6 py-8"
        >
          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {currentPeriod === 'submission' && 'Submission Period'}
                  {currentPeriod === 'voting' && 'Voting Period'}
                  {currentPeriod === 'winner' && 'Winners Display'}
                </h2>
                <p className="text-cyan-300/60">
                  {currentPeriod === 'submission' && 'Submit your favorite NFT collections'}
                  {currentPeriod === 'voting' && 'Vote for up to 5 collections'}
                  {currentPeriod === 'winner' && "This month's official core collections"}
                </p>
              </div>
              
              {isAdmin && (
                <button
                  onClick={advancePeriod}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Advance Period →
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <AnimatePresence mode="wait">
            {/* Submission Period */}
            {currentPeriod === 'submission' && (
              <motion.div
                key="submission"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {user && user.hasRequiredRole ? (
                  <>
                    <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-8 mb-8 backdrop-blur-xl">
                      <h3 className="text-2xl font-bold mb-6 text-cyan-300">Submit Collection</h3>
                      <div className="flex gap-4">
                        <input
                          type="text"
                          value={newContract}
                          onChange={(e) => setNewContract(e.target.value)}
                          placeholder="Enter contract address (0x...)"
                          className="flex-1 px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                        />
                        <button
                          onClick={handleSubmitCollection}
                          disabled={loadingMetadata}
                          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50"
                        >
                          {loadingMetadata ? 'Loading...' : 'Submit'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-cyan-300">Current Submissions</h3>
                      {submissions.length === 0 ? (
                        <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-12 text-center backdrop-blur-xl">
                          <p className="text-cyan-300/60">No collections submitted yet</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {submissions.map((submission, index) => (
                            <motion.div
                              key={submission.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-xl hover:border-cyan-400/50 transition-colors"
                            >
                              <div className="flex items-center gap-6">
                                <img 
                                  src={submission.thumbnail} 
                                  alt={submission.name}
                                  className="w-20 h-20 rounded-lg border border-cyan-500/30"
                                />
                                <div className="flex-1">
                                  <h4 className="text-xl font-bold text-white mb-1">{submission.name}</h4>
                                  <p className="text-sm text-cyan-300/60 font-mono">{submission.contractAddress}</p>
                                  <div className="flex gap-6 mt-2">
                                    <span className="text-sm">
                                      <span className="text-cyan-400">Floor:</span> {submission.floorPrice} MOVE
                                    </span>
                                    <span className="text-sm">
                                      <span className="text-cyan-400">24h Vol:</span> {submission.volume24h} MOVE
                                    </span>
                                    <span className="text-sm">
                                      <span className="text-cyan-400">Items:</span> {submission.items}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-900/50 border border-yellow-500/30 rounded-2xl p-12 text-center backdrop-blur-xl">
                    <p className="text-yellow-300">
                      {user ? 'You need the required Discord role to submit collections' : 'Please connect your Discord account to participate'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Voting Period */}
            {currentPeriod === 'voting' && (
              <motion.div
                key="voting"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {user && user.hasRequiredRole ? (
                  <>
                    <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-6 mb-8 backdrop-blur-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-cyan-300">
                          Your Votes: {getUserVoteCount()} / 5
                        </span>
                        <div className="flex gap-2">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-10 h-10 rounded-lg border-2 ${
                                i < getUserVoteCount()
                                  ? 'bg-cyan-500 border-cyan-400'
                                  : 'border-cyan-500/30'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-cyan-300">Vote for Collections</h3>
                      {submissions.length === 0 ? (
                        <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-12 text-center backdrop-blur-xl">
                          <p className="text-cyan-300/60">No collections to vote for</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {submissions.map((submission, index) => (
                            <motion.div
                              key={submission.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`bg-slate-900/50 border rounded-2xl p-6 backdrop-blur-xl transition-all ${
                                hasVoted(submission.id)
                                  ? 'border-cyan-400 shadow-lg shadow-cyan-500/20'
                                  : 'border-cyan-500/30 hover:border-cyan-400/50'
                              }`}
                            >
                              <div className="flex items-center gap-6">
                                <img 
                                  src={submission.thumbnail} 
                                  alt={submission.name}
                                  className="w-20 h-20 rounded-lg border border-cyan-500/30"
                                />
                                <div className="flex-1">
                                  <h4 className="text-xl font-bold text-white mb-1">{submission.name}</h4>
                                  <p className="text-sm text-cyan-300/60 font-mono mb-2">{submission.contractAddress}</p>
                                  <div className="flex gap-6">
                                    <span className="text-sm">
                                      <span className="text-cyan-400">Votes:</span> {submission.voteCount}
                                    </span>
                                    <span className="text-sm">
                                      <span className="text-cyan-400">Floor:</span> {submission.floorPrice} MOVE
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleVote(submission.id)}
                                  disabled={!hasVoted(submission.id) && getUserVoteCount() >= 5}
                                  className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                                    hasVoted(submission.id)
                                      ? 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/20'
                                      : getUserVoteCount() >= 5
                                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/50 hover:from-cyan-500/30 hover:to-purple-600/30'
                                  }`}
                                >
                                  {hasVoted(submission.id) ? 'Voted ✓' : 'Vote'}
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-900/50 border border-yellow-500/30 rounded-2xl p-12 text-center backdrop-blur-xl">
                    <p className="text-yellow-300">
                      {user ? 'You need the required Discord role to vote' : 'Please connect your Discord account to vote'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Winners Display */}
            {currentPeriod === 'winner' && (
              <motion.div
                key="winner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-cyan-300">🏆 Top 15 Core Collections</h3>
                  {winners.length === 0 ? (
                    <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-12 text-center backdrop-blur-xl">
                      <p className="text-cyan-300/60">No winners yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {winners.map((winner, index) => (
                        <motion.div
                          key={winner.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gradient-to-r from-slate-900/80 to-slate-900/50 border border-cyan-400 rounded-2xl p-6 backdrop-blur-xl shadow-lg shadow-cyan-500/20"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center text-2xl font-black">
                              {index + 1}
                            </div>
                            <img 
                              src={winner.thumbnail} 
                              alt={winner.name}
                              className="w-20 h-20 rounded-lg border border-cyan-500/30"
                            />
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-white mb-1">{winner.name}</h4>
                              <p className="text-sm text-cyan-300/60 font-mono mb-2">{winner.contractAddress}</p>
                              <div className="flex gap-6">
                                <span className="text-sm">
                                  <span className="text-cyan-400">Total Votes:</span> {winner.voteCount}
                                </span>
                                <span className="text-sm">
                                  <span className="text-cyan-400">Floor:</span> {winner.floorPrice} MOVE
                                </span>
                                <span className="text-sm">
                                  <span className="text-cyan-400">24h Vol:</span> {winner.volume24h} MOVE
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 right-6 bg-slate-900 border border-purple-500 rounded-2xl p-6 shadow-2xl backdrop-blur-xl max-w-sm"
          >
            <h4 className="text-lg font-bold mb-4 text-purple-400">Admin Controls</h4>
            <div className="space-y-3">
              <button
                onClick={() => exportData('winners')}
                className="w-full px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
              >
                Export Winners
              </button>
              <button
                onClick={() => exportData('votes')}
                className="w-full px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
              >
                Export Votes
              </button>
              <button
                onClick={() => exportData('logins')}
                className="w-full px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
              >
                Export Logins
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default MovementVote;
