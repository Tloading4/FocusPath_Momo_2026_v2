import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { BarChart3, Clock, Target, TrendingUp, Award, Zap, Calendar } from 'lucide-react';
import { MomoInsights } from '../FocusAI/MomoInsights';

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
  duration: number;
  durationSeconds: number;
  xpEarned: number;
  xpDeducted: number;
  completionPercentage: number;
  completed: boolean;
  date: Date;
  startTime: Date;
  analytics: Analytics;
}

interface SessionAnalyticsDashboardProps {
  refreshTrigger?: number;
}

export default function SessionAnalyticsDashboard({ refreshTrigger }: SessionAnalyticsDashboardProps) {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30');

  useEffect(() => {
    if (currentUser) {
      loadSessions();
    }
  }, [currentUser, dateRange, refreshTrigger]);

  const loadSessions = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const sessionsRef = collection(db, 'userProfiles', currentUser.uid, 'sessions');

      let q = query(sessionsRef, orderBy('date', 'desc'));

      if (dateRange !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        q = query(sessionsRef, where('date', '>=', daysAgo), orderBy('date', 'desc'));
      }

      const snapshot = await getDocs(q);

      const sessionsData: Session[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessionsData.push({
          id: doc.id,
          sessionType: data.sessionType || 'Unknown',
          sessionTypeName: data.sessionTypeName || 'Unknown Session',
          duration: data.duration || 0,
          durationSeconds: data.durationSeconds || 0,
          xpEarned: data.xpEarned || 0,
          xpDeducted: data.xpDeducted || 0,
          completionPercentage: data.completionPercentage || 0,
          completed: data.completed || false,
          date: data.date?.toDate() || new Date(),
          startTime: data.startTime?.toDate() || new Date(),
          analytics: data.analytics || {
            focusScore: 0,
            distractionCount: 0,
          },
        });
      });

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (sessions.length === 0) return null;

    const completedSessions = sessions.filter(s => s.completed);
    const totalSessions = sessions.length;
    const completionRate = (completedSessions.length / totalSessions) * 100;

    const avgFocusScore = sessions.reduce((sum, s) => sum + s.analytics.focusScore, 0) / totalSessions;

    const totalFocusTime = sessions.reduce((sum, s) => sum + (s.analytics.actualFocusTime || s.durationSeconds || 0), 0);
    const totalPlannedTime = sessions.reduce((sum, s) => sum + (s.analytics.plannedFocusTime || s.durationSeconds || 0), 0);

    const avgPauseCount = sessions.reduce((sum, s) => sum + (s.analytics.pauseCount || 0), 0) / totalSessions;

    const totalXP = sessions.reduce((sum, s) => sum + s.xpEarned - s.xpDeducted, 0);

    const sessionsByHour = sessions.reduce((acc, s) => {
      const hour = s.startTime.getHours();
      if (!acc[hour]) {
        acc[hour] = { count: 0, totalScore: 0 };
      }
      acc[hour].count += 1;
      acc[hour].totalScore += s.analytics.focusScore;
      return acc;
    }, {} as Record<number, { count: number; totalScore: number }>);

    const bestHour = Object.entries(sessionsByHour)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgScore: data.totalScore / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgScore - a.avgScore)[0];

    const sessionTypeStats = sessions.reduce((acc, s) => {
      if (!acc[s.sessionTypeName]) {
        acc[s.sessionTypeName] = {
          count: 0,
          totalScore: 0,
          completionRate: 0,
          completed: 0
        };
      }
      acc[s.sessionTypeName].count += 1;
      acc[s.sessionTypeName].totalScore += s.analytics.focusScore;
      if (s.completed) {
        acc[s.sessionTypeName].completed += 1;
      }
      return acc;
    }, {} as Record<string, { count: number; totalScore: number; completionRate: number; completed: number }>);

    Object.keys(sessionTypeStats).forEach(type => {
      sessionTypeStats[type].completionRate =
        (sessionTypeStats[type].completed / sessionTypeStats[type].count) * 100;
    });

    const bestSessionType = Object.entries(sessionTypeStats)
      .map(([type, data]) => ({
        type,
        avgScore: data.totalScore / data.count,
        completionRate: data.completionRate,
        count: data.count
      }))
      .sort((a, b) => b.avgScore - a.avgScore)[0];

    const focusEfficiencyRatio = totalPlannedTime > 0
      ? (totalFocusTime / totalPlannedTime) * 100
      : 0;

    return {
      totalSessions,
      completionRate,
      avgFocusScore,
      totalFocusTime,
      totalPlannedTime,
      avgPauseCount,
      totalXP,
      bestHour,
      bestSessionType,
      focusEfficiencyRatio
    };
  };

  const stats = calculateStats();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!stats || sessions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Session Analytics
        </h3>
        <p className="text-gray-400 text-center py-8">
          Complete some focus sessions to see your analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Momo AI Insights */}
      {currentUser && (
        <MomoInsights userId={currentUser.uid} />
      )}

    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 size={20} />
          Session Analytics
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('7')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              dateRange === '7'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDateRange('30')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              dateRange === '30'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              dateRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-blue-400" size={18} />
            <span className="text-xs text-gray-400">Total Sessions</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-green-400" size={18} />
            <span className="text-xs text-gray-400">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.completionRate.toFixed(0)}%</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-yellow-400" size={18} />
            <span className="text-xs text-gray-400">Avg Focus Score</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.avgFocusScore.toFixed(0)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-purple-400" size={18} />
            <span className="text-xs text-gray-400">Total XP</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalXP.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/20 border border-white/10 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={16} />
            Focus Time
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Total Focus Time</span>
              <span className="text-sm font-bold text-white">{formatTime(stats.totalFocusTime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Planned Time</span>
              <span className="text-sm font-bold text-white">{formatTime(stats.totalPlannedTime)}</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400">Efficiency Ratio</span>
                <span className="text-sm font-bold text-white">{stats.focusEfficiencyRatio.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                  style={{ width: `${Math.min(stats.focusEfficiencyRatio, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp size={16} />
            Performance Insights
          </h4>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400 mb-1">Best Time of Day</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{formatHour(stats.bestHour.hour)}</span>
                <span className="text-xs text-green-400">Avg Score: {stats.bestHour.avgScore.toFixed(0)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Best Session Type</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white truncate">{stats.bestSessionType.type}</span>
                <span className="text-xs text-green-400">{stats.bestSessionType.avgScore.toFixed(0)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Avg Pauses per Session</div>
              <div className="text-sm font-bold text-white">{stats.avgPauseCount.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
