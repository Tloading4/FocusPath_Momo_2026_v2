import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Clock, TrendingUp, TrendingDown, Minus, AlertCircle, Pause, CheckCircle, XCircle } from 'lucide-react';

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
  xpEarned: number;
  xpDeducted: number;
  completionPercentage: number;
  completed: boolean;
  date: Date;
  startTime: Date;
  analytics: Analytics;
}

interface RecentSessionsProgressProps {
  refreshTrigger?: number;
}

export default function RecentSessionsProgress({ refreshTrigger }: RecentSessionsProgressProps) {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadRecentSessions();
    }
  }, [currentUser, refreshTrigger]);

  const loadRecentSessions = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const sessionsRef = collection(db, 'userProfiles', currentUser.uid, 'sessions');
      const q = query(sessionsRef, orderBy('date', 'desc'), limit(10));
      const snapshot = await getDocs(q);

      const sessionsData: Session[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessionsData.push({
          id: doc.id,
          sessionType: data.sessionType || 'Unknown',
          sessionTypeName: data.sessionTypeName || 'Unknown Session',
          duration: data.duration || 0,
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
      console.error('Error loading recent sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFocusScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-500/10';
    if (score >= 70) return 'text-blue-400 bg-blue-500/10';
    if (score >= 50) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const getFocusScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 70) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 50) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Needs Work', color: 'bg-red-500' };
  };

  const getTrendIcon = (index: number) => {
    if (index === sessions.length - 1 || sessions.length < 2) return <Minus size={16} />;

    const currentScore = sessions[index].analytics.focusScore;
    const previousScore = sessions[index + 1].analytics.focusScore;

    if (currentScore > previousScore) return <TrendingUp size={16} className="text-green-400" />;
    if (currentScore < previousScore) return <TrendingDown size={16} className="text-red-400" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
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
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={20} />
          Recent Sessions
        </h3>
        <div className="text-center py-8">
          <AlertCircle className="mx-auto mb-3 text-gray-500" size={40} />
          <p className="text-gray-400">No sessions completed yet</p>
          <p className="text-sm text-gray-500 mt-1">Start a focus session to see your performance here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock size={20} />
          Recent Sessions
        </h3>
        <span className="text-sm text-gray-400">Last {sessions.length} sessions</span>
      </div>

      <div className="space-y-2">
        {sessions.map((session, index) => {
          const badge = getFocusScoreBadge(session.analytics.focusScore);
          const isExpanded = expandedId === session.id;

          return (
            <div
              key={session.id}
              className="bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all hover:bg-white/10"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${session.completed ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                      {session.completed ? (
                        <CheckCircle size={20} className="text-green-400" />
                      ) : (
                        <XCircle size={20} className="text-orange-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white text-sm truncate">
                          {session.sessionTypeName}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color} text-white`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{formatDate(session.date)}</span>
                        <span>{formatTime(session.startTime)}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {session.duration}m
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-2 rounded-lg ${getFocusScoreColor(session.analytics.focusScore)}`}>
                      <div className="text-xs font-medium mb-0.5">Focus Score</div>
                      <div className="text-xl font-bold flex items-center gap-1">
                        {session.analytics.focusScore}
                        {getTrendIcon(index)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-400 mb-0.5">XP</div>
                      <div className={`text-lg font-bold ${session.completed ? 'text-green-400' : 'text-red-400'}`}>
                        {session.completed ? `+${session.xpEarned}` : `-${session.xpDeducted}`}
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-white/10 p-4 bg-black/20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Completion</div>
                      <div className="text-lg font-bold text-white">{session.completionPercentage}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Pauses</div>
                      <div className="text-lg font-bold text-white flex items-center gap-1">
                        <Pause size={14} />
                        {session.analytics.pauseCount || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Pause Time</div>
                      <div className="text-lg font-bold text-white">
                        {Math.floor((session.analytics.totalPauseTime || 0) / 60)}m
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Status</div>
                      <div className="text-lg font-bold text-white">
                        {session.analytics.timedOut ? (
                          <span className="text-red-400 text-sm">Timed Out</span>
                        ) : (
                          <span className="text-green-400 text-sm">On Time</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {session.analytics.focusEfficiency !== undefined && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Focus Efficiency</span>
                        <span className="text-sm font-medium text-white">{session.analytics.focusEfficiency}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                          style={{ width: `${session.analytics.focusEfficiency}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
