import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Flame,
  AlertCircle,
  Settings,
  RefreshCw
} from 'lucide-react';
import { getStreakMilestone } from '../../services/StreakMilestoneDefinitions';
import { StreakCalendarModal } from './StreakCalendarModal';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: Date | null;
  streakDates: string[];
}

interface StreakTrackerProps {
  refreshTrigger?: number;
}

export function StreakTracker({ refreshTrigger = 0 }: StreakTrackerProps) {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: null,
    streakDates: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [animatedStreak, setAnimatedStreak] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const { currentUser } = useAuth();

  const checkAndAwardMilestone = async (streakDays: number) => {
    if (!currentUser) return;

    try {
      const milestone = getStreakMilestone(streakDays);
      if (!milestone) return;

      const milestonesQuery = query(
        collection(db, 'userProfiles', currentUser.uid, 'streakMilestones'),
        where('userId', '==', currentUser.uid),
        where('milestoneDays', '==', streakDays)
      );

      const existingMilestones = await getDocs(milestonesQuery);

      if (existingMilestones.empty) {
        await addDoc(
          collection(db, 'userProfiles', currentUser.uid, 'streakMilestones'),
          {
            userId: currentUser.uid,
            milestoneDays: streakDays,
            xpAwarded: milestone.xpReward,
            achievedAt: new Date(),
            currentStreakAtTime: streakDays,
          }
        );

        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const currentXP = profileSnap.data().totalXP || 0;
          await setDoc(
            profileRef,
            {
              totalXP: currentXP + milestone.xpReward,
              lastUpdated: new Date(),
            },
            { merge: true }
          );
          console.log(
            `🏆 Milestone reached! ${milestone.name} - Awarded ${milestone.xpReward} XP`
          );
        }
      }
    } catch (error) {
      console.error('Error checking/awarding milestone:', error);
    }
  };

  const fetchStreakData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setPermissionError(false);

      // 1) Load streak doc
      const streakRef = doc(db, 'streaks', currentUser.uid);
      const streakDoc = await getDoc(streakRef);

      // 2) Load completed sessions
      // Load from user's sessions subcollection
      const sessionsQuery = query(
        collection(db, 'userProfiles', currentUser.uid, 'sessions'),
        orderBy('startTime', 'desc')
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      // 3) Build unique date set - only count completed sessions
      const sessionDates = new Set<string>();
      sessionsSnapshot.forEach(snap => {
        const data = snap.data();
        // Only count completed sessions for streaks
        if (data.completed === true) {
          const rawDate = data.startTime || data.date;
          const d = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
          sessionDates.add(d.toDateString());
        }
      });
      const sortedDates = Array.from(sessionDates).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );

      // 4) Compute current streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let currentStreak = 0;
      let checkDate = new Date(today);
      while (sessionDates.has(checkDate.toDateString())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // 5) Compute longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;
      for (const ds of [...sortedDates].reverse()) {
        const d = new Date(ds);
        if (!lastDate || d.getTime() - lastDate.getTime() === 24 * 60 * 60 * 1000) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
        lastDate = d;
      }

      // 6) Determine previous streak values
      const prevStreak = streakDoc.exists() ? (streakDoc.data().currentStreak as number) : 0;
      const storedLongest = streakDoc.exists() ? (streakDoc.data().longestStreak as number) : 0;

      // 7) Check and award milestone on streak progress
      if (currentStreak > prevStreak && currentStreak > 0) {
        await checkAndAwardMilestone(currentStreak);
      }

      // 8) Update local state
      const newStreakData = {
        currentStreak,
        longestStreak: Math.max(longestStreak, storedLongest),
        lastSessionDate: sortedDates.length > 0 ? new Date(sortedDates[0]) : null,
        streakDates: sortedDates
      };
      setStreakData(newStreakData);

      // 9) Persist streak doc
      await setDoc(
        streakRef,
        {
          currentStreak: newStreakData.currentStreak,
          longestStreak: newStreakData.longestStreak,
          lastUpdated: new Date(),
          userId: currentUser.uid
        },
        { merge: true }
      );
    } catch (err: any) {
      console.error('Error fetching streak data:', err);
      if (
        err.code === 'permission-denied' ||
        err.message?.includes('insufficient permissions')
      ) {
        setPermissionError(true);
        setError('Streak tracking requires updated Firebase rules.');
      } else {
        setError('Failed to load streak data. Please try again later.');
      }
    } finally {
      setLoading(false);
      setTimeout(() => setIsVisible(true), 100);
    }
  };

  useEffect(() => {
    // Add small delay when refreshing to ensure Firebase data is fresh
    const timer = setTimeout(() => {
      fetchStreakData();
    }, 100);

    return () => clearTimeout(timer);
  }, [currentUser, refreshTrigger]);

  // Animate streak counter
  useEffect(() => {
    if (streakData.currentStreak !== animatedStreak) {
      const duration = 1000;
      const steps = 30;
      const stepValue = (streakData.currentStreak - animatedStreak) / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        setAnimatedStreak(prev => {
          const next = prev + stepValue;
          if (currentStep >= steps) {
            clearInterval(timer);
            return streakData.currentStreak;
          }
          return next;
        });
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [streakData.currentStreak]);

  // Render helpers
  const getStreakColor = (s: number) => {
    if (s >= 30) return 'from-red-500 to-pink-600';
    if (s >= 14) return 'from-orange-500 to-red-600';
    if (s >= 7) return 'from-yellow-500 to-orange-600';
    if (s >= 3) return 'from-green-500 to-yellow-600';
    return 'from-blue-500 to-green-600';
  };
  const getStreakIcon = (s: number) =>
    s >= 30 ? '🔥' : s >= 14 ? '⚡' : s >= 7 ? '🌟' : s >= 3 ? '✨' : '💫';
  const getStreakTitle = (s: number) =>
    s >= 30
      ? 'Legendary Streak!'
      : s >= 14
      ? 'Epic Streak!'
      : s >= 7
      ? 'Great Streak!'
      : s >= 3
      ? 'Good Streak!'
      : 'Building Momentum';

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded animate-shimmer" />
          <div className="h-4 bg-white/20 rounded animate-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div
      onClick={() => setShowCalendar(true)}
      className={`glass-card rounded-2xl p-4 shadow-2xl hover-lift transition-all duration-500 w-full h-full flex flex-col cursor-pointer ${
        isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'
      }`}
      title="Click to view full calendar"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`bg-gradient-to-r ${getStreakColor(
              streakData.currentStreak
            )} p-2 rounded-xl animate-pulse-glow`}
          >
            <Flame
              className={`h-5 w-5 text-white ${
                streakData.currentStreak > 0 ? 'animate-streak-fire' : ''
              }`}
            />
          </div>
          <div className="animate-slide-right">
            <h2 className="text-xl font-bold text-white">Focus Streak</h2>
            <p className="text-sm text-gray-300">
              {getStreakTitle(streakData.currentStreak)}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchStreakData();
          }}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1.5 rounded-lg transition-all hover-bounce btn-press"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {permissionError && (
        <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-6 mb-6 animate-bounce-in">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="h-6 w-6 text-orange-400" />
            <h3 className="text-lg font-semibold text-orange-300">
              Configuration Required
            </h3>
          </div>
          <p className="text-orange-200 mb-4">
            Streak tracking requires updated Firebase permissions.
          </p>
          <div className="bg-orange-500/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-200 mb-2">
              <strong>Dev:</strong> Update your Firestore rules to allow reads
              on /sessions and /streaks.
            </p>
          </div>
          <button
            onClick={fetchStreakData}
            className="flex items-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-4 py-2 rounded-lg transition-all btn-press"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )}

      {error && !permissionError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center mb-6 animate-bounce-in">
          <div className="text-red-400 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto animate-bounce" />
          </div>
          <h3 className="text-xl font-semibold text-red-300 mb-2">
            Error Loading Streak Data
          </h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchStreakData}
            className="flex items-center gap-2 mx-auto bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-all btn-press"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )}

      {!permissionError && (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3 text-center hover-glow transition-all animate-scale-in card-stagger-1">
              <div className="text-2xl mb-1 animate-bounce-in">
                {getStreakIcon(streakData.currentStreak)}
              </div>
              <div className="text-xl font-bold text-white animate-number-count">
                {Math.floor(animatedStreak)}
              </div>
              <div className="text-xs text-gray-300">Current Streak</div>
            </div>
            <div className="rounded-xl p-3 text-center hover-glow transition-all animate-scale-in card-stagger-2">
              <div className="text-2xl mb-1 animate-bounce-in">🏆</div>
              <div className="text-xl font-bold text-white animate-number-count">
                {streakData.longestStreak}
              </div>
              <div className="text-xs text-gray-300">Best Streak</div>
            </div>
          </div>

          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Progress</span>
              <span className="text-sm text-gray-400">
                {streakData.currentStreak}{' '}
                {streakData.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${getStreakColor(
                  streakData.currentStreak
                )} progress-animated transition-all duration-1000`}
                style={{
                  width: `${Math.min(
                    (streakData.currentStreak / 30) * 100,
                    100
                  )}%`
                }}
              ></div>
            </div>
            {streakData.lastSessionDate && (
              <p className="text-xs text-gray-400 text-center animate-fade-in">
                Last session:{' '}
                {streakData.lastSessionDate.toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="grid grid-cols-7 gap-1 animate-slide-up">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const ds = date.toDateString();
                const has = streakData.streakDates.includes(ds);
                return (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all duration-300 hover:scale-110 card-stagger-${
                      i + 1
                    } animate-scale-in ${
                      has
                        ? 'bg-green-500/30 text-green-300 border border-green-500/50 animate-glow-pulse'
                        : 'bg-white/5 text-gray-500 hover:bg-white/10'
                    }`}
                    title={date.toLocaleDateString()}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 text-center mt-2 animate-fade-in">
              Last 7 days
            </p>
          </div>

          {streakData.currentStreak > 0 && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex justify-center gap-2 animate-slide-up">
                {[3, 7, 14, 30].map((m, idx) => (
                  <div
                    key={m}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all card-stagger-${
                      idx + 1
                    } animate-scale-in ${
                      streakData.currentStreak >= m
                        ? 'bg-green-500/20 text-green-300 animate-glow-pulse'
                        : 'bg-white/5 text-gray-500'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {m}d
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                Streak milestones
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/20 text-center">
            <p className="text-xs text-blue-300 animate-pulse">
              💡 Click to view focus calendar
            </p>
          </div>
        </div>
      )}

      {!permissionError &&
        !error &&
        streakData.currentStreak === 0 &&
        streakData.longestStreak === 0 && (
          <div className="text-center py-8 animate-fade-in">
            <Flame className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-float" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2 animate-slide-down">
              Start Your Streak!
            </h3>
            <p className="text-gray-400 animate-slide-up mb-4">
              Complete your first focus session to begin tracking your streak.
            </p>
            <p className="text-xs text-blue-300 animate-pulse">
              💡 Click to view focus calendar
            </p>
          </div>
        )}

      {streakData.currentStreak > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(Math.min(streakData.currentStreak, 5))].map((_, i) => (
            <div
              key={i}
              className="absolute text-orange-400/30 animate-float"
              style={{
                left: `${15 + i * 20}%`,
                top: `${10 + i * 15}%`,
                animationDelay: `${i * 0.6}s`,
                animationDuration: `${2 + i * 0.3}s`
              }}
            >
              🔥
            </div>
          ))}
        </div>
      )}
    </div>

    <StreakCalendarModal
      isOpen={showCalendar}
      onClose={() => setShowCalendar(false)}
      streakDates={streakData.streakDates}
      currentStreak={streakData.currentStreak}
      longestStreak={streakData.longestStreak}
    />
    </>
  );
}
