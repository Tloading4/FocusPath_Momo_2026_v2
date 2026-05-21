export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  checkCriteria: (stats: UserStats) => boolean;
  category: 'sessions' | 'focus_time' | 'streaks' | 'perfection' | 'xp' | 'dedication' | 'special';
}

export interface UserStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusTimeMinutes: number;
  totalFocusTimeHours: number;
  longestStreak: number;
  currentStreak: number;
  totalXP: number;
  perfectSessions: number;
  sessionsWithNoDistractions: number;
  marathonSessions: number;
  uniqueDaysActive: number;
  morningSessionsCount: number;
  afternoonSessionsCount: number;
  eveningSessionsCount: number;
  nightSessionsCount: number;
  averageFocusScore: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: 'first_session',
    name: 'First Steps',
    description: 'Complete your first focus session',
    icon: '🎯',
    rarity: 'common',
    xpReward: 50,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 1,
  },
  {
    key: 'session_5',
    name: 'Getting Started',
    description: 'Complete 5 focus sessions',
    icon: '🔥',
    rarity: 'common',
    xpReward: 100,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 5,
  },
  {
    key: 'session_10',
    name: 'Dedicated Learner',
    description: 'Complete 10 focus sessions',
    icon: '📚',
    rarity: 'common',
    xpReward: 150,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 10,
  },
  {
    key: 'session_25',
    name: 'Focus Enthusiast',
    description: 'Complete 25 focus sessions',
    icon: '⚡',
    rarity: 'rare',
    xpReward: 250,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 25,
  },
  {
    key: 'session_50',
    name: 'Concentration Master',
    description: 'Complete 50 focus sessions',
    icon: '🌟',
    rarity: 'rare',
    xpReward: 500,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 50,
  },
  {
    key: 'session_100',
    name: 'Century Club',
    description: 'Complete 100 focus sessions',
    icon: '💯',
    rarity: 'epic',
    xpReward: 1000,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 100,
  },
  {
    key: 'session_250',
    name: 'Focus Legend',
    description: 'Complete 250 focus sessions',
    icon: '👑',
    rarity: 'epic',
    xpReward: 2000,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 250,
  },
  {
    key: 'session_500',
    name: 'Unstoppable Force',
    description: 'Complete 500 focus sessions',
    icon: '🚀',
    rarity: 'legendary',
    xpReward: 5000,
    category: 'sessions',
    checkCriteria: (stats) => stats.completedSessions >= 500,
  },
  {
    key: 'focus_time_1hr',
    name: 'First Hour',
    description: 'Accumulate 1 hour of total focus time',
    icon: '⏰',
    rarity: 'common',
    xpReward: 75,
    category: 'focus_time',
    checkCriteria: (stats) => stats.totalFocusTimeHours >= 1,
  },
  {
    key: 'focus_time_5hr',
    name: 'Time Warrior',
    description: 'Accumulate 5 hours of total focus time',
    icon: '⌚',
    rarity: 'common',
    xpReward: 150,
    category: 'focus_time',
    checkCriteria: (stats) => stats.totalFocusTimeHours >= 5,
  },
  {
    key: 'focus_time_10hr',
    name: 'Dedicated Student',
    description: 'Accumulate 10 hours of total focus time',
    icon: '📖',
    rarity: 'rare',
    xpReward: 300,
    category: 'focus_time',
    checkCriteria: (stats) => stats.totalFocusTimeHours >= 10,
  },
  {
    key: 'focus_time_25hr',
    name: 'Focus Marathon',
    description: 'Accumulate 25 hours of total focus time',
    icon: '🏃',
    rarity: 'rare',
    xpReward: 600,
    category: 'focus_time',
    checkCriteria: (stats) => stats.totalFocusTimeHours >= 25,
  },
  {
    key: 'focus_time_50hr',
    name: 'Concentration Pro',
    description: 'Accumulate 50 hours of total focus time',
    icon: '💪',
    rarity: 'epic',
    xpReward: 1200,
    category: 'focus_time',
    checkCriteria: (stats) => stats.totalFocusTimeHours >= 50,
  },
  {
    key: 'focus_time_100hr',
    name: 'Time Master',
    description: 'Accumulate 100 hours of total focus time',
    icon: '🎓',
    rarity: 'epic',
    xpReward: 2500,
    category: 'focus_time',
    checkCriteria: (stats) => stats.totalFocusTimeHours >= 100,
  },
  {
    key: 'focus_time_250hr',
    name: 'Elite Focuser',
    description: 'Accumulate 250 hours of total focus time',
    icon: '🔮',
    rarity: 'legendary',
    xpReward: 5000,
    category: 'focus_time',
    checkCriteria: (stats) => stats.totalFocusTimeHours >= 250,
  },
  {
    key: 'streak_3',
    name: 'Consistency Begins',
    description: 'Maintain a 3-day focus streak',
    icon: '🔥',
    rarity: 'common',
    xpReward: 100,
    category: 'streaks',
    checkCriteria: (stats) => stats.longestStreak >= 3,
  },
  {
    key: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day focus streak',
    icon: '📅',
    rarity: 'rare',
    xpReward: 250,
    category: 'streaks',
    checkCriteria: (stats) => stats.longestStreak >= 7,
  },
  {
    key: 'streak_14',
    name: 'Two Week Champion',
    description: 'Maintain a 14-day focus streak',
    icon: '🏆',
    rarity: 'rare',
    xpReward: 500,
    category: 'streaks',
    checkCriteria: (stats) => stats.longestStreak >= 14,
  },
  {
    key: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day focus streak',
    icon: '🌙',
    rarity: 'epic',
    xpReward: 1000,
    category: 'streaks',
    checkCriteria: (stats) => stats.longestStreak >= 30,
  },
  {
    key: 'streak_60',
    name: 'Unstoppable Habit',
    description: 'Maintain a 60-day focus streak',
    icon: '💎',
    rarity: 'epic',
    xpReward: 2000,
    category: 'streaks',
    checkCriteria: (stats) => stats.longestStreak >= 60,
  },
  {
    key: 'streak_100',
    name: 'Century Streak',
    description: 'Maintain a 100-day focus streak',
    icon: '👑',
    rarity: 'legendary',
    xpReward: 5000,
    category: 'streaks',
    checkCriteria: (stats) => stats.longestStreak >= 100,
  },
  {
    key: 'perfect_first',
    name: 'Flawless Focus',
    description: 'Complete a session with zero distractions',
    icon: '✨',
    rarity: 'common',
    xpReward: 100,
    category: 'perfection',
    checkCriteria: (stats) => stats.sessionsWithNoDistractions >= 1,
  },
  {
    key: 'perfect_10',
    name: 'Perfect Ten',
    description: 'Complete 10 sessions with zero distractions',
    icon: '🌟',
    rarity: 'rare',
    xpReward: 300,
    category: 'perfection',
    checkCriteria: (stats) => stats.sessionsWithNoDistractions >= 10,
  },
  {
    key: 'perfect_25',
    name: 'Zen Master',
    description: 'Complete 25 sessions with zero distractions',
    icon: '🧘',
    rarity: 'epic',
    xpReward: 750,
    category: 'perfection',
    checkCriteria: (stats) => stats.sessionsWithNoDistractions >= 25,
  },
  {
    key: 'perfect_50',
    name: 'Distraction Destroyer',
    description: 'Complete 50 sessions with zero distractions',
    icon: '⚔️',
    rarity: 'legendary',
    xpReward: 2000,
    category: 'perfection',
    checkCriteria: (stats) => stats.sessionsWithNoDistractions >= 50,
  },
  {
    key: 'xp_500',
    name: 'XP Novice',
    description: 'Earn 500 total XP',
    icon: '🎯',
    rarity: 'common',
    xpReward: 50,
    category: 'xp',
    checkCriteria: (stats) => stats.totalXP >= 500,
  },
  {
    key: 'xp_1000',
    name: 'XP Apprentice',
    description: 'Earn 1,000 total XP',
    icon: '⭐',
    rarity: 'common',
    xpReward: 100,
    category: 'xp',
    checkCriteria: (stats) => stats.totalXP >= 1000,
  },
  {
    key: 'xp_2500',
    name: 'XP Warrior',
    description: 'Earn 2,500 total XP',
    icon: '🌠',
    rarity: 'rare',
    xpReward: 250,
    category: 'xp',
    checkCriteria: (stats) => stats.totalXP >= 2500,
  },
  {
    key: 'xp_5000',
    name: 'XP Champion',
    description: 'Earn 5,000 total XP',
    icon: '🏅',
    rarity: 'rare',
    xpReward: 500,
    category: 'xp',
    checkCriteria: (stats) => stats.totalXP >= 5000,
  },
  {
    key: 'xp_10000',
    name: 'XP Master',
    description: 'Earn 10,000 total XP',
    icon: '💫',
    rarity: 'epic',
    xpReward: 1000,
    category: 'xp',
    checkCriteria: (stats) => stats.totalXP >= 10000,
  },
  {
    key: 'xp_25000',
    name: 'XP Legend',
    description: 'Earn 25,000 total XP',
    icon: '🌟',
    rarity: 'legendary',
    xpReward: 2500,
    category: 'xp',
    checkCriteria: (stats) => stats.totalXP >= 25000,
  },
  {
    key: 'marathon_first',
    name: 'Marathon Runner',
    description: 'Complete a 60+ minute focus session',
    icon: '🏃‍♂️',
    rarity: 'rare',
    xpReward: 200,
    category: 'dedication',
    checkCriteria: (stats) => stats.marathonSessions >= 1,
  },
  {
    key: 'marathon_10',
    name: 'Endurance Pro',
    description: 'Complete 10 marathon (60+ min) sessions',
    icon: '💪',
    rarity: 'epic',
    xpReward: 500,
    category: 'dedication',
    checkCriteria: (stats) => stats.marathonSessions >= 10,
  },
  {
    key: 'all_times',
    name: 'Around the Clock',
    description: 'Complete sessions in morning, afternoon, evening, and night',
    icon: '🌍',
    rarity: 'rare',
    xpReward: 300,
    category: 'dedication',
    checkCriteria: (stats) =>
      stats.morningSessionsCount > 0 &&
      stats.afternoonSessionsCount > 0 &&
      stats.eveningSessionsCount > 0 &&
      stats.nightSessionsCount > 0,
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 10 sessions in the morning (5am-12pm)',
    icon: '🌅',
    rarity: 'common',
    xpReward: 150,
    category: 'dedication',
    checkCriteria: (stats) => stats.morningSessionsCount >= 10,
  },
  {
    key: 'night_owl',
    name: 'Night Owl',
    description: 'Complete 10 sessions at night (9pm-5am)',
    icon: '🦉',
    rarity: 'common',
    xpReward: 150,
    category: 'dedication',
    checkCriteria: (stats) => stats.nightSessionsCount >= 10,
  },
  {
    key: 'active_days_30',
    name: '30 Days Active',
    description: 'Be active on 30 unique days',
    icon: '📆',
    rarity: 'rare',
    xpReward: 400,
    category: 'dedication',
    checkCriteria: (stats) => stats.uniqueDaysActive >= 30,
  },
  {
    key: 'active_days_60',
    name: '60 Days Active',
    description: 'Be active on 60 unique days',
    icon: '📅',
    rarity: 'epic',
    xpReward: 800,
    category: 'dedication',
    checkCriteria: (stats) => stats.uniqueDaysActive >= 60,
  },
  {
    key: 'active_days_100',
    name: '100 Days Active',
    description: 'Be active on 100 unique days',
    icon: '🗓️',
    rarity: 'legendary',
    xpReward: 1500,
    category: 'dedication',
    checkCriteria: (stats) => stats.uniqueDaysActive >= 100,
  },
];

export function getAchievementByKey(key: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.key === key);
}

export function getAchievementsByCategory(category: string): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter(a => a.category === category);
}

export function checkEarnedAchievements(stats: UserStats): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter(achievement => achievement.checkCriteria(stats));
}
