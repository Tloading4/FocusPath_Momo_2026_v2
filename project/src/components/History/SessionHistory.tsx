// PART 1 OF 2 — DO NOT USE ALONE

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  History,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  Zap,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';

/* ---------------------------------
   TYPES
---------------------------------- */
interface Analytics {
  focusScore: number;
  distractionCount: number;
  actualFocusTime?: number;
  plannedFocusTime?: number;
  focusEfficiency?: number;
  pauseCount?: number;
  totalPauseTime?: number;
  pausePenalty?: boolean;
  timedOut?: boolean;
}

interface Session {
  id: string;
  sessionType: string;
  sessionTypeName: string;
  category?: string;
  customTask?: string;
  goal?: any;
  focusMode?: 'school' | 'work';
  schoolModeType?: 'homework' | 'test_prep';
  subject?: string;
  workCategory?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  durationSeconds: number;
  xpEarned: number;
  xpDeducted: number;
  baseXP: number;
  completionPercentage: number;
  completed: boolean;
  date: Date;
  analytics: Analytics;
}

interface SessionStats {
  totalSessions: number;
  totalFocusTime: number;
  totalXPEarned: number;
  averageFocusScore: number;
  completionRate: number;
  longestSession: number;
  averageSessionLength: number;
  streakDays: number;
}

