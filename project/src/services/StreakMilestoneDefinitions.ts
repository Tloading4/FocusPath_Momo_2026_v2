export interface StreakMilestone {
  days: number;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
  color: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 3,
    name: 'First Spark',
    description: 'Keep your focus alive for 3 days',
    icon: '✨',
    xpReward: 50,
    tier: 'bronze',
    color: 'from-amber-600 to-orange-600',
  },
  {
    days: 5,
    name: 'Steady Flame',
    description: 'Maintain focus for 5 consecutive days',
    icon: '🔥',
    xpReward: 100,
    tier: 'bronze',
    color: 'from-orange-500 to-red-500',
  },
  {
    days: 7,
    name: 'Week Warrior',
    description: 'Complete a full week of focused work',
    icon: '⚡',
    xpReward: 200,
    tier: 'silver',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    days: 10,
    name: 'Double Digits',
    description: 'Reach 10 days of unstoppable focus',
    icon: '💫',
    xpReward: 300,
    tier: 'silver',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    days: 14,
    name: 'Fortnight Champion',
    description: 'Two weeks of consistent dedication',
    icon: '🌟',
    xpReward: 500,
    tier: 'gold',
    color: 'from-yellow-400 to-yellow-600',
  },
  {
    days: 21,
    name: 'Habit Former',
    description: '21 days - The science of habit formation',
    icon: '🎯',
    xpReward: 750,
    tier: 'gold',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    days: 30,
    name: 'Monthly Master',
    description: 'A full month of unwavering focus',
    icon: '👑',
    xpReward: 1000,
    tier: 'platinum',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    days: 45,
    name: 'Momentum King',
    description: '45 days of pure dedication',
    icon: '⚔️',
    xpReward: 1500,
    tier: 'platinum',
    color: 'from-purple-500 to-blue-500',
  },
  {
    days: 60,
    name: 'Unstoppable Force',
    description: 'Two months of relentless progress',
    icon: '💎',
    xpReward: 2000,
    tier: 'diamond',
    color: 'from-cyan-400 to-blue-600',
  },
  {
    days: 90,
    name: 'Quarter Legend',
    description: '90 days of excellence achieved',
    icon: '🏆',
    xpReward: 3000,
    tier: 'diamond',
    color: 'from-yellow-300 to-orange-500',
  },
  {
    days: 100,
    name: 'Century Streak',
    description: '100 days of pure mastery',
    icon: '💯',
    xpReward: 4000,
    tier: 'legendary',
    color: 'from-pink-500 to-red-500',
  },
  {
    days: 180,
    name: 'Half Year Hero',
    description: 'Six months of unwavering commitment',
    icon: '🌈',
    xpReward: 6000,
    tier: 'legendary',
    color: 'from-violet-500 to-fuchsia-500',
  },
  {
    days: 365,
    name: 'Immortal Streak',
    description: 'A full year of legendary focus',
    icon: '🔱',
    xpReward: 10000,
    tier: 'legendary',
    color: 'from-amber-400 via-orange-500 to-red-600',
  },
];

export function getStreakMilestone(days: number): StreakMilestone | undefined {
  return STREAK_MILESTONES.find(m => m.days === days);
}

export function getNextMilestone(currentStreak: number): StreakMilestone | undefined {
  return STREAK_MILESTONES.find(m => m.days > currentStreak);
}

export function getAllMilestones(): StreakMilestone[] {
  return STREAK_MILESTONES;
}

export function getMilestoneProgress(currentStreak: number): {
  current: StreakMilestone | undefined;
  next: StreakMilestone | undefined;
  progress: number;
} {
  const current = STREAK_MILESTONES
    .filter(m => m.days <= currentStreak)
    .sort((a, b) => b.days - a.days)[0];

  const next = getNextMilestone(currentStreak);

  let progress = 0;
  if (next) {
    const prevDays = current?.days || 0;
    progress = ((currentStreak - prevDays) / (next.days - prevDays)) * 100;
  } else {
    progress = 100;
  }

  return { current, next, progress };
}
