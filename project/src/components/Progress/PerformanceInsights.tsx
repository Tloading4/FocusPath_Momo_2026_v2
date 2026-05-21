import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Lightbulb, TrendingUp, Target, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface Analytics {
  focusScore: number;
  pauseCount?: number;
  totalPauseTime?: number;
  timedOut?: boolean;
  focusEfficiency?: number;
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
  focusMode?: 'school' | 'work';
  analytics: Analytics;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface PerformanceInsightsProps {
  refreshTrigger?: number;
}

export default function PerformanceInsights({ refreshTrigger }: PerformanceInsightsProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadSessions();
    }
  }, [currentUser, refreshTrigger]);

  const loadSessions = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const sessionsRef = collection(db, 'userProfiles', currentUser.uid, 'sessions');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        sessionsRef,
        where('date', '>=', thirtyDaysAgo),
        orderBy('date', 'desc')
      );

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
          focusMode: data.focusMode,
          analytics: data.analytics || {
            focusScore: 0,
          },
        });
      });

      generateInsights(sessionsData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (sessions: Session[]) => {
    if (sessions.length === 0) {
      setInsights([]);
      return;
    }

    const newInsights: Insight[] = [];

    const recentSessions = sessions.slice(0, 10);
    const avgFocusScore = recentSessions.reduce((sum, s) => sum + s.analytics.focusScore, 0) / recentSessions.length;
    const completionRate = (recentSessions.filter(s => s.completed).length / recentSessions.length) * 100;
    const avgPauseCount = recentSessions.reduce((sum, s) => sum + (s.analytics.pauseCount || 0), 0) / recentSessions.length;

    if (avgFocusScore >= 85) {
      newInsights.push({
        type: 'success',
        title: 'Excellent Focus Performance',
        description: `Your average focus score is ${avgFocusScore.toFixed(0)}! You're doing great at maintaining concentration during your sessions.`,
        icon: <CheckCircle size={20} />
      });
    } else if (avgFocusScore < 60) {
      newInsights.push({
        type: 'warning',
        title: 'Room for Improvement',
        description: `Your recent focus score average is ${avgFocusScore.toFixed(0)}. Try reducing pauses and completing sessions on time to boost your score.`,
        icon: <AlertTriangle size={20} />
      });
    }

    if (completionRate >= 80) {
      newInsights.push({
        type: 'success',
        title: 'High Completion Rate',
        description: `You're completing ${completionRate.toFixed(0)}% of your sessions! This consistency is key to building strong focus habits.`,
        icon: <Target size={20} />
      });
    } else if (completionRate < 50) {
      newInsights.push({
        type: 'warning',
        title: 'Complete More Sessions',
        description: `Your completion rate is ${completionRate.toFixed(0)}%. Try shorter sessions or break tasks into smaller chunks to improve this metric.`,
        icon: <Target size={20} />
      });
    }

    const sessionsByHour = sessions.reduce((acc, s) => {
      const hour = s.startTime.getHours();
      if (!acc[hour]) {
        acc[hour] = { count: 0, totalScore: 0 };
      }
      acc[hour].count += 1;
      acc[hour].totalScore += s.analytics.focusScore;
      return acc;
    }, {} as Record<number, { count: number; totalScore: number }>);

    const hourlyPerformance = Object.entries(sessionsByHour)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgScore: data.totalScore / data.count,
        count: data.count
      }))
      .filter(h => h.count >= 2)
      .sort((a, b) => b.avgScore - a.avgScore);

    if (hourlyPerformance.length > 0) {
      const bestHour = hourlyPerformance[0];
      const formatHour = (h: number) => {
        if (h === 0) return '12 AM';
        if (h === 12) return '12 PM';
        if (h < 12) return `${h} AM`;
        return `${h - 12} PM`;
      };

      newInsights.push({
        type: 'info',
        title: 'Optimal Focus Time',
        description: `You perform best around ${formatHour(bestHour.hour)} with an average score of ${bestHour.avgScore.toFixed(0)}. Schedule important sessions during this time.`,
        icon: <Clock size={20} />
      });
    }

    const sessionTypePerformance = sessions.reduce((acc, s) => {
      if (!acc[s.sessionTypeName]) {
        acc[s.sessionTypeName] = { count: 0, totalScore: 0, completed: 0 };
      }
      acc[s.sessionTypeName].count += 1;
      acc[s.sessionTypeName].totalScore += s.analytics.focusScore;
      if (s.completed) acc[s.sessionTypeName].completed += 1;
      return acc;
    }, {} as Record<string, { count: number; totalScore: number; completed: number }>);

    const bestSessionType = Object.entries(sessionTypePerformance)
      .map(([type, data]) => ({
        type,
        avgScore: data.totalScore / data.count,
        completionRate: (data.completed / data.count) * 100,
        count: data.count
      }))
      .filter(s => s.count >= 2)
      .sort((a, b) => b.avgScore - a.avgScore)[0];

    if (bestSessionType) {
      newInsights.push({
        type: 'tip',
        title: 'Your Best Session Type',
        description: `"${bestSessionType.type}" sessions work best for you with an average score of ${bestSessionType.avgScore.toFixed(0)}. Consider this length for challenging tasks.`,
        icon: <TrendingUp size={20} />
      });
    }

    if (avgPauseCount > 3) {
      newInsights.push({
        type: 'warning',
        title: 'Reduce Pauses',
        description: `You average ${avgPauseCount.toFixed(1)} pauses per session. Each pause reduces your focus score. Try the Pomodoro technique or remove distractions before starting.`,
        icon: <AlertTriangle size={20} />
      });
    } else if (avgPauseCount < 1) {
      newInsights.push({
        type: 'success',
        title: 'Minimal Interruptions',
        description: `You rarely pause during sessions! This discipline directly contributes to your high focus scores.`,
        icon: <CheckCircle size={20} />
      });
    }

    const timedOutCount = recentSessions.filter(s => s.analytics.timedOut).length;
    if (timedOutCount > 2) {
      newInsights.push({
        type: 'warning',
        title: 'Complete Sessions on Time',
        description: `You've timed out on ${timedOutCount} recent sessions. Set a reminder to end your session within 60 seconds of completion to avoid the 30-point penalty.`,
        icon: <Clock size={20} />
      });
    }

    if (sessions.length >= 5) {
      const recent5 = sessions.slice(0, 5);
      const previous5 = sessions.slice(5, 10);

      if (previous5.length === 5) {
        const recentAvg = recent5.reduce((sum, s) => sum + s.analytics.focusScore, 0) / 5;
        const previousAvg = previous5.reduce((sum, s) => sum + s.analytics.focusScore, 0) / 5;
        const improvement = recentAvg - previousAvg;

        if (improvement > 10) {
          newInsights.push({
            type: 'success',
            title: 'Improving Performance',
            description: `Your focus score has improved by ${improvement.toFixed(0)} points over your last 5 sessions. Keep up the momentum!`,
            icon: <TrendingUp size={20} />
          });
        } else if (improvement < -10) {
          newInsights.push({
            type: 'warning',
            title: 'Performance Decline',
            description: `Your recent sessions show a ${Math.abs(improvement).toFixed(0)}-point decrease. Review what changed and adjust your approach.`,
            icon: <AlertTriangle size={20} />
          });
        }
      }
    }

    const longSessions = sessions.filter(s => s.duration >= 45);
    const shortSessions = sessions.filter(s => s.duration <= 25);

    if (longSessions.length >= 3 && shortSessions.length >= 3) {
      const longAvg = longSessions.reduce((sum, s) => sum + s.analytics.focusScore, 0) / longSessions.length;
      const shortAvg = shortSessions.reduce((sum, s) => sum + s.analytics.focusScore, 0) / shortSessions.length;

      if (shortAvg > longAvg + 10) {
        newInsights.push({
          type: 'tip',
          title: 'Shorter Sessions Work Better',
          description: `Your shorter sessions (25 min or less) average ${shortAvg.toFixed(0)} points vs ${longAvg.toFixed(0)} for longer ones. Consider breaking up longer tasks.`,
          icon: <Lightbulb size={20} />
        });
      } else if (longAvg > shortAvg + 10) {
        newInsights.push({
          type: 'tip',
          title: 'Long Sessions Are Your Strength',
          description: `You perform better in longer sessions (45+ min) with ${longAvg.toFixed(0)} points vs ${shortAvg.toFixed(0)}. Embrace deep work blocks.`,
          icon: <Lightbulb size={20} />
        });
      }
    }

    setInsights(newInsights);
  };

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'tip':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
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

  if (insights.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Lightbulb size={20} />
          Performance Insights
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-400">Complete more sessions to unlock personalized insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Lightbulb size={20} />
          Performance Insights
        </h3>
        <p className="text-sm text-gray-400">Personalized recommendations based on your data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`${getInsightStyle(insight.type)} border rounded-lg p-4 transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{insight.icon}</div>
              <div>
                <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                <p className="text-sm text-gray-300">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
