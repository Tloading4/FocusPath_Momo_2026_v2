import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  increment,
  orderBy,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { XPEventService, detectLevelUp } from '../../services/XPEventService';
import { NotificationService } from '../../services/NotificationDataService';
import {
  Target,
  Calendar,
  Trophy,
  Clock,
  Star,
  Zap,
  CheckCircle,
  RefreshCw,
  Award,
  Brain,
  Sparkles
} from 'lucide-react';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  category: 'sessions' | 'streaks' | 'focus' | 'xp' | 'special';
  requirements: {
    target: number;
    metric:
      | 'sessions'
      | 'perfect_sessions'
      | 'hard_sessions'
      | 'streak_days'
      | 'xp_earned'
      | 'high_focus_sessions';
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

interface UserChallengeProgress {
  questId: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  claimed: boolean;
}

interface QuestSystemProps {
  refreshTrigger?: number;
  onQuestComplete?: () => void;
}

type Challenge = Quest;

// ---------- Time Helpers ----------
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfThisMonday = () => {
  const today = new Date();
  const day = today.getDay(); // 0..6 (Sun..Sat)
  const diffToMon = (day + 6) % 7; // 0 if Mon, 6 if Sun
  const start = startOfDay(today);
  start.setDate(start.getDate() - diffToMon);
  return start;
};

const endOfWeekFromMonday = (start: Date) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(0, 0, 0, 0);
  return end;
};

const chunk = <T,>(arr: T[], n: number) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));

// ---------- Quest Generators ----------
const generateDailyQuests = (): Quest[] => {
  const todayStart = startOfDay();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const idSuffix = ymd(todayStart);

  return [
       {
      id: `daily_distraction_quest_${idSuffix}`,
      title: 'Distraction Master',
      description: 'Complete a session with 0 distractions',
      type: 'daily',
      category: 'focus',
      requirements: { target: 1, metric: 'perfect_sessions', timeframe: 'today' },
      rewards: { xp: 50 },
      icon: '🧘',
      difficulty: 'easy',
      startDate: todayStart,
      endDate: tomorrowStart,
      isActive: true
    },
    {
      id: `daily_focus_quest_${idSuffix}`,
      title: 'Daily Focus Warrior',
      description: 'Complete 3 focus sessions today',
      type: 'daily',
      category: 'sessions',
      requirements: { target: 3, metric: 'sessions', timeframe: 'today' },
      rewards: { xp: 75 },
      icon: '🎯',
      difficulty: 'medium',
      startDate: todayStart,
      endDate: tomorrowStart,
      isActive: true
    },
    {
      id: `daily_endurance_quest_${idSuffix}`,
      title: 'Endurance Test',
      description: 'Complete a Hard or Extreme focus session',
      type: 'daily',
      category: 'sessions',
      requirements: { target: 1, metric: 'hard_sessions', timeframe: 'today' },
      rewards: { xp: 100 },
      icon: '💪',
      difficulty: 'hard',
      startDate: todayStart,
      endDate: tomorrowStart,
      isActive: true
    }
  ];
};

const generateWeeklyQuests = (): Quest[] => {
  const startOfWeek = startOfThisMonday();
  const endOfWeek = endOfWeekFromMonday(startOfWeek);
  const key = startOfWeek.toISOString().split('T')[0];

  return [
      {
      id: `weekly_focus_marathon_${key}`,
      title: 'Focus Marathon',
      description: 'Complete 15 focus sessions this week',
      type: 'weekly',
      category: 'sessions',
      requirements: { target: 15, metric: 'sessions', timeframe: 'this_week' },
      rewards: { xp: 300 },
      icon: '🏃‍♂️',
      difficulty: 'extreme',
      startDate: startOfWeek,
      endDate: endOfWeek,
      isActive: true
    },
    {
      id: `weekly_consistency_${key}`,
      title: 'Consistency Champion',
      description: 'Maintain a 7-day focus streak',
      type: 'weekly',
      category: 'streaks',
      requirements: { target: 7, metric: 'streak_days', timeframe: 'this_week' },
      rewards: { xp: 250 },
      icon: '🔥',
      difficulty: 'hard',
      startDate: startOfWeek,
      endDate: endOfWeek,
      isActive: true
    },
    {
      id: `weekly_xp_collector_${key}`,
      title: 'XP Collector',
      description: 'Earn 100 XP this week',
      type: 'weekly',
      category: 'xp',
      requirements: { target: 100, metric: 'xp_earned', timeframe: 'this_week' },
      rewards: { xp: 100 },
      icon: '💎',
      difficulty: 'medium',
      startDate: startOfWeek,
      endDate: endOfWeek,
      isActive: true
    },
    {
      id: `weekly_focus_master_${key}`,
      title: 'Focus Master',
      description: 'Achieve 90%+ focus score in 5 sessions',
      type: 'weekly',
      category: 'focus',
      requirements: { target: 5, metric: 'high_focus_sessions', timeframe: 'this_week' },
      rewards: { xp: 50 },
      icon: '🧠',
      difficulty: 'easy',
      startDate: startOfWeek,
      endDate: endOfWeek,
      isActive: true
    }
  ];
};

