import React, { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Target, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import { LevelingService } from '../../services/LevelingService';
import { LevelExplanationModal } from './LevelExplanationModal';

interface XPProgressProps {
  totalXP: number;
  detailed?: boolean;
  refreshTrigger?: number;
  size?: 'small' | 'medium' | 'large';
}

interface LevelAvatar {
  level: number;
  avatarId: string;
  name: string;
  emoji: string;
  unlocked: boolean;
  isActive: boolean;
}
export function XPProgress({
  totalXP,
  detailed = false,
  refreshTrigger = 0,
  size = 'medium'
}: XPProgressProps) {
  const { currentUser } = useAuth();
  const [profileXP, setProfileXP] = useState(0);
  const [animatedXP, setAnimatedXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  const [levelAvatars, setLevelAvatars] = useState<LevelAvatar[]>([]);
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);

  // Level-based avatar rewards
  const levelAvatarRewards = [
    { level: 5, avatarId: 'avatar_star', name: 'Star Avatar', emoji: '⭐' },
    { level: 10, avatarId: 'avatar_lightning', name: 'Lightning Avatar', emoji: '⚡' },
    { level: 20, avatarId: 'avatar_gem', name: 'Gem Avatar', emoji: '💎' },
    { level: 30, avatarId: 'avatar_trophy', name: 'Trophy Avatar', emoji: '🏆' },
    { level: 50, avatarId: 'avatar_crown', name: 'Crown Avatar', emoji: '👑' }
  ];
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
        type: 'daily',
        category: 'sessions',
        requirements: { target: 3, metric: 'sessions', timeframe: 'today' },
        rewards: { xp: 100, powerups: ['powerup_motivation_boost'] },
        icon: '🎯',
        difficulty: 'easy',
        startDate: today,
        endDate: tomorrow,
        isActive: true
      },
      {
        id: `daily_distraction_quest_${today.toDateString()}`,
        title: 'Distraction Master',
        description: 'Complete a session with 0 distractions',
        type: 'daily',
        category: 'focus',
        requirements: { target: 1, metric: 'perfect_sessions', timeframe: 'today' },
        rewards: { xp: 150, items: ['sound_binaural'] },
        icon: '🧘',
        difficulty: 'medium',
        startDate: today,
        endDate: tomorrow,
        isActive: true
      },
      {
        id: `daily_endurance_quest_${today.toDateString()}`,
        title: 'Endurance Test',
        description: 'Complete a Hard or Extreme focus session',
        type: 'daily',
        category: 'sessions',
        requirements: { target: 1, metric: 'hard_sessions', timeframe: 'today' },
        rewards: { xp: 200, powerups: ['powerup_double_xp'] },
        icon: '💪',
        difficulty: 'hard',
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
        type: 'weekly',
        category: 'streaks',
        requirements: { target: 7, metric: 'streak_days', timeframe: 'this_week' },
        rewards: { xp: 500, items: ['special_golden_timer'], powerups: ['powerup_streak_shield'] },
        icon: '🔥',
        difficulty: 'extreme',
        startDate: startOfWeek,
        endDate: endOfWeek,
        isActive: true
      },
      {
        id: `weekly_focus_marathon_${startOfWeek.toISOString().split('T')[0]}`,
        title: 'Focus Marathon',
        description: 'Complete 15 focus sessions this week',
        type: 'weekly',
        category: 'sessions',
        requirements: { target: 15, metric: 'sessions', timeframe: 'this_week' },
        rewards: { xp: 750, items: ['theme_aurora', 'sound_thunderstorm'] },
        icon: '🏃‍♂️',
        difficulty: 'hard',
        startDate: startOfWeek,
        endDate: endOfWeek,
        isActive: true
      },
      {
        id: `weekly_xp_collector_${startOfWeek.toISOString().split('T')[0]}`,
        title: 'XP Collector',
        description: 'Earn 1000 XP this week',
        type: 'weekly',
        category: 'xp',
        requirements: { target: 1000, metric: 'xp_earned', timeframe: 'this_week' },
        rewards: { xp: 300, items: ['avatar_crown'], powerups: ['powerup_ai_insights'] },
        icon: '💎',
        difficulty: 'medium',
        startDate: startOfWeek,
        endDate: endOfWeek,
        isActive: true
      }
    ];
  };

  // Real-time listener for profile XP changes
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPermissionError(false);
    
    console.log('XPProgress: Setting up real-time listener for user:', currentUser.uid);

    const profileRef = doc(db, 'userProfiles', currentUser.uid);
    const unsubscribe = onSnapshot(profileRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const newXP = data.totalXP || 0;

          console.log('XPProgress: Real-time XP update:', newXP);

          setProfileXP(newXP);
          setActiveAvatar(data.activeAvatar || null);
        } else {
          console.log('XPProgress: Profile document does not exist, creating...');
          // Create profile if it doesn't exist
          setDoc(profileRef, {
            displayName: currentUser.email?.split('@')[0] || 'User',
            totalXP: 0,
            currentStreak: 0,
            longestStreak: 0,
            createdAt: new Date(),
            lastUpdated: new Date()
          }, { merge: true });
          setProfileXP(0);
        }
        setLoading(false);
      },
      (err) => {
        console.error('XPProgress: Error listening to profile:', err);
        if (err.code === 'permission-denied' || err.message?.includes('permissions')) {
          setPermissionError(true);
        } else {
          setError('Failed to load XP data');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, profileXP]);

  // Fetch level avatars and check which ones are unlocked
  useEffect(() => {
    if (!currentUser) return;

    const fetchLevelAvatars = async () => {
      try {
        const currentLevel = LevelingService.getLevelFromXP(profileXP);

        // Get user's avatar purchases
        const purchasesQuery = query(
          collection(db, 'userProfiles', currentUser.uid, 'purchases'),
          where('category', '==', 'avatar')
        );
        const purchasesSnapshot = await getDocs(purchasesQuery);
        const ownedAvatars = new Set(purchasesSnapshot.docs.map(doc => doc.data().itemId));

        const avatarsWithStatus: LevelAvatar[] = levelAvatarRewards.map(reward => ({
          ...reward,
          unlocked: currentLevel >= reward.level && ownedAvatars.has(reward.avatarId),
          isActive: activeAvatar === reward.avatarId
        }));

        setLevelAvatars(avatarsWithStatus);
      } catch (error) {
        console.error('Error fetching level avatars:', error);
      }
    };

    fetchLevelAvatars();
  }, [currentUser, profileXP, activeAvatar]);
  // Fetch active quests
  useEffect(() => {
    if (!currentUser) return;

    const fetchActiveQuests = async () => {
      try {
        // Generate the same quests as in ChallengesSystem
        const dailyQuests = generateDailyQuests();
        const weeklyQuests = generateWeeklyQuests();
        const allQuests = [...dailyQuests, ...weeklyQuests];

        // Load user progress for these quests
        const progressQuery = query(
          collection(db, 'userProfiles', currentUser.uid, 'challengeProgress'),
          where('challengeId', 'in', allQuests.map(q => q.id))
        );
        
        const progressSnapshot = await getDocs(progressQuery);
        const progressMap: Record<string, any> = {};
        
        progressSnapshot.forEach(doc => {
          const data = doc.data();
          progressMap[data.challengeId] = data;
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
          if (existing?.completed) return null; // Filter out completed quests

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
            id: quest.id,
            title: quest.title,
            icon: quest.icon,
            type: quest.type,
            target: quest.requirements.target,
            progress: Math.min(progress, quest.requirements.target),
            completed: progress >= quest.requirements.target,
            xpReward: quest.rewards.xp
          };
        }).filter(quest => quest !== null); // Remove completed quests
        
        setActiveQuests(questsWithProgress);
      } catch (error) {
        console.error('Error fetching active quests:', error);
        setActiveQuests([]);
      }
    };

    fetchActiveQuests();
  }, [currentUser]);

  // Animate counter
  useEffect(() => {
    const target = profileXP;
    if (animatedXP === target) return;

    const duration = 1000;
    const steps = 60;
    const delta = (target - animatedXP) / steps;
    let step = 0;
    const handle = setInterval(() => {
      step++;
      setAnimatedXP(prev => {
        const next = prev + delta;
        if (step >= steps) {
          clearInterval(handle);
          return target;
        }
        return next;
      });
    }, duration / steps);
    return () => clearInterval(handle);
  }, [profileXP, animatedXP]);

  const currentTotalXP = profileXP;
  const levelInfo = LevelingService.getLevelInfo(currentTotalXP);
  const level = levelInfo.level;
  const xpThisLevel = levelInfo.xpIntoCurrentLevel;
  const xpToNext = levelInfo.xpForNextLevel - levelInfo.xpIntoCurrentLevel;
  const progressPct = levelInfo.progressPercent;

  const getLevelIcon = () =>
    level >= 50 ? <Trophy className="h-6 w-6 animate-bounce-in" /> :
    level >= 30 ? <Star className="h-6 w-6 animate-bounce-in" /> :
    level >= 10 ? <Zap className="h-6 w-6 animate-bounce-in" /> :
                  <Target className="h-6 w-6 animate-bounce-in" />;

  const getLevelTitle = () => LevelingService.getLevelTitle(level);
  const getLevelColor = () => LevelingService.getLevelColor(level);

  // --- RENDER ---

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-white/20 rounded animate-shimmer" />
          <div className="h-4 bg-white/20 rounded animate-shimmer" />
          <div className="h-2 bg-white/20 rounded animate-shimmer" />
        </div>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-bounce-in bg-orange-500/10 border border-orange-500/50">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-6 w-6 text-orange-400" />
          <h3 className="text-lg font-semibold text-orange-300">Configuration Required</h3>
        </div>
        <p className="text-orange-200 mb-4">
          XP tracking requires updated Firebase permissions. Please update your Firestore rules:
        </p>
        <code className="block text-xs bg-black/20 text-orange-100 p-2 rounded mb-4 whitespace-pre-wrap">
{`match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
}
match /sessions/{sessionId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
}`}
        </code>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-slide-up">
        <div className="text-center text-red-300">
          <div className="text-red-400 mb-2"><AlertCircle className="h-8 w-8 animate-bounce" /></div>
          <p className="mb-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div
      onClick={() => setShowLevelModal(true)}
      className={`glass-card rounded-xl sm:rounded-2xl shadow-2xl hover-lift animate-fade-in relative overflow-hidden w-full h-full flex flex-col cursor-pointer ${
        size === 'small' ? 'p-3' : size === 'large' ? 'p-6 sm:p-12' : 'p-3 sm:p-4'
      }`}
      title="Click to view level details"
    >
      {/* Level display */}
      <div className={`text-center ${size === 'small' ? 'mb-2' : size === 'large' ? 'mb-8' : 'mb-3'}`}>
        <div
          className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-r ${getLevelColor()} animate-scale-in ${
            size === 'small' ? 'w-8 h-8 mb-2' : size === 'large' ? 'w-24 h-24 mb-6' : 'w-12 h-12 mb-2'
          }`}
        >
          {getLevelIcon()}
        </div>
        <h2 className={`font-bold text-white mb-1 animate-slide-down ${
          size === 'small' ? 'text-lg' : size === 'large' ? 'text-4xl' : 'text-xl'
        }`}>
          Level {level}
        </h2>
        <p className={`text-gray-300 animate-fade-in ${
          size === 'small' ? 'text-xs' : size === 'large' ? 'text-xl' : 'text-sm'
        }`}>{getLevelTitle()}</p>
      </div>

      {/* XP Stats */}
      <div className={`grid grid-cols-2 gap-2 ${size === 'small' ? 'mb-2' : size === 'large' ? 'mb-6' : 'mb-3'}`}>
        <div className="rounded-lg p-2 text-center">
          <p className={`text-gray-400 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>Total XP</p>
          <p className={`font-bold text-white ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-2xl' : 'text-lg'}`}>
            {Math.round(currentTotalXP).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg p-2 text-center">
          <p className={`text-gray-400 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>To Level {level + 1}</p>
          <p className={`font-bold text-yellow-400 ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-2xl' : 'text-lg'}`}>
            {xpToNext.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className={size === 'small' ? 'mb-2' : size === 'large' ? 'mb-8' : 'mb-3'}>
        <div className={`flex justify-between mb-2 text-gray-300 ${
          size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-sm'
        }`}>
          <span>Level Progress</span>
          <span className="font-semibold">{Math.round(progressPct)}%</span>
        </div>
        <div className={`w-full bg-white/10 rounded-full overflow-hidden ${
          size === 'small' ? 'h-2' : size === 'large' ? 'h-4' : 'h-3'
        }`}>
          <div
            className={`rounded-full bg-gradient-to-r ${getLevelColor()} transition-all duration-1000 ease-out ${
              size === 'small' ? 'h-2' : size === 'large' ? 'h-4' : 'h-3'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className={`text-gray-400 mt-2 text-center ${
          size === 'small' ? 'text-xs' : size === 'large' ? 'text-sm' : 'text-xs'
        }`}>
          {Math.round(xpThisLevel).toLocaleString()} / {levelInfo.xpForNextLevel.toLocaleString()} XP in this level
        </p>
      </div>

      {/* Detailed or summary view */}
      {(detailed || size === 'large') && !loading && !error ? (
        <div className="space-y-3 flex-1">
          {/* Active Quests */}
          {/* Level Avatar Rewards */}
          {levelAvatars.length > 0 && (
            <div className={`rounded-xl ${size === 'large' ? 'p-6' : 'p-3'}`}>
              <h3 className={`font-bold text-white mb-2 flex items-center gap-2 ${
                size === 'large' ? 'text-xl' : 'text-base'
              }`}>
                <Trophy className="h-4 w-4 text-yellow-400" />
                Level Rewards
              </h3>
              <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 ${size === 'large' ? 'gap-4' : ''}`}>
                {levelAvatarRewards.map((reward) => {
                  const avatarData = levelAvatars.find(a => a.avatarId === reward.avatarId);
                  const isUnlocked = avatarData?.unlocked || false;
                  const isActive = avatarData?.isActive || false;
                  const hasReachedLevel = level >= reward.level;

                  return (
                    <div
                      key={reward.avatarId}
                      className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                        isActive
                          ? 'border-green-500/50 bg-green-500/20'
                          : hasReachedLevel
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/20 bg-white/5 opacity-50'
                      }`}
                    >
                      <div className={`text-2xl mb-2 ${isUnlocked ? '' : 'grayscale'}`}>
                        {reward.emoji}
                      </div>
                      <div className={`text-xs font-medium text-white mb-1 ${size === 'large' ? 'text-sm' : ''}`}>
                        {hasReachedLevel ? `Level ${reward.level} Reward` : `Unlock at Level ${reward.level}`}
                      </div>
                      <div className={`text-xs text-gray-300 ${size === 'large' ? 'text-sm' : ''}`}>
                        {reward.name}
                      </div>

                      {!hasReachedLevel && (
                        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">🔒 Locked</div>
                            <div className="text-gray-500 text-xs">Level {reward.level}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-gray-400 text-center">
                💡 Special avatars are automatically unlocked when you reach certain levels
              </div>
            </div>
          )}
          {activeQuests.length > 0 && (
            <div className={`rounded-xl ${size === 'large' ? 'p-6' : 'p-4'}`}>
              <h3 className={`font-bold text-white mb-3 flex items-center gap-2 ${
                size === 'large' ? 'text-xl' : 'text-lg'
              }`}>
                <Target className="h-5 w-5 text-purple-400" />
                Active Quests
              </h3>
              <div className={size === 'large' ? 'space-y-4' : 'space-y-3'}>
                {activeQuests.map((quest) => (
                  <div key={quest.id} className={`rounded-lg ${size === 'large' ? 'p-4' : 'p-3'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={size === 'large' ? 'text-xl' : 'text-lg'}>{quest.icon}</span>
                        <span className={`text-white font-medium ${size === 'large' ? 'text-base' : 'text-sm'}`}>{quest.title}</span>
                        <span className={`px-2 py-1 rounded-full ${
                          quest.type === 'daily' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                        } ${size === 'large' ? 'text-sm' : 'text-xs'}`}>
                          {quest.type}
                        </span>
                      </div>
                      <span className={`text-gray-300 ${size === 'large' ? 'text-base' : 'text-sm'}`}>
                        {quest.progress}/{quest.target}
                      </span>
                    </div>
                    <div className={`w-full bg-white/10 rounded-full ${size === 'large' ? 'h-3' : 'h-2'}`}>
                      <div
                        className={`rounded-full transition-all duration-500 ${
                          quest.type === 'daily' ? 'bg-blue-500' : 'bg-purple-500'
                        } ${size === 'large' ? 'h-3' : 'h-2'}`}
                        style={{ width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-center text-gray-300 ${size === 'small' ? 'space-y-2' : 'space-y-3'}`}>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2">
              <p className={`text-gray-400 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>Total XP</p>
              <p className={`font-bold text-white ${size === 'small' ? 'text-sm' : 'text-lg'}`}>
                {Math.round(animatedXP).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg p-2">
              <p className={`text-gray-400 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>Next Level</p>
              <p className={`font-bold text-yellow-400 ${size === 'small' ? 'text-sm' : 'text-lg'}`}>
                {xpToNext.toLocaleString()}
              </p>
            </div>
          </div>
          <p className={size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-sm'}>
            {Math.round(progressPct)}% to Level {level + 1}
          </p>
          
          {/* Mini Quest Display */}
          {activeQuests.length > 0 && size !== 'small' && (
            <div className={`space-y-2 ${size === 'large' ? 'mt-6' : 'mt-4'}`}>
              <h4 className={`font-semibold text-gray-300 ${size === 'large' ? 'text-base' : 'text-sm'}`}>Active Quests</h4>
              {activeQuests.slice(0, 1).map((quest) => (
                <div key={quest.id} className={`rounded-lg ${size === 'large' ? 'p-3' : 'p-2'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className={size === 'large' ? 'text-base' : 'text-sm'}>{quest.icon}</span>
                      <span className={`text-white ${size === 'large' ? 'text-sm' : 'text-xs'}`}>{quest.title}</span>
                    </div>
                    <span className={`text-gray-400 ${size === 'large' ? 'text-sm' : 'text-xs'}`}>
                      {quest.progress || 0}/{quest.target}
                    </span>
                  </div>
                  <div className={`w-full bg-white/10 rounded-full ${size === 'large' ? 'h-2' : 'h-1'}`}>
                    <div
                      className={`rounded-full transition-all duration-500 ${
                        quest.type === 'daily' ? 'bg-blue-400' : 'bg-purple-400'
                      } ${size === 'large' ? 'h-2' : 'h-1'}`}
                      style={{ width: `${Math.min(((quest.progress || 0) / quest.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Click hint */}
      {!permissionError && !error && (
        <div className="mt-auto pt-3 border-t border-white/10 text-center">
          <p className={`text-blue-300 animate-pulse ${
            size === 'small' ? 'text-xs' : 'text-sm'
          }`}>
            💡 Click to view level details
          </p>
        </div>
      )}

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(size === 'small' ? 2 : size === 'large' ? 5 : 3)].map((_, i) => (
          <div
            key={i}
            className={`absolute bg-blue-400/30 rounded-full animate-float ${
              size === 'small' ? 'w-1 h-1' : size === 'large' ? 'w-3 h-3' : 'w-2 h-2'
            }`}
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`
            }}
          />
        ))}
      </div>
    </div>

    <LevelExplanationModal
      isOpen={showLevelModal}
      onClose={() => setShowLevelModal(false)}
      currentLevel={level}
      currentXP={profileXP}
    />
    </>
  );
}
