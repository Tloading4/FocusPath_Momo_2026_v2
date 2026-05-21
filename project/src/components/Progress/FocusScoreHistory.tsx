import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface Analytics {
  focusScore: number;
  pauseCount?: number;
  totalPauseTime?: number;
  timedOut?: boolean;
}

interface Session {
  id: string;
  sessionTypeName: string;
  date: Date;
  completed: boolean;
  analytics: Analytics;
}

interface FocusScoreHistoryProps {
  refreshTrigger?: number;
}

export default function FocusScoreHistory({ refreshTrigger }: FocusScoreHistoryProps) {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<10 | 20>(20);

  useEffect(() => {
    if (currentUser) {
      loadSessions();
    }
  }, [currentUser, sessionCount, refreshTrigger]);

  const loadSessions = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const sessionsRef = collection(db, 'userProfiles', currentUser.uid, 'sessions');
      const q = query(sessionsRef, orderBy('date', 'desc'), limit(sessionCount));
      const snapshot = await getDocs(q);

      const sessionsData: Session[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessionsData.push({
          id: doc.id,
          sessionTypeName: data.sessionTypeName || 'Unknown Session',
          date: data.date?.toDate() || new Date(),
          completed: data.completed || false,
          analytics: data.analytics || {
            focusScore: 0,
          },
        });
      });

      setSessions(sessionsData.reverse());
    } catch (error) {
      console.error('Error loading focus score history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 70) return { label: 'Good', color: 'text-blue-400' };
    if (score >= 50) return { label: 'Fair', color: 'text-yellow-400' };
    return { label: 'Needs Work', color: 'text-red-400' };
  };

  const calculateTrend = () => {
    if (sessions.length < 5) return null;

    const recentAvg = sessions
      .slice(-5)
      .reduce((sum, s) => sum + s.analytics.focusScore, 0) / 5;

    const previousAvg = sessions
      .slice(-10, -5)
      .reduce((sum, s) => sum + s.analytics.focusScore, 0) / Math.min(5, sessions.length - 5);

    const change = recentAvg - previousAvg;
    const percentChange = previousAvg > 0 ? (change / previousAvg) * 100 : 0;

    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      change: Math.abs(change),
      percentChange: Math.abs(percentChange),
      recentAvg
    };
  };

  const calculateCorrelations = () => {
    if (sessions.length < 3) return null;

    const withPauses = sessions.filter(s => (s.analytics.pauseCount || 0) > 0);
    const withoutPauses = sessions.filter(s => (s.analytics.pauseCount || 0) === 0);

    const avgScoreWithPauses = withPauses.length > 0
      ? withPauses.reduce((sum, s) => sum + s.analytics.focusScore, 0) / withPauses.length
      : 0;

    const avgScoreWithoutPauses = withoutPauses.length > 0
      ? withoutPauses.reduce((sum, s) => sum + s.analytics.focusScore, 0) / withoutPauses.length
      : 0;

    return {
      avgScoreWithPauses,
      avgScoreWithoutPauses,
      pauseImpact: avgScoreWithoutPauses - avgScoreWithPauses
    };
  };

  const trend = calculateTrend();
  const correlations = calculateCorrelations();
  const avgScore = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.analytics.focusScore, 0) / sessions.length
    : 0;

  const formatDate = (date: Date, index: number) => {
    if (sessionCount === 20 && index % 2 !== 0) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  if (sessions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Focus Score History</h3>
        <div className="text-center py-8">
          <AlertCircle className="mx-auto mb-3 text-gray-500" size={40} />
          <p className="text-gray-400">No session history available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Focus Score History</h3>
          <p className="text-sm text-gray-400">Track your focus performance over time</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSessionCount(10)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sessionCount === 10
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Last 10
          </button>
          <button
            onClick={() => setSessionCount(20)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sessionCount === 20
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Last 20
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Average Score</div>
          <div className={`text-2xl font-bold ${getScoreLabel(avgScore).color}`}>
            {avgScore.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{getScoreLabel(avgScore).label}</div>
        </div>

        {trend && (
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Recent Trend</div>
            <div className="flex items-center gap-2">
              {trend.direction === 'up' ? (
                <TrendingUp className="text-green-400" size={20} />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="text-red-400" size={20} />
              ) : (
                <div className="w-5 h-0.5 bg-gray-400" />
              )}
              <span className={`text-2xl font-bold ${
                trend.direction === 'up' ? 'text-green-400' :
                trend.direction === 'down' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {trend.percentChange > 0 ? `${trend.percentChange.toFixed(0)}%` : 'Stable'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Last 5 sessions</div>
          </div>
        )}

        {correlations && correlations.pauseImpact !== 0 && (
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Pause Impact</div>
            <div className="text-2xl font-bold text-yellow-400">
              {correlations.pauseImpact > 0 ? '+' : ''}{correlations.pauseImpact.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Score difference without pauses
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="flex items-end justify-between gap-1 h-64 pb-8">
          {sessions.map((session, index) => {
            const score = session.analytics.focusScore;
            const heightPercent = (score / 100) * 100;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={session.id}
                className="flex-1 flex flex-col items-center justify-end group relative"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`w-full ${getScoreColor(score)} rounded-t transition-all duration-300 cursor-pointer ${
                    isHovered ? 'opacity-100' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: '4px'
                  }}
                />

                {isHovered && (
                  <div className="absolute bottom-full mb-2 bg-gray-900 border border-white/20 rounded-lg p-3 text-xs shadow-xl z-10 whitespace-nowrap">
                    <div className="font-semibold text-white mb-1">{session.sessionTypeName}</div>
                    <div className="text-gray-300 mb-1">
                      {session.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className={`font-bold ${getScoreLabel(score).color}`}>
                      Focus Score: {score}
                    </div>
                    {session.analytics.pauseCount !== undefined && (
                      <div className="text-gray-400 mt-1">
                        Pauses: {session.analytics.pauseCount}
                      </div>
                    )}
                    {session.analytics.timedOut && (
                      <div className="text-red-400 mt-1">Timed Out</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {sessions.map((session, index) => (
            <div
              key={`date-${session.id}`}
              className="flex-1 text-center"
              style={{ fontSize: sessionCount === 20 ? '0.65rem' : '0.75rem' }}
            >
              {formatDate(session.date, index)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-400">90-100: Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-400">70-89: Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-400">50-69: Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-400">Below 50: Needs Work</span>
          </div>
        </div>
      </div>
    </div>
  );
}
