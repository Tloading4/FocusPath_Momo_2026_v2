import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase';
import { firebaseSessionService } from '../../services/FirebaseSessionService';
import { ACHIEVEMENT_DEFINITIONS, AchievementDefinition, UserStats } from '../../services/AchievementDefinitions';
import { Target, ChevronDown, ChevronUp, Trophy, Sparkles, Lock } from 'lucide-react';

interface AchievementProgress {
  achievement: AchievementDefinition;
  progress: number;
  currentValue: number;
  targetValue: number;
  progressText: string;
}

export function NextAchievementsProgress() {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nextAchievements, setNextAchievements] = useState<AchievementProgress[]>([]);
  const [closestAchievement, setClosestAchievement] = useState<AchievementProgress | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchAchievementProgress = async () => {
      try {
        setLoading(true);

        const [sessions, existingAchievements] = await Promise.all([
          firebaseSessionService.getUserSessions(currentUser.uid),
          fetchExistingAchievements(),
        ]);

        const stats = calculateUserStats(sessions);
        const progressList = calculateAchievementProgress(stats, existingAchievements);

        const sortedByProgress = progressList
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 10);

        setNextAchievements(sortedByProgress);
        setClosestAchievement(sortedByProgress[0] || null);
      } catch (error) {
        console.error('Error fetching achievement progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievementProgress();
  }, [currentUser]);

  const fetchExistingAchievements = async (): Promise<Set<string>> => {
    if (!currentUser) return new Set();

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_key')
        .eq('user_id', currentUser.uid);

      if (error) throw error;
      return new Set((data || []).map(a => a.achievement_key));
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return new Set();
    }
  };

  const calculateUserStats = (sessions: any[]): UserStats => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTimeMinutes: 0,
        totalFocusTimeHours: 0,
        longestStreak: 0,
        currentStreak: 0,
        totalXP: 0,
        perfectSessions: 0,
        sessionsWithNoDistractions: 0,
        marathonSessions: 0,
        uniqueDaysActive: 0,
        morningSessionsCount: 0,
        afternoonSessionsCount: 0,
        eveningSessionsCount: 0,
        nightSessionsCount: 0,
        averageFocusScore: 0,
      };
    }

    const completedSessions = sessions.filter(s => s.completed);
    const totalFocusTimeMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalXP = sessions.reduce((sum, s) => sum + s.xpEarned - s.xpDeducted, 0);
    const sessionsWithNoDistractions = completedSessions.filter(
      s => s.analytics.distractionCount === 0
    ).length;
    const marathonSessions = completedSessions.filter(s => s.duration >= 60).length;

    const uniqueDays = new Set<string>();
    sessions.forEach(session => {
      const dayKey = session.date.toISOString().split('T')[0];
      uniqueDays.add(dayKey);
    });

    let morningSessionsCount = 0;
    let afternoonSessionsCount = 0;
    let eveningSessionsCount = 0;
    let nightSessionsCount = 0;

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      if (hour >= 5 && hour < 12) morningSessionsCount++;
      else if (hour >= 12 && hour < 17) afternoonSessionsCount++;
      else if (hour >= 17 && hour < 21) eveningSessionsCount++;
      else nightSessionsCount++;
    });

    const sortedDays = Array.from(uniqueDays).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const diffDays = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    let currentStreak = 0;
    const today = new Date();
    let checkDate = new Date(today);
    checkDate.setHours(0, 0, 0, 0);

    while (uniqueDays.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const averageFocusScore = sessions.reduce(
      (sum, s) => sum + s.analytics.focusScore, 0
    ) / sessions.length;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalFocusTimeMinutes,
      totalFocusTimeHours: Math.floor(totalFocusTimeMinutes / 60),
      longestStreak,
      currentStreak,
      totalXP,
      perfectSessions: sessionsWithNoDistractions,
      sessionsWithNoDistractions,
      marathonSessions,
      uniqueDaysActive: uniqueDays.size,
      morningSessionsCount,
      afternoonSessionsCount,
      eveningSessionsCount,
      nightSessionsCount,
      averageFocusScore: Math.round(averageFocusScore),
    };
  };

  const calculateAchievementProgress = (
    stats: UserStats,
    earnedKeys: Set<string>
  ): AchievementProgress[] => {
    const progressList: AchievementProgress[] = [];

    ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
      if (earnedKeys.has(achievement.key)) return;

      const progressData = getProgressForAchievement(achievement, stats);
      if (progressData) {
        progressList.push(progressData);
      }
    });

    return progressList;
  };

  const getProgressForAchievement = (
    achievement: AchievementDefinition,
    stats: UserStats
  ): AchievementProgress | null => {
    let currentValue = 0;
    let targetValue = 1;
    let progressText = '';

    switch (achievement.key) {
      case 'first_session':
        currentValue = stats.completedSessions;
        targetValue = 1;
        progressText = `${currentValue}/1 sessions`;
        break;
      case 'session_5':
        currentValue = stats.completedSessions;
        targetValue = 5;
        progressText = `${currentValue}/5 sessions`;
        break;
      case 'session_10':
        currentValue = stats.completedSessions;
        targetValue = 10;
        progressText = `${currentValue}/10 sessions`;
        break;
      case 'session_25':
        currentValue = stats.completedSessions;
        targetValue = 25;
        progressText = `${currentValue}/25 sessions`;
        break;
      case 'session_50':
        currentValue = stats.completedSessions;
        targetValue = 50;
        progressText = `${currentValue}/50 sessions`;
        break;
      case 'session_100':
        currentValue = stats.completedSessions;
        targetValue = 100;
        progressText = `${currentValue}/100 sessions`;
        break;
      case 'session_250':
        currentValue = stats.completedSessions;
        targetValue = 250;
        progressText = `${currentValue}/250 sessions`;
        break;
      case 'session_500':
        currentValue = stats.completedSessions;
        targetValue = 500;
        progressText = `${currentValue}/500 sessions`;
        break;
      case 'focus_time_1hr':
        currentValue = stats.totalFocusTimeHours;
        targetValue = 1;
        progressText = `${currentValue}/1 hours`;
        break;
      case 'focus_time_5hr':
        currentValue = stats.totalFocusTimeHours;
        targetValue = 5;
        progressText = `${currentValue}/5 hours`;
        break;
      case 'focus_time_10hr':
        currentValue = stats.totalFocusTimeHours;
        targetValue = 10;
        progressText = `${currentValue}/10 hours`;
        break;
      case 'focus_time_25hr':
        currentValue = stats.totalFocusTimeHours;
        targetValue = 25;
        progressText = `${currentValue}/25 hours`;
        break;
      case 'focus_time_50hr':
        currentValue = stats.totalFocusTimeHours;
        targetValue = 50;
        progressText = `${currentValue}/50 hours`;
        break;
      case 'focus_time_100hr':
        currentValue = stats.totalFocusTimeHours;
        targetValue = 100;
        progressText = `${currentValue}/100 hours`;
        break;
      case 'focus_time_250hr':
        currentValue = stats.totalFocusTimeHours;
        targetValue = 250;
        progressText = `${currentValue}/250 hours`;
        break;
      case 'streak_3':
        currentValue = stats.longestStreak;
        targetValue = 3;
        progressText = `${currentValue}/3 day streak`;
        break;
      case 'streak_7':
        currentValue = stats.longestStreak;
        targetValue = 7;
        progressText = `${currentValue}/7 day streak`;
        break;
      case 'streak_14':
        currentValue = stats.longestStreak;
        targetValue = 14;
        progressText = `${currentValue}/14 day streak`;
        break;
      case 'streak_30':
        currentValue = stats.longestStreak;
        targetValue = 30;
        progressText = `${currentValue}/30 day streak`;
        break;
      case 'streak_60':
        currentValue = stats.longestStreak;
        targetValue = 60;
        progressText = `${currentValue}/60 day streak`;
        break;
      case 'streak_100':
        currentValue = stats.longestStreak;
        targetValue = 100;
        progressText = `${currentValue}/100 day streak`;
        break;
      case 'perfect_first':
        currentValue = stats.sessionsWithNoDistractions;
        targetValue = 1;
        progressText = `${currentValue}/1 perfect session`;
        break;
      case 'perfect_10':
        currentValue = stats.sessionsWithNoDistractions;
        targetValue = 10;
        progressText = `${currentValue}/10 perfect sessions`;
        break;
      case 'perfect_25':
        currentValue = stats.sessionsWithNoDistractions;
        targetValue = 25;
        progressText = `${currentValue}/25 perfect sessions`;
        break;
      case 'perfect_50':
        currentValue = stats.sessionsWithNoDistractions;
        targetValue = 50;
        progressText = `${currentValue}/50 perfect sessions`;
        break;
      case 'xp_500':
        currentValue = stats.totalXP;
        targetValue = 500;
        progressText = `${currentValue}/500 XP`;
        break;
      case 'xp_1000':
        currentValue = stats.totalXP;
        targetValue = 1000;
        progressText = `${currentValue}/1,000 XP`;
        break;
      case 'xp_2500':
        currentValue = stats.totalXP;
        targetValue = 2500;
        progressText = `${currentValue}/2,500 XP`;
        break;
      case 'xp_5000':
        currentValue = stats.totalXP;
        targetValue = 5000;
        progressText = `${currentValue}/5,000 XP`;
        break;
      case 'xp_10000':
        currentValue = stats.totalXP;
        targetValue = 10000;
        progressText = `${currentValue}/10,000 XP`;
        break;
      case 'xp_25000':
        currentValue = stats.totalXP;
        targetValue = 25000;
        progressText = `${currentValue}/25,000 XP`;
        break;
      case 'marathon_first':
        currentValue = stats.marathonSessions;
        targetValue = 1;
        progressText = `${currentValue}/1 marathon session`;
        break;
      case 'marathon_10':
        currentValue = stats.marathonSessions;
        targetValue = 10;
        progressText = `${currentValue}/10 marathon sessions`;
        break;
      case 'early_bird':
        currentValue = stats.morningSessionsCount;
        targetValue = 10;
        progressText = `${currentValue}/10 morning sessions`;
        break;
      case 'night_owl':
        currentValue = stats.nightSessionsCount;
        targetValue = 10;
        progressText = `${currentValue}/10 night sessions`;
        break;
      case 'active_days_30':
        currentValue = stats.uniqueDaysActive;
        targetValue = 30;
        progressText = `${currentValue}/30 active days`;
        break;
      case 'active_days_60':
        currentValue = stats.uniqueDaysActive;
        targetValue = 60;
        progressText = `${currentValue}/60 active days`;
        break;
      case 'active_days_100':
        currentValue = stats.uniqueDaysActive;
        targetValue = 100;
        progressText = `${currentValue}/100 active days`;
        break;
      case 'all_times':
        const timeSlots = [
          stats.morningSessionsCount > 0,
          stats.afternoonSessionsCount > 0,
          stats.eveningSessionsCount > 0,
          stats.nightSessionsCount > 0,
        ].filter(Boolean).length;
        currentValue = timeSlots;
        targetValue = 4;
        progressText = `${timeSlots}/4 time periods`;
        break;
      default:
        return null;
    }

    const progress = Math.min((currentValue / targetValue) * 100, 100);

    return {
      achievement,
      progress,
      currentValue,
      targetValue,
      progressText,
    };
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-orange-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-400';
      case 'rare': return 'border-blue-400';
      case 'epic': return 'border-purple-400';
      case 'legendary': return 'border-yellow-400';
      default: return 'border-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <Target className="h-6 w-6 text-blue-400 animate-pulse" />
          <h3 className="text-xl font-bold text-white">Next Achievements</h3>
        </div>
        <div className="text-gray-300 text-center py-8">Loading progress...</div>
      </div>
    );
  }

  if (nextAchievements.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">All Achievements Unlocked!</h3>
        </div>
        <p className="text-gray-300 text-center py-4">
          You've unlocked all available achievements!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4 shadow-2xl hover-lift animate-fade-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Next Achievements</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-white" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white" />
        )}
      </button>

      {closestAchievement && (
        <div className="mb-3">
          <div className="flex items-start gap-3 rounded-xl p-3 border border-white/10">
            <div className={`text-3xl bg-gradient-to-br ${getRarityColor(closestAchievement.achievement.rarity)} p-2 rounded-xl border-2 ${getRarityBorder(closestAchievement.achievement.rarity)}`}>
              {closestAchievement.achievement.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-base font-bold text-white">
                  {closestAchievement.achievement.name}
                </h4>
                <span className={`text-xs px-1.5 py-0.5 rounded-full bg-gradient-to-r ${getRarityColor(closestAchievement.achievement.rarity)} text-white font-bold`}>
                  {closestAchievement.achievement.rarity.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                {closestAchievement.achievement.description}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">{closestAchievement.progressText}</span>
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    +{closestAchievement.achievement.xpReward} XP
                  </span>
                </div>
                <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getRarityColor(closestAchievement.achievement.rarity)} transition-all duration-500`}
                    style={{ width: `${closestAchievement.progress}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-lg">
                    {Math.round(closestAchievement.progress)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isExpanded && nextAchievements.length > 1 && (
        <div className="space-y-3 animate-slide-down">
          <div className="text-xs text-gray-400 font-semibold mb-2">
            Other Upcoming Achievements
          </div>
          {nextAchievements.slice(1, 6).map((item, index) => (
            <div
              key={item.achievement.key}
              className="flex items-center gap-2 rounded-lg p-2 border border-white/10 hover:bg-white/10 transition-all"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={`text-xl bg-gradient-to-br ${getRarityColor(item.achievement.rarity)} p-1.5 rounded-lg border ${getRarityBorder(item.achievement.rarity)}`}>
                {item.achievement.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h5 className="text-xs font-bold text-white truncate">
                    {item.achievement.name}
                  </h5>
                  <span className="text-xs text-yellow-400 font-bold whitespace-nowrap">
                    +{item.achievement.xpReward} XP
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-1">{item.progressText}</div>
                <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getRarityColor(item.achievement.rarity)} transition-all duration-500`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
              {item.progress < 10 && (
                <Lock className="h-4 w-4 text-gray-500" />
              )}
            </div>
          ))}
          {nextAchievements.length > 6 && (
            <div className="text-center text-sm text-gray-400 pt-2">
              +{nextAchievements.length - 6} more achievements available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
