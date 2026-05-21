import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Lock, CheckCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { STREAK_MILESTONES, getMilestoneProgress } from '../../services/StreakMilestoneDefinitions';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface StreakMilestonesProps {
  currentStreak: number;
  refreshTrigger?: number;
}

interface AchievedMilestone {
  days: number;
  achievedAt: Date;
  xpAwarded: number;
}

export function StreakMilestones({ currentStreak, refreshTrigger = 0 }: StreakMilestonesProps) {
  const { currentUser } = useAuth();
  const [achievedMilestones, setAchievedMilestones] = useState<AchievedMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Add small delay when refreshing to ensure Firebase data is fresh
    const timer = setTimeout(() => {
      loadAchievedMilestones();
    }, 100);

    return () => clearTimeout(timer);
  }, [currentUser, refreshTrigger]);

  const loadAchievedMilestones = async () => {
    if (!currentUser) return;

    try {
      const milestonesQuery = query(
        collection(db, 'userProfiles', currentUser.uid, 'streakMilestones'),
        where('userId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(milestonesQuery);
      const milestones: AchievedMilestone[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        milestones.push({
          days: data.milestoneDays,
          achievedAt: data.achievedAt?.toDate() || new Date(),
          xpAwarded: data.xpAwarded || 0,
        });
      });

      setAchievedMilestones(milestones);
    } catch (error) {
      console.error('Error loading achieved milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const { next, progress } = getMilestoneProgress(currentStreak);

  const isMilestoneAchieved = (days: number) => {
    return achievedMilestones.some(m => m.days === days) || currentStreak >= days;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'from-amber-600 to-orange-700';
      case 'silver':
        return 'from-gray-400 to-gray-500';
      case 'gold':
        return 'from-yellow-400 to-yellow-600';
      case 'platinum':
        return 'from-cyan-400 to-blue-500';
      case 'diamond':
        return 'from-blue-400 to-cyan-300';
      case 'legendary':
        return 'from-purple-500 via-pink-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded" />
          <div className="h-4 bg-white/20 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-2 rounded-xl">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Streak Milestones</h2>
            <p className="text-sm text-gray-300">Unlock rewards for consistency</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{currentStreak}</div>
          <div className="text-xs text-gray-400">Current Streak</div>
        </div>
      </div>

      {next && (
        <div className="rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-300">Next Milestone</span>
            <span className="text-xs font-semibold text-white">
              {next.days} days
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-1.5">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${next.color} transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{next.name}</span>
            <span className="text-yellow-400 font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3" />
              +{next.xpReward} XP
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(isExpanded ? STREAK_MILESTONES : STREAK_MILESTONES.slice(0, 5)).map((milestone, index) => {
          const achieved = isMilestoneAchieved(milestone.days);
          const locked = currentStreak < milestone.days;

          return (
            <div
              key={milestone.days}
              className={`relative rounded-xl p-3 transition-all duration-300 ${
                achieved
                  ? 'bg-gradient-to-r ' + getTierColor(milestone.tier) + ' bg-opacity-20 border border-white/20'
                  : 'bg-white/5 border border-white/10'
              } ${locked ? 'opacity-50' : 'hover:bg-white/10'}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`text-2xl transition-all ${
                      achieved ? 'animate-bounce-in' : 'grayscale opacity-50'
                    }`}
                  >
                    {milestone.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white">{milestone.name}</h3>
                      {achieved && (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      )}
                      {locked && <Lock className="h-3 w-3 text-gray-500" />}
                    </div>
                    <p className="text-xs text-gray-300">{milestone.description}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          achieved
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-gray-400'
                        }`}
                      >
                        {milestone.days} days
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                          achieved
                            ? 'bg-gradient-to-r ' + getTierColor(milestone.tier) + ' text-white'
                            : 'bg-white/10 text-gray-400'
                        }`}
                      >
                        {milestone.tier}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div
                    className={`flex items-center gap-0.5 font-bold text-sm ${
                      achieved ? 'text-yellow-400' : 'text-gray-500'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    <span>+{milestone.xpReward}</span>
                  </div>
                  <span className="text-xs text-gray-400">XP</span>
                </div>
              </div>

              {achieved && (
                <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {STREAK_MILESTONES.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2 rounded-xl transition-all"
        >
          <span className="text-xs font-medium">
            {isExpanded ? 'Show Less' : `Show ${STREAK_MILESTONES.length - 5} More Milestones`}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      )}

      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Trophy className="h-4 w-4 text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-300 mb-0.5">Milestone Rewards</h4>
            <p className="text-xs text-blue-200">
              Keep your focus streak alive to unlock milestone rewards! Each milestone
              awards bonus XP and helps you level up faster.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