export function ChallengesSystem({ refreshTrigger = 0, onQuestComplete }: QuestSystemProps) {
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<Challenge[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserChallengeProgress>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [claimingReward, setClaimingReward] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) loadChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, refreshTrigger]);

  const loadChallenges = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const daily = generateDailyQuests();
      const weekly = generateWeeklyQuests();
      setDailyChallenges(daily);
      setWeeklyChallenges(weekly);

      const all = [...daily, ...weekly];
      const progressMap = await loadUserProgress(all);
      setUserProgress(progressMap);
      await calculateChallengeProgress(all, progressMap);
    } catch (err) {
      console.error('loadChallenges error', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProgress = async (challenges: Challenge[]) => {
    if (!currentUser) return {};
    try {
      const ids = challenges.map(c => c.id);
      const parts = chunk(ids, 10); // Firestore "in" limit = 10
      const map: Record<string, UserChallengeProgress> = {};
      for (const part of parts) {
        const qRef = query(
          collection(db, 'userProfiles', currentUser.uid, 'challengeProgress'),
          where('questId', 'in', part)
        );
        const snap = await getDocs(qRef);
        snap.forEach(d => {
          const data = d.data() as any;
          const ts = data.completedAt?.toDate?.() ?? data.completedAt;
          map[data.questId] = {
            questId: data.questId,
            progress: data.progress ?? 0,
            completed: !!data.completed,
            completedAt: ts ? new Date(ts) : undefined,
            claimed: !!data.claimed
          };
        });
      }
      return map;
    } catch (err) {
      console.error('loadUserProgress error', err);
      return {};
    }
  };

  // Compute progress with time-bounded reads and batch writes
  const calculateChallengeProgress = async (challenges: Challenge[], progressMap: Record<string, UserChallengeProgress>) => {
    if (!currentUser) return;
    try {
      const todayStart = startOfDay();
      const weekStart = startOfThisMonday();

      // Sessions needed for "today" and "this_week" metrics
      const sessionsQ = query(
        collection(db, 'userProfiles', currentUser.uid, 'sessions'),
        where('startTime', '>=', Timestamp.fromDate(weekStart)),
        orderBy('startTime', 'desc')
      );
      const sessionsSnap = await getDocs(sessionsQ);
      const sessions = sessionsSnap.docs.map(d => {
        const raw = d.data() as any;
        const startTime: Date | undefined = raw.startTime?.toDate ? raw.startTime.toDate() : raw.startTime;
        return { id: d.id, ...raw, startTime };
      });

      // Streak doc (authoritative for Consistency Champion)
      const streakRef = doc(db, 'streaks', currentUser.uid);
      const streakSnap = await getDoc(streakRef);
      const streakFromDoc: number = streakSnap.exists() ? (streakSnap.data() as any).currentStreak || 0 : 0;

      const updated: Record<string, UserChallengeProgress> = { ...progressMap };
      const writes: Promise<any>[] = [];

      for (const ch of challenges) {
        const exist = updated[ch.id];

        // Skip already-claimed docs (rules typically forbid updates)
        if (exist?.claimed) continue;

        let prog = 0;

        switch (ch.requirements.metric) {
          case 'sessions':
            prog = sessions.filter(s => {
              if (!s.startTime || !s.completed) return false;
              return ch.type === 'daily'
                ? s.startTime >= todayStart
                : s.startTime >= startOfThisMonday();
            }).length;
            break;

          case 'perfect_sessions':
            prog = sessions.filter(s => {
              if (!s.startTime || !s.completed) return false;
              const distractions = s.analytics?.distractionCount || 0;
              return s.startTime >= todayStart && distractions === 0;
            }).length;
            break;

          case 'hard_sessions':
            prog = sessions.filter(s => {
              if (!s.startTime || !s.completed) return false;
              const name = (s.sessionTypeName as string | undefined) || '';
              return s.startTime >= todayStart && ['Hard Focus', 'Extreme Focus'].includes(name);
            }).length;
            break;

          case 'streak_days': {
            // Prefer the authoritative StreakTracker doc
            let currentStreak = streakFromDoc;

            // Fallback if no streak doc yet: compute quickly from recent sessions (~45d)
            if (!streakSnap.exists()) {
              const fortyFiveDaysAgo = new Date();
              fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

              const streakSessionsQ = query(
                collection(db, 'userProfiles', currentUser.uid, 'sessions'),
                where('startTime', '>=', Timestamp.fromDate(fortyFiveDaysAgo)),
                orderBy('startTime', 'desc')
              );
              const streakSessionsSnap = await getDocs(streakSessionsQ);

              const uniqueDays = new Set<string>();
              streakSessionsSnap.forEach(docSnap => {
                const dt = docSnap.data().startTime;
                const d = dt?.toDate ? dt.toDate() : dt;
                if (d) {
                  const dayKey = new Date(d);
                  dayKey.setHours(0, 0, 0, 0);
                  uniqueDays.add(dayKey.toDateString());
                }
              });

              const today = startOfDay();
              let c = 0;
              let cursor = new Date(today);
              while (uniqueDays.has(cursor.toDateString())) {
                c++;
                cursor.setDate(cursor.getDate() - 1);
              }
              currentStreak = c;
            }

            // This quest uses absolute streak (>= 7) not week-bounded
            prog = currentStreak;
            break;
          }

          case 'xp_earned':
            prog = sessions
              .filter(s => s.startTime && s.completed && s.startTime >= startOfThisMonday())
              .reduce((sum, s) => sum + (s.xpEarned || 0), 0);
            break;

          case 'high_focus_sessions':
            prog = sessions.filter(s => {
              if (!s.startTime || !s.completed) return false;
              const score = s.analytics?.focusScore || 0;
              return s.startTime >= startOfThisMonday() && score >= 90;
            }).length;
            break;
        }

        const done = prog >= ch.requirements.target;
        const base: UserChallengeProgress = {
          questId: ch.id,
          progress: Math.min(prog, ch.requirements.target),
          completed: done,
          claimed: exist?.claimed || false,
          completedAt: done ? exist?.completedAt || new Date() : exist?.completedAt
        };

        updated[ch.id] = base;

        // Prepare payload for Firestore
        const payload: any = {
          questId: ch.id,
          progress: base.progress,
          completed: base.completed
        };

        // Only set completedAt when transitioning to completed for the first time
        if (done && !exist?.completedAt) payload.completedAt = serverTimestamp();

        // Only include claimed when the doc is new locally; otherwise leave as-is
        if (!exist) payload.claimed = false;

        writes.push(
          setDoc(
            doc(db, 'userProfiles', currentUser.uid, 'challengeProgress', ch.id),
            payload,
            { merge: true }
          )
        );
      }

      await Promise.all(writes);
      setUserProgress(updated);
    } catch (err) {
      console.error('calculateChallengeProgress error', err);
    }
  };

  const claimReward = async (ch: Challenge) => {
    if (!currentUser || claimingReward) return;

    // Prevent claiming expired/inactive quests
    const now = new Date();
    if (!ch.isActive || now >= ch.endDate) {
      alert('This quest has expired.');
      return;
    }

    const uid = currentUser.uid;
    const progressRef = doc(db, 'userProfiles', uid, 'challengeProgress', ch.id);
    const userRef = doc(db, 'userProfiles', uid);

    setClaimingReward(ch.id);
    try {
      await runTransaction(db, async (tx) => {
        const prSnap = await tx.get(progressRef);
        const tsNow = serverTimestamp();

        if (!prSnap.exists()) {
          // Create progress document with claimed: true immediately
          tx.set(
            progressRef,
            {
              questId: ch.id,
              progress: ch.requirements.target,
              completed: true,
              claimed: true,
              completedAt: tsNow,
              claimedAt: tsNow
            },
            { merge: true }
          );
        } else {
          const data = prSnap.data() as any;
          if (data.claimed) throw new Error('already-claimed');
          if (!data.completed) throw new Error('not-completed');

          // Mark existing document as claimed
          tx.set(progressRef, { claimed: true, claimedAt: tsNow }, { merge: true });
        }

        // Award XP (both totalXP and marketplaceXP)
        tx.set(
          userRef,
          {
            totalXP: increment(ch.rewards.xp),
            marketplaceXP: increment(ch.rewards.xp),
            lastUpdated: tsNow
          },
          { merge: true }
        );

        // Items (purchases log)
        if (ch.rewards.items?.length) {
          for (const i of ch.rewards.items) {
            const purchaseRef = doc(collection(db, 'userProfiles', uid, 'purchases'));
            tx.set(purchaseRef, {
              itemId: i,
              itemName: `Challenge Reward: ${i}`,
              category:
                i.startsWith('avatar_') ? 'avatar' :
                i.startsWith('bg_') ? 'background' :
                i.startsWith('theme_') ? 'theme' :
                i.startsWith('sound_') ? 'sound' : 'special',
              xpSpent: 0,
              datePurchased: tsNow,
              source: 'challenge_reward'
            });
          }
        }

        // Power-ups (merge, do not overwrite unrelated)
        if (ch.rewards.powerups?.length) {
          const expiresAt = Timestamp.fromDate(new Date(Date.now() + 86400000)); // +24h
          for (const p of ch.rewards.powerups) {
            tx.set(
              userRef,
              { activePowerUps: { [p]: { activatedAt: tsNow, expiresAt, isActive: true, source: 'challenge_reward' } } },
              { merge: true }
            );
          }
        }
      });

      setUserProgress(prev => ({
        ...prev,
        [ch.id]: {
          ...(prev[ch.id] || { questId: ch.id, progress: ch.requirements.target }),
          claimed: true,
          completed: true
        }
      }));

      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const oldXP = (userData.totalXP || 0) - ch.rewards.xp;
      const newXP = userData.totalXP || 0;

      XPEventService.emitXPGain(
        'Quest Completion',
        ch.rewards.xp,
        { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        {
          questId: ch.id,
          questTitle: ch.title,
          questDifficulty: ch.difficulty
        }
      );

      const levelUpEvent = detectLevelUp(oldXP, newXP);
      if (levelUpEvent) {
        XPEventService.emitLevelUp(
          levelUpEvent.oldLevel,
          levelUpEvent.newLevel,
          levelUpEvent.oldTitle,
          levelUpEvent.newTitle
        );
      }

      await NotificationService.addNotification(
        'quest_complete',
        `Quest Complete: ${ch.title}`,
        `You earned ${ch.rewards.xp} XP!`,
        ch.rewards.xp,
        '🎯',
        { questId: ch.id, questTitle: ch.title }
      );

      onQuestComplete?.();
      alert(`🎉 You earned ${ch.rewards.xp} XP!`);
    } catch (e: any) {
      if (e?.message === 'already-claimed') {
        alert('Already claimed.');
      } else if (e?.message === 'not-completed') {
        alert('Complete the quest first.');
      } else {
        console.error('claimReward error:', e);
        console.error('Quest details:', { questId: ch.id, questTitle: ch.title, userId: uid });
        console.error('Error stack:', e?.stack);
        alert('Claim failed. Please try again or contact support if the issue persists.');
      }
    } finally {
      setClaimingReward(null);
    }
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'from-green-500 to-emerald-600';
      case 'medium': return 'from-yellow-500 to-orange-600';
      case 'hard': return 'from-orange-500 to-red-600';
      case 'extreme': return 'from-red-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getDifficultyBorder = (d: string) => {
    switch (d) {
      case 'easy': return 'border-green-500/50';
      case 'medium': return 'border-yellow-500/50';
      case 'hard': return 'border-orange-500/50';
      case 'extreme': return 'border-red-500/50';
      default: return 'border-gray-500/50';
    }
  };

  const formatTimeRemaining = (end: Date) => {
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hrs >= 24 ? `${Math.floor(hrs / 24)}d ${hrs % 24}h`
         : hrs > 0 ? `${hrs}h ${mins}m`
         : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded" />
          <div className="h-4 bg-white/20 rounded" />
          <div className="h-4 bg-white/20 rounded" />
        </div>
      </div>
    );
  }

  const now = new Date();
  const activeChallenges = activeTab === 'daily' ? dailyChallenges : weeklyChallenges;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 rounded-2xl animate-pulse-glow">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Daily & Weekly Quests</h2>
              <p className="text-gray-300">Complete quests to earn bonus XP and exclusive rewards</p>
            </div>
          </div>
          <button
            onClick={loadChallenges}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
            title="Refresh quests"
          >
            <RefreshCw className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="flex rounded-lg p-1">
          <button
            onClick={() => setActiveTab('daily')}
            className={`${activeTab === 'daily'
              ? 'bg-blue-500/30 text-blue-300'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
              } flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all`}
          >
            <Calendar className="h-5 w-5" />
            Daily
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`${activeTab === 'weekly'
              ? 'bg-purple-500/30 text-purple-300'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
              } flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all`}
          >
            <Trophy className="h-5 w-5" />
            Weekly
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeChallenges.map((ch) => {
          const pr = userProgress[ch.id];
          const pct = pr ? (pr.progress / ch.requirements.target) * 100 : 0;
          const done = !!pr?.completed;
          const claimed = !!pr?.claimed;
          const isExpired = now >= ch.endDate || !ch.isActive;
          const timeLeft = formatTimeRemaining(ch.endDate);

          return (
            <div
              key={ch.id}
              className={`bg-gradient-to-r ${getDifficultyColor(ch.difficulty)} p-6 rounded-2xl border-2 ${getDifficultyBorder(ch.difficulty)} shadow-lg transition-all hover:scale-105 relative overflow-hidden`}
            >
              <div className="absolute top-4 right-4">
                <span className="bg-white/20 text-white px-2 py-1 rounded-full text-xs font-bold uppercase">
                  {ch.difficulty}
                </span>
              </div>

              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{ch.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{ch.title}</h3>
                <p className="text-white/90 text-sm mb-3">{ch.description}</p>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/80 text-sm">Progress</span>
                  <span className="text-white font-semibold text-sm">
                    {pr?.progress || 0}/{ch.requirements.target}
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{timeLeft} left</span>
                </div>
                <div className="text-white/80 text-sm capitalize">{ch.type}</div>
              </div>

              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <h4 className="text-white font-semibold mb-2 text-sm">Rewards:</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <span className="text-white text-sm">{ch.rewards.xp} XP</span>
                  </div>
                  {ch.rewards.items && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      <span className="text-white text-sm">{ch.rewards.items.length} item(s)</span>
                    </div>
                  )}
                  {ch.rewards.powerups && (
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span className="text-white text-sm">{ch.rewards.powerups.length} power-up(s)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                {claimed ? (
                  <button
                    disabled
                    className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Claimed
                  </button>
                ) : done && !isExpired ? (
                  <button
                    onClick={() => claimReward(ch)}
                    disabled={claimingReward === ch.id}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    {claimingReward === ch.id ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Trophy className="h-5 w-5" />
                        Claim Reward
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className={`w-full ${isExpired ? 'bg-red-500/40 text-white/80' : 'bg-white/20 text-white/60'} py-3 rounded-lg font-semibold cursor-not-allowed`}
                  >
                    {isExpired ? 'Expired' : `${Math.round(pct)}% Complete`}
                  </button>
                )}
              </div>

              {done && !claimed && !isExpired && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse" />
                  <div className="absolute top-2 left-2 text-yellow-400 animate-bounce">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="absolute bottom-2 right-2 text-yellow-400 animate-bounce" style={{ animationDelay: '0.5s' }}>
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Quest Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-300">Daily Quests</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Reset every day at midnight</li>
              <li>• Focus on building consistent habits</li>
              <li>• Perfect for quick XP boosts</li>
              <li>• Stack with weekly quests</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-300">Weekly Quests</h4>
            <ul className="text-purple-200 text-sm space-y-1">
              <li>• Reset every Monday</li>
              <li>• Bigger rewards for longer commitment</li>
              <li>• Unlock exclusive items and power-ups</li>
              <li>• Perfect for building long-term habits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
