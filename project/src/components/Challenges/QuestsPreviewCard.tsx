import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Target, Calendar, Trophy, Clock, Star, Zap, Eye, RefreshCw, ArrowRight } from 'lucide-react';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  category: 'sessions' | 'streaks' | 'focus' | 'xp' | 'special';
  requirements: {
    target: number;
    metric: string;
    timeframe: 'today' | 'this_week';
  };
  rewards: {
    xp: number;
    items?: string[];
    powerups?: string[];
  };
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface QuestProgress {
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface QuestsPreviewCardProps {
  refreshTrigger?: number;
  onOpenQuests: () => void;
}

export function QuestsPreviewCard({ refreshTrigger = 0, onOpenQuests }: QuestsPreviewCardProps) {
  const [activeQuests, setActiveQuests] = useState<(Quest & { progress: number; completed: boolean; claimed: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { currentUser } = useAuth();

  // Generate the same quests as in ChallengesSystem
  const generateDailyQuests = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return [
      {
        id: `daily_focus_quest_${today.toDateString()}`,
        title: 'Daily Focus Warrior',
        description: 'Complete 3 focus sessions today',
        type: 'daily' as const,
        category: 'sessions' as const,
        requirements: { target: 3, metric: 'sessions', timeframe: 'today' as const },
        rewards: { xp: 10, powerups: ['powerup_motivation_boost'] },
        icon: '🎯',
        difficulty: 'easy' as const,
        startDate: today,
        endDate: tomorrow,
        isActive: true
      },
      {
        id: `daily_distraction_quest_${today.toDateString()}`,
        title: 'Distraction Master',
        description: 'Complete a session with 0 distractions',
        type: 'daily' as const,
        category: 'focus' as const,
        requirements: { target: 1, metric: 'perfect_sessions', timeframe: 'today' as const },
        rewards: { xp: 50, items: ['sound_binaural'] },
        icon: '🧘',
        difficulty: 'medium' as const,
        startDate: today,
        endDate: tomorrow,
        isActive: true
      },
      {
        id: `daily_endurance_quest_${today.toDateString()}`,
        title: 'Endurance Test',
        description: 'Complete a Hard or Extreme focus session',
        type: 'daily' as const,
        category: 'sessions' as const,
        requirements: { target: 1, metric: 'hard_sessions', timeframe: 'today' as const },
        rewards: { xp: 100, powerups: ['powerup_double_xp'] },
        icon: '💪',
        difficulty: 'hard' as const,
        startDate: today,
        endDate: tomorrow,
        isActive: true
      }
    ];
  };

  const generateWeeklyQuests = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return [
      {
        id: `weekly_consistency_${startOfWeek.toISOString().split('T')[0]}`,
        title: 'Consistency Champion',
        description: 'Maintain a 7-day focus streak',
        type: 'weekly' as const,
        category: 'streaks' as const,
        requirements: { target: 7, metric: 'streak_days', timeframe: 'this_week' as const },
        rewards: { xp: 300, items: ['special_golden_timer'], powerups: ['powerup_streak_shield'] },
        icon: '🔥',
        difficulty: 'extreme' as const,
        startDate: startOfWeek,
        endDate: endOfWeek,
        isActive: true
      },
      {
        id: `weekly_focus_marathon_${startOfWeek.toISOString().split('T')[0]}`,
        title: 'Focus Marathon',
        description: 'Complete 15 focus sessions this week',
        type: 'weekly' as const,
        category: 'sessions' as const,
        requirements: { target: 15, metric: 'sessions', timeframe: 'this_week' as const },
        rewards: { xp: 250, items: ['theme_aurora', 'sound_thunderstorm'] },
        icon: '🏃‍♂️',
        difficulty: 'hard' as const,
        startDate: startOfWeek,
        endDate: endOfWeek,
        isActive: true
      }
    ];
  };

  const fetchQuestsData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Generate the same quests as in ChallengesSystem
      const dailyQuests = generateDailyQuests();
      const weeklyQuests = generateWeeklyQuests();
      const allQuests = [...dailyQuests, ...weeklyQuests];

      // Load user progress for these quests
      const progressQuery = query(
        collection(db, 'userProfiles', currentUser.uid, 'challengeProgress'),
        where('questId', 'in', allQuests.map(q => q.id))
      );
      
      const progressSnapshot = await getDocs(progressQuery);
      const progressMap: Record<string, QuestProgress> = {};
      
      progressSnapshot.forEach(doc => {
        const data = doc.data();
        progressMap[data.questId] = {
          questId: data.questId,
          progress: data.progress || 0,
          completed: data.completed || false,
          claimed: data.claimed || false
        };
      });

      // Calculate progress for each quest
      const sessionsQuery = query(
        collection(db, 'userProfiles', currentUser.uid, 'sessions'),
        orderBy('startTime', 'desc')
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(doc.data().date?.seconds * 1000)
      }));

      const profileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
      const profileData = profileDoc.exists() ? profileDoc.data() : {};

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const questsWithProgress = allQuests.map(quest => {
        const existing = progressMap[quest.id];
        let progress = 0;

        switch (quest.requirements.metric) {
          case 'sessions':
            progress = sessions.filter(s =>
              (quest.type === 'daily'
                ? s.startTime.toDateString() === today.toDateString()
                : s.startTime >= startOfWeek) &&
              s.completed
            ).length;
            break;
          case 'perfect_sessions':
            progress = sessions.filter(s =>
              s.startTime.toDateString() === today.toDateString() &&
              s.completed &&
              (s.analytics?.distractionCount || 0) === 0
            ).length;
            break;
          case 'hard_sessions':
            progress = sessions.filter(s =>
              s.startTime.toDateString() === today.toDateString() &&
              s.completed &&
              (s.sessionTypeName === 'Hard Focus' || s.sessionTypeName === 'Extreme Focus')
            ).length;
            break;
          case 'streak_days':
            progress = profileData.currentStreak || 0;
            break;
          case 'xp_earned':
            progress = sessions
              .filter(s => s.startTime >= startOfWeek && s.completed)
              .reduce((sum, s) => sum + (s.xpEarned || 0), 0);
            break;
        }

        return {
          ...quest,
          progress: Math.min(progress, quest.requirements.target),
          completed: existing?.completed || progress >= quest.requirements.target,
          claimed: existing?.claimed || false
        };
      }).filter(quest => !quest.claimed); // Only show unclaimed quests
      
      setActiveQuests(questsWithProgress);
    } catch (error) {
      console.error('Error fetching quests data:', error);
      setError('Failed to load quests data');
    } finally {
      setLoading(false);
      setTimeout(() => setIsVisible(true), 100);
    }
  };

  useEffect(() => {
    fetchQuestsData();
  }, [currentUser, refreshTrigger]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'extreme': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'daily' ? 'text-blue-400' : 'text-purple-400';
  };

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in h-full flex flex-col">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-4 bg-white/20 rounded animate-shimmer"></div>
          <div className="h-4 bg-white/20 rounded animate-shimmer"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in h-full flex flex-col">
        <div className="text-center text-red-300">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-2">{error}</p>
          <button
            onClick={fetchQuestsData}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg transition-all"
          >
            <RefreshCw className="h-3 w-3 inline mr-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-2xl p-6 shadow-2xl hover-lift h-full flex flex-col transition-all duration-500 cursor-pointer ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`} onClick={onOpenQuests}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-2xl animate-pulse-glow">
            <Target className="h-6 w-6 text-white animate-float" />
          </div>
          <div className="animate-slide-right">
            <h2 className="text-2xl font-bold text-white">Active Quests</h2>
            <p className="text-gray-300">Daily & weekly challenges</p>
          </div>
        </div>
        
        <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all transform hover:scale-110 hover-bounce btn-press">
          <Eye className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Active Quests Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-4 text-center hover-glow transition-all animate-scale-in card-stagger-1">
          <div className="text-2xl mb-2 animate-bounce-in">📅</div>
          <div className="text-xl font-bold text-white animate-number-count">
            {activeQuests.filter(q => q.type === 'daily' && !q.claimed).length}
          </div>
          <div className="text-sm text-gray-300">Daily Quests</div>
        </div>
        <div className="rounded-xl p-4 text-center hover-glow transition-all animate-scale-in card-stagger-2">
          <div className="text-2xl mb-2 animate-bounce-in">🏆</div>
          <div className="text-xl font-bold text-white animate-number-count">
            {activeQuests.filter(q => q.type === 'weekly' && !q.claimed).length}
          </div>
          <div className="text-sm text-gray-300">Weekly Quests</div>
        </div>
      </div>

      {/* Featured Quests */}
      {activeQuests.length > 0 ? (
        <div className="space-y-3 mb-6 animate-fade-in flex-grow">
          {activeQuests.slice(0, 3).map((quest, index) => (
            <div
              key={quest.id}
              className={`rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all animate-slide-right card-stagger-${index + 1}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{quest.icon}</span>
                  <div>
                    <h4 className="font-semibold text-white text-sm">{quest.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        quest.type === 'daily' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {quest.type}
                      </span>
                      <span className={`text-xs ${getDifficultyColor(quest.difficulty)}`}>
                        {quest.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {quest.progress}/{quest.requirements.target}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatTimeRemaining(quest.endDate)}
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    quest.completed 
                      ? 'bg-green-500' 
                      : quest.type === 'daily' 
                        ? 'bg-blue-500' 
                        : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min((quest.progress / quest.requirements.target) * 100, 100)}%` }}
                />
              </div>
              
              {quest.completed && !quest.claimed && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                  <Trophy className="h-3 w-3" />
                  <span>Ready to claim!</span>
                </div>
              )}
            </div>
          ))}
          
          {activeQuests.length > 3 && (
            <div className="text-center">
              <p className="text-xs text-gray-400">
                +{activeQuests.length - 3} more quests available
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 animate-fade-in flex-grow">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3 animate-float" />
          <h4 className="text-lg font-semibold text-gray-300 mb-2">No Active Quests</h4>
          <p className="text-sm text-gray-400">Complete sessions to unlock daily and weekly challenges!</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex items-center justify-between text-sm text-gray-400 animate-slide-up">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          <span>{activeQuests.filter(q => q.completed && !q.claimed).length} ready to claim</span>
        </div>
        <div className="flex items-center gap-1">
          <span>View all</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>

      {/* Floating quest particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute text-orange-400/30 animate-float"
            style={{
              left: `${15 + i * 25}%`,
              top: `${10 + i * 20}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${2.5 + i * 0.3}s`
            }}
          >
            {['🎯', '🏆', '⭐', '🔥'][i]}
          </div>
        ))}
      </div>
    </div>
  );
}