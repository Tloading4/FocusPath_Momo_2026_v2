import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Star, TrendingUp, BarChart3, Calendar, MessageSquare } from 'lucide-react';
import { SurveyStateService } from '../../services/SurveyStateService';

interface SurveyData {
  focus_rating?: number;
  energy_level?: string;
  difficulty_assessment?: string;
  would_repeat?: string;
  notes?: string;
  completed_at?: string;
  skipped?: boolean;
}

interface SessionWithSurvey {
  id: string;
  sessionType: string;
  duration: number;
  created_at: Date;
  survey: SurveyData;
}

export default function SurveyAnalytics() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<SessionWithSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30');
  const [surveySettings, setSurveySettings] = useState<any>(null);

  useEffect(() => {
    if (currentUser) {
      loadSurveyData();
      loadSurveySettings();
    }
  }, [currentUser, dateRange]);

  const loadSurveyData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const sessionsRef = collection(db, 'userProfiles', currentUser.uid, 'sessions');

      let q = query(sessionsRef);

      if (dateRange !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        q = query(sessionsRef, where('created_at', '>=', daysAgo));
      }

      const snapshot = await getDocs(q);
      const sessionsData: SessionWithSurvey[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.session_metadata?.post_survey && !data.session_metadata.post_survey.skipped) {
          sessionsData.push({
            id: doc.id,
            sessionType: data.sessionType || 'Unknown',
            duration: data.duration_actual || 0,
            created_at: data.created_at?.toDate() || new Date(),
            survey: data.session_metadata.post_survey,
          });
        }
      });

      setSessions(sessionsData.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()));
    } catch (error) {
      console.error('Error loading survey data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSurveySettings = async () => {
    if (!currentUser) return;

    try {
      const settings = await SurveyStateService.getSurveySettings(currentUser.uid);
      setSurveySettings(settings);
    } catch (error) {
      console.error('Error loading survey settings:', error);
    }
  };

  const calculateStats = () => {
    if (sessions.length === 0) return null;

    const avgFocusRating = sessions.reduce((sum, s) => sum + (s.survey.focus_rating || 0), 0) / sessions.length;

    const energyLevels = sessions.reduce((acc, s) => {
      const level = s.survey.energy_level || 'neutral';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const difficultyAssessments = sessions.reduce((acc, s) => {
      const diff = s.survey.difficulty_assessment || 'just_right';
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const repeatIntentions = sessions.reduce((acc, s) => {
      const intent = s.survey.would_repeat || 'maybe';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonEnergy = Object.entries(energyLevels).sort((a, b) => b[1] - a[1])[0];

    const sessionTypeRatings = sessions.reduce((acc, s) => {
      if (!acc[s.sessionType]) {
        acc[s.sessionType] = { total: 0, count: 0 };
      }
      acc[s.sessionType].total += s.survey.focus_rating || 0;
      acc[s.sessionType].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return {
      avgFocusRating,
      energyLevels,
      difficultyAssessments,
      repeatIntentions,
      mostCommonEnergy,
      sessionTypeRatings,
    };
  };

  const stats = calculateStats();

  const energyEmojis: Record<string, string> = {
    exhausted: '😵',
    tired: '😪',
    neutral: '😐',
    energized: '😊',
    pumped: '🚀',
  };

  const energyColors: Record<string, string> = {
    exhausted: 'bg-red-500',
    tired: 'bg-orange-500',
    neutral: 'bg-yellow-500',
    energized: 'bg-green-500',
    pumped: 'bg-blue-500',
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading survey insights...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageSquare className="mx-auto mb-4 text-gray-500" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">No Survey Data Yet</h3>
        <p className="text-gray-400 mb-4">
          Complete your first post-session survey to see insights here!
        </p>
        {surveySettings && (
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-blue-300">
              {SurveyStateService.getSurveyFrequencyText(surveySettings.totalCompleted)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={28} />
          Survey Insights
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('7')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateRange === '7'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDateRange('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateRange === '30'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Star className="text-yellow-400" size={24} />
                <h3 className="text-sm font-medium text-gray-400">Avg Focus Rating</h3>
              </div>
              <p className="text-3xl font-bold text-white">{stats.avgFocusRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">out of 5.0</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-400" size={24} />
                <h3 className="text-sm font-medium text-gray-400">Most Common Energy</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                {energyEmojis[stats.mostCommonEnergy[0]]} {stats.mostCommonEnergy[0]}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((stats.mostCommonEnergy[1] / sessions.length) * 100).toFixed(0)}% of sessions
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="text-purple-400" size={24} />
                <h3 className="text-sm font-medium text-gray-400">Survey Responses</h3>
              </div>
              <p className="text-3xl font-bold text-white">{sessions.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {surveySettings?.totalCompleted || 0} total completed
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-yellow-400" size={24} />
                <h3 className="text-sm font-medium text-gray-400">Repeat Rate</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                {(((stats.repeatIntentions.yes || 0) / sessions.length) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">would repeat sessions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Energy Levels</h3>
              <div className="space-y-3">
                {Object.entries(stats.energyLevels)
                  .sort((a, b) => b[1] - a[1])
                  .map(([level, count]) => {
                    const percentage = (count / sessions.length) * 100;
                    return (
                      <div key={level}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300 flex items-center gap-2">
                            <span className="text-lg">{energyEmojis[level]}</span>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </span>
                          <span className="text-sm font-medium text-white">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${energyColors[level]} rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Difficulty Assessment</h3>
              <div className="space-y-3">
                {Object.entries(stats.difficultyAssessments)
                  .sort((a, b) => b[1] - a[1])
                  .map(([difficulty, count]) => {
                    const percentage = (count / sessions.length) * 100;
                    const colors = {
                      too_easy: 'bg-green-500',
                      just_right: 'bg-blue-500',
                      too_hard: 'bg-red-500',
                    };
                    const labels = {
                      too_easy: 'Too Easy',
                      just_right: 'Just Right',
                      too_hard: 'Too Hard',
                    };
                    return (
                      <div key={difficulty}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300">
                            {labels[difficulty as keyof typeof labels]}
                          </span>
                          <span className="text-sm font-medium text-white">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[difficulty as keyof typeof colors]} rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Focus Rating by Session Type</h3>
            <div className="space-y-3">
              {Object.entries(stats.sessionTypeRatings)
                .sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)
                .map(([type, data]) => {
                  const avgRating = data.total / data.count;
                  const percentage = (avgRating / 5) * 100;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">{type}</span>
                        <span className="text-sm font-medium text-white flex items-center gap-1">
                          <Star className="text-yellow-400" size={14} />
                          {avgRating.toFixed(1)}
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Feedback</h3>
            {sessions.filter(s => s.survey.notes).length === 0 ? (
              <p className="text-gray-400 text-sm">No written feedback yet</p>
            ) : (
              <div className="space-y-3">
                {sessions
                  .filter((s) => s.survey.notes)
                  .slice(0, 5)
                  .map((session) => (
                    <div key={session.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-400">{session.sessionType}</span>
                          <span className="text-xs text-gray-500">
                            {session.created_at.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(session.survey.focus_rating || 0)].map((_, i) => (
                            <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">{session.survey.notes}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