/* ---------------------------------
   COMPONENT
---------------------------------- */
export function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'school' | 'work'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'xp' | 'focus'>('date');
  const [isVisible, setIsVisible] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  /* ---------------------------------
     REAL-TIME FIRESTORE LISTENER
  ---------------------------------- */
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'userProfiles', currentUser.uid, 'sessions'),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Session[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();

          const startTime = d.startTime?.toDate ? d.startTime.toDate() : new Date(d.startTime);
          const endTime = d.endTime?.toDate ? d.endTime.toDate() : new Date(d.endTime);
          const date = d.date?.toDate ? d.date.toDate() : new Date(startTime);

          data.push({
            id: doc.id,
            sessionType: d.sessionType || 'unknown',
            sessionTypeName: d.sessionTypeName || d.sessionType || 'Focus Session',
            category: d.category,
            customTask: d.customTask,
            goal: d.goal,
            focusMode: d.focusMode,
            schoolModeType: d.schoolModeType,
            subject: d.subject,
            workCategory: d.workCategory,
            startTime,
            endTime,
            duration: d.duration || 0,
            durationSeconds: d.durationSeconds || (d.duration || 0) * 60,
            xpEarned: d.xpEarned || 0,
            xpDeducted: d.xpDeducted || 0,
            baseXP: d.baseXP || d.xpEarned || 0,
            completionPercentage: d.completionPercentage || 0,
            completed: d.completed !== false,
            date,
            analytics: {
              focusScore: d.analytics?.focusScore || 70,
              distractionCount: d.analytics?.distractionCount || 0,
              actualFocusTime: d.analytics?.actualFocusTime,
              plannedFocusTime: d.analytics?.plannedFocusTime,
              focusEfficiency: d.analytics?.focusEfficiency,
              pauseCount: d.analytics?.pauseCount || 0,
              totalPauseTime: d.analytics?.totalPauseTime || 0,
              pausePenalty: d.analytics?.pausePenalty || false,
              timedOut: d.analytics?.timedOut || false
            }
          });
        });

        setSessions(data);
        calculateStats(data);
        setLoading(false);
        setTimeout(() => setIsVisible(true), 50);
      },
      () => {
        setError('Failed to load session history.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  /* ---------------------------------
     STATS CALCULATION
  ---------------------------------- */
  const calculateStats = (data: Session[]) => {
    if (data.length === 0) {
      setStats({
        totalSessions: 0,
        totalFocusTime: 0,
        totalXPEarned: 0,
        averageFocusScore: 0,
        completionRate: 0,
        longestSession: 0,
        averageSessionLength: 0,
        streakDays: 0
      });
      return;
    }

    const completed = data.filter(s => s.completed);
    const totalFocus = data.reduce((t, s) => t + s.duration, 0);
    const totalXP = data.reduce((t, s) => t + s.xpEarned, 0) - data.reduce((t, s) => t + s.xpDeducted, 0);
    const focusScoreSessions = data.filter(s => s.sessionType !== 'mini-game');
    const avgScore = focusScoreSessions.length > 0
      ? Math.round(focusScoreSessions.reduce((t, s) => t + s.analytics.focusScore, 0) / focusScoreSessions.length)
      : 0;
    const completionRate = Math.round((completed.length / data.length) * 100);
    const longest = Math.max(...data.map(s => s.duration));
    const avg = Math.round(totalFocus / data.length);

    // streak calc
    const today = new Date();
    const uniqueDays = new Set<string>();
    data.forEach(s => {
      if (s.completed) uniqueDays.add(s.date.toDateString());
    });

    let streak = 0;
    let check = new Date(today);
    check.setHours(0, 0, 0, 0);

    while (uniqueDays.has(check.toDateString())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }

    setStats({
      totalSessions: data.length,
      totalFocusTime: totalFocus,
      totalXPEarned: totalXP,
      averageFocusScore: avgScore,
      completionRate,
      longestSession: longest,
      averageSessionLength: avg,
      streakDays: streak
    });
  };

  /* ---------------------------------
     FILTER + SORT
  ---------------------------------- */
  const filtered = sessions.filter(s => {
    if (filterType !== 'all') {
      if (filterType === 'completed' && !s.completed) return false;
      if (filterType === 'incomplete' && s.completed) return false;

      if (filterType === 'today') {
        const today = new Date().toDateString();
        if (s.date.toDateString() !== today) return false;
      } else if (filterType === 'week') {
        const week = new Date();
        week.setDate(week.getDate() - 7);
        if (s.date < week) return false;
      } else {
        if (s.category !== filterType) return false;
      }
    }

    if (modeFilter !== 'all') {
      if (modeFilter === 'school' && s.focusMode !== 'school') return false;
      if (modeFilter === 'work' && s.focusMode !== 'work') return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'duration': return b.duration - a.duration;
      case 'xp': return b.xpEarned - a.xpEarned;
      case 'focus': return b.analytics.focusScore - a.analytics.focusScore;
      default: return b.date.getTime() - a.date.getTime();
    }
  });

  const display = showAllSessions ? sorted : sorted.slice(0, 10);

  /* ---------------------------------
     UTILITIES
  ---------------------------------- */
  const sessionTypeColor = (t: string) => {
    switch (t) {
      case 'easy': return 'bg-green-500/20 text-green-300';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300';
      case 'hard': return 'bg-orange-500/20 text-orange-300';
      case 'extreme': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

     const formatDuration = (min: number) => {
      const rounded = Math.round(min);
      const h = Math.floor(rounded / 60);
      const m = rounded % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };


  /* ---------------------------------
     BALANCED BREAKDOWN
  ---------------------------------- */
  const getBreakdown = (s: Session) => {
    const rows: { label: string; value: number; color: string }[] = [];

    const final = s.analytics.focusScore;
    let sum = 0;

    // Base score
    rows.push({ label: 'Base Score', value: +100, color: 'text-green-400' });
    sum += 100;

    // Early end
    if (!s.completed) {
      const penalty = Math.floor((1 - s.completionPercentage / 100) * 40);
      if (penalty > 0) {
        rows.push({ label: 'Early End Penalty', value: -penalty, color: 'text-red-400' });
        sum -= penalty;
      }
    }

    // Timeout
    if (s.analytics.timedOut) {
      rows.push({ label: 'Timeout Penalty', value: -30, color: 'text-orange-400' });
      sum -= 30;
    }

    // Pause count
    if (s.analytics.pauseCount && s.analytics.pauseCount > 0) {
      const p = Math.min(s.analytics.pauseCount * 5, 40);
      rows.push({ label: 'Pause Penalty', value: -p, color: 'text-yellow-400' });
      sum -= p;
    }

    // Distractions
    if (s.analytics.distractionCount > 0) {
      const p = s.analytics.distractionCount * 5;
      rows.push({ label: 'Distraction Penalty', value: -p, color: 'text-red-400' });
      sum -= p;
    }

    // Auto Balance
    const diff = final - sum;
    if (diff !== 0) {
      rows.push({
        label: 'Adjustment',
        value: diff,
        color: diff > 0 ? 'text-green-300' : 'text-red-300'
      });
      sum += diff;
    }

    return rows;
  };

  /* ---------------------------------
     EXPORT
  ---------------------------------- */
  const exportData = () => {
    const e = {
      sessions: sessions.map(s => ({
        ...s,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime.toISOString(),
        date: s.date.toISOString()
      })),
      stats,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(e, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-path-sessions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---------------------------------
     UI RENDER HELPERS
---------------------------------- */
  const renderAnalytics = (s: Session) => (
    <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-gray-300">
      {s.analytics.plannedFocusTime && (
        <div>Planned: {Math.round(s.analytics.plannedFocusTime / 60)} min</div>
      )}
      {s.analytics.actualFocusTime && (
        <div>Actual: {Math.round(s.analytics.actualFocusTime / 60)} min</div>
      )}
     <div>
        Efficiency:{' '}
        {s.analytics.focusEfficiency !== undefined &&
        s.analytics.focusEfficiency > 0
          ? `${s.analytics.focusEfficiency}%`
          : 'N/A'}
      </div>
    
      {s.analytics.pauseCount !== undefined && (
        <div>Pauses: {s.analytics.pauseCount}</div>
      )}
      {s.analytics.totalPauseTime !== undefined && (
        <div>Pause Time: {Math.round((s.analytics.totalPauseTime || 0) / 60)} min</div>
      )}
      <div>Distractions: {s.analytics.distractionCount}</div>
      <div>Completion: {s.completionPercentage}%</div>
      <div>Status: {s.completed ? 'Completed' : s.analytics.timedOut ? 'Timed Out' : 'Incomplete'}</div>
    </div>
  );
// PART 2 OF 2 — DO NOT USE ALONE

  /* ---------------------------------
     MAIN RETURN
  ---------------------------------- */
  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-white/20 rounded"></div>
          <div className="h-4 bg-white/20 rounded"></div>
          <div className="h-4 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 shadow-xl border border-white/20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-red-300 mb-1">Error Loading History</h3>
        <p className="text-red-300 mb-3">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-all flex items-center gap-2 mx-auto">
          <RefreshCw className="h-4 w-4" /> Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-8 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 translate-y-8'}`}>


      {/* HEADER */}
      <div className="glass-card rounded-2xl p-8 shadow-xl border border-white/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 rounded-2xl">
              <History className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Session History</h2>
              <p className="text-gray-300">Track your focus journey</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Sync</span>
            </div>

            <button onClick={exportData} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
              <div className="text-sm text-gray-300">Sessions</div>
            </div>

            <div className="rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">⏱️</div>
              <div className="text-2xl font-bold text-white">{formatDuration(stats.totalFocusTime)}</div>
              <div className="text-sm text-gray-300">Total Focus</div>
            </div>

            <div className="rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-2xl font-bold text-green-400">+{stats.totalXPEarned}</div>
              <div className="text-sm text-gray-300">XP Earned</div>
            </div>

            <div className="rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-blue-400">{stats.averageFocusScore}%</div>
              <div className="text-sm text-gray-300">Avg Focus</div>
            </div>
          </div>
        )}
      </div>

      {/* FILTERS */}
      <div className="glass-card rounded-2xl p-6 shadow-xl border border-white/20">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 w-full">
            <Filter className="h-5 w-5 text-gray-400" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full sm:w-auto px-3 py-2 bg-transparent border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500">
              <option value="all">All Sessions</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="homework">Homework</option>
              <option value="coding">Coding</option>
              <option value="reading">Reading</option>
              <option value="writing">Writing</option>
              <option value="work">Work</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-4">
          <span className="text-white font-medium">Mode:</span>
          <div className="flex gap-2 flex-1">
            {['all', 'school', 'work'].map(m => (
              <button key={m} onClick={() => setModeFilter(m as any)} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${modeFilter === m ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full sm:w-auto px-3 py-2 bg-transparent border border-white/20 rounded-lg text-white">
              <option value="date">Date (Newest)</option>
              <option value="duration">Duration</option>
              <option value="xp">XP Earned</option>
              <option value="focus">Focus Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* SESSION LIST */}
      <div className="glass-card rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        {display.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-1">No Sessions Found</h3>
            <p className="text-gray-400">{filterType === 'all' ? 'Start your first focus session!' : `No sessions for: ${filterType}`}</p>
          </div>
        ) : isMobile ? (
          /* MOBILE CARDS */
          <div className="space-y-4 p-4">
            {display.map((s, index) => (
              <div key={s.id} onClick={() => setExpandedSessionId(expandedSessionId === s.id ? null : s.id)} className="bg-white/10 rounded-2xl p-4 border border-white/20 shadow-xl backdrop-blur-xl transition-all hover:bg-white/20 cursor-pointer">

                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-white font-semibold text-lg">{s.customTask || 'Focus Session'}</div>
                    <div className="text-gray-300 text-xs mt-1">
                      {s.date.toLocaleDateString()} • {s.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {s.focusMode && (
                      <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-md font-semibold ${s.focusMode === 'school' ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-500/30 text-slate-300'}`}>
                        {s.focusMode === 'school' ? 'School' : 'Work'}
                      </span>
                    )}
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sessionTypeColor(s.sessionType)}`}>
                    {s.sessionTypeName}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-blue-300">
                  <div>{s.duration}m • {s.completionPercentage}%</div>
                  <div className={s.xpEarned > 0 ? 'text-green-400' : s.xpDeducted ? 'text-red-400' : 'text-gray-400'}>
                    {s.xpEarned > 0 ? `+${s.xpEarned}` : s.xpDeducted ? `-${s.xpDeducted}` : '0'} XP
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className={s.sessionType === 'mini-game' ? 'text-gray-400' : s.analytics.focusScore >= 80 ? 'text-green-400' : s.analytics.focusScore >= 60 ? 'text-yellow-400' : 'text-orange-400'}>
                    Focus Score: {s.sessionType === 'mini-game' ? 'N/A' : `${s.analytics.focusScore}%`}
                  </div>
                  <div className="text-gray-400 text-xs">{s.analytics.distractionCount} distractions</div>
                </div>

                {expandedSessionId === s.id && (
                  <div className="mt-4 rounded-xl p-4 border border-white/10 space-y-3">
                    {s.sessionType === 'mini-game' ? (
                      <div className="text-center py-4">
                        <div className="text-gray-400 text-sm">Focus breakdown not available for mini-game sessions</div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-white font-semibold flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-blue-400" /> Focus Breakdown</h4>

                        {getBreakdown(s).map((b, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                            <div className="text-gray-200 text-xs">{b.label}</div>
                            <div className={`font-semibold text-sm ${b.color}`}>{b.value > 0 ? '+' : ''}{b.value}</div>
                          </div>
                        ))}

                        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-between">
                          <div className="text-white font-bold text-sm">Final Score</div>
                          <div className={s.analytics.focusScore >= 80 ? 'text-green-400 text-lg font-bold' : s.analytics.focusScore >= 60 ? 'text-yellow-400 text-lg font-bold' : 'text-orange-400 text-lg font-bold'}>
                            {s.analytics.focusScore}%
                          </div>
                        </div>

                        {renderAnalytics(s)}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* DESKTOP TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/20">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Task</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">XP</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Focus</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {display.map((s, index) => (
                  <React.Fragment key={s.id}>
                    <tr onClick={() => setExpandedSessionId(expandedSessionId === s.id ? null : s.id)} className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{s.date.toLocaleDateString()}</div>
                        <div className="text-gray-400 text-xs">{s.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {s.focusMode && (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.focusMode === 'school' ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-500/30 text-slate-300'}`}>
                              {s.focusMode === 'school' ? 'School' : 'Work'}
                            </span>
                          )}
                          <div className="text-white truncate max-w-xs" title={s.customTask}>
                            {s.customTask || 'Focus Session'}
                          </div>
                        </div>

                        {s.subject && (
                          <div className="text-blue-300 text-xs mt-1">
                            {s.schoolModeType === 'homework' ? 'Homework' : 'Test Prep'}: {s.subject}
                          </div>
                        )}
                        {s.workCategory && (
                          <div className="text-slate-300 text-xs mt-1">
                            {s.workCategory}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sessionTypeColor(s.sessionType)}`}>
                          {s.sessionTypeName}
                        </span>
                        <div className="text-white text-xs mt-1">{s.duration}m • {s.completionPercentage}%</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className={s.xpEarned > 0 ? 'text-green-400 font-semibold' : s.xpDeducted ? 'text-red-400 font-semibold' : 'text-gray-400 font-semibold'}>
                          {s.xpEarned > 0 ? `+${s.xpEarned}` : s.xpDeducted ? `-${s.xpDeducted}` : '0'} XP
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className={s.sessionType === 'mini-game' ? 'text-gray-400 font-semibold' : s.analytics.focusScore >= 80 ? 'text-green-400 font-semibold' : s.analytics.focusScore >= 60 ? 'text-yellow-400 font-semibold' : 'text-orange-400 font-semibold'}>
                          {s.sessionType === 'mini-game' ? 'N/A' : `${s.analytics.focusScore}%`}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {s.completed ? (
                            <div className="flex items-center gap-1 text-green-400">
                              <Trophy className="h-4 w-4" /> Complete
                            </div>
                          ) : s.analytics.timedOut ? (
                            <div className="flex items-center gap-1 text-orange-400">
                              <Clock className="h-4 w-4" /> Timed Out
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-400">
                              <Clock className="h-4 w-4" /> Incomplete
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedSessionId === s.id && (
                      <tr className="bg-white/5">
                        <td colSpan={6} className="py-6 px-6">
                          <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-2 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-white" />
                              </div>
                              <h3 className="text-xl font-bold text-white">Session Details</h3>
                            </div>

                            {s.sessionType === 'mini-game' ? (
                              <div className="rounded-xl p-6 max-w-2xl mx-auto text-center">
                                <div className="text-gray-400">Focus breakdown not available for mini-game sessions</div>
                              </div>
                            ) : (
                              <div className="rounded-xl p-6 space-y-4 max-w-2xl mx-auto">
                                <h4 className="text-lg font-semibold text-white flex items-center gap-2"><Target className="h-5 w-5 text-blue-400" /> Focus Breakdown</h4>

                                <div className="space-y-3">
                                  {getBreakdown(s).map((b, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                                      <div>
                                        <div className="text-white font-medium">{b.label}</div>
                                      </div>
                                      <div className={`text-lg font-bold ${b.color}`}>
                                        {b.value > 0 ? '+' : ''}{b.value}
                                      </div>
                                    </div>
                                  ))}

                                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-lg border border-blue-500/30 mt-4">
                                    <div className="text-white font-bold text-lg">Final Score</div>
                                    <div className={s.analytics.focusScore >= 80 ? 'text-green-400 text-2xl font-bold' : s.analytics.focusScore >= 60 ? 'text-yellow-400 text-2xl font-bold' : 'text-orange-400 text-2xl font-bold'}>
                                      {s.analytics.focusScore}%
                                    </div>
                                  </div>
                                </div>

                                {renderAnalytics(s)}
                              </div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-white/10">
                              <button onClick={(e) => { e.stopPropagation(); setExpandedSessionId(null); }} className="text-gray-400 hover:text-white transition-colors text-sm">
                                Close
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW ALL / SHOW LESS */}
      {!showAllSessions && sorted.length > 10 && (
        <div className="border-t border-white/20 p-6 text-center">
          <button onClick={() => setShowAllSessions(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto font-semibold">
            <Clock className="h-5 w-5" /> View All {sorted.length} Sessions
          </button>
          <p className="text-gray-400 text-sm mt-2">Showing {display.length} of {sorted.length}</p>
        </div>
      )}

      {showAllSessions && sorted.length > 10 && (
        <div className="border-t border-white/20 p-6 text-center">
          <button onClick={() => setShowAllSessions(false)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all flex items-center gap-2 mx-auto font-semibold">
            Show Recent Only
          </button>
          <p className="text-gray-400 text-sm mt-2">Showing all {sorted.length} sessions</p>
        </div>
      )}

      {/* PERFORMANCE & INSIGHTS */}
      {stats && stats.totalSessions > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card rounded-2xl p-6 shadow-xl border border-white/20 relative">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-400" /> Performance Metrics
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Completion</span>
                <span className={stats.completionRate >= 80 ? 'text-green-400 font-semibold' : stats.completionRate >= 60 ? 'text-yellow-400 font-semibold' : 'text-orange-400 font-semibold'}>
                  {stats.completionRate}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-300">Longest Session</span>
                <span className="text-white font-semibold">{formatDuration(stats.longestSession)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-300">Avg Session</span>
                <span className="text-white font-semibold">{formatDuration(stats.averageSessionLength)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-300">Streak</span>
                <span className="text-orange-400 font-semibold flex items-center gap-1"><Zap className="h-4 w-4" /> {stats.streakDays} days</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Target className="h-6 w-6 text-purple-400" /> Focus Insights</h3>
            <div className="space-y-3 text-sm">

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <h4 className="font-semibold text-blue-300 mb-1">Best Performance</h4>
                <p className="text-blue-200">
                  {stats.averageFocusScore >= 80
                    ? "Excellent focus! You're developing elite concentration."
                    : stats.averageFocusScore >= 70
                    ? "Strong focus habits! Keep building consistency."
                    : "Your focus score is improving — keep going!"}
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <h4 className="font-semibold text-green-300 mb-1">Consistency</h4>
                <p className="text-green-200">
                  {stats.completionRate >= 80
                    ? "Amazing completion rate! Your routine is paying off."
                    : stats.completionRate >= 60
                    ? "Solid consistency — aim even higher!"
                    : "Try completing more sessions to build stronger habits."}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
