import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  orderBy,
  limit,
  doc,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Eye, EyeOff } from 'lucide-react';
import { LevelingService } from '../../services/LevelingService';

interface LeaderboardUser {
  id: string;
  displayName: string;
  totalXP: number;
  longestStreak: number;
  isAnonymous: boolean;
  showInLeaderboard: boolean;
  level: number;
  levelTitle: string;
}

interface ProfileDoc {
  displayName?: string;
  isAnonymous?: boolean;
  totalXP?: number;
  currentStreak?: number;
  longestStreak?: number;
  settings?: {
    privacy?: {
      showInLeaderboard?: boolean;
    };
  };
}

export function Leaderboard() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [tab, setTab] = useState<'xp' | 'streak'>('xp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permErr, setPermErr] = useState(false);

  const getLevelTitle = (level: number): string => {
    if (level >= 20) return 'Focus Master';
    if (level >= 10) return 'Focus Expert';
    if (level >= 5) return 'Focus Practitioner';
    return 'Focus Novice';
  };

  // Listen to my profile updates
  useEffect(() => {
    if (!currentUser) return;
    const profRef = doc(db, 'userProfiles', currentUser.uid);
    const unsubProf = onSnapshot(
      profRef,
      snap => {
        if (snap.exists()) setProfile(snap.data() as ProfileDoc);
      },
      e => console.error('profile listener error', e)
    );
    return unsubProf;
  }, [currentUser]);

  // Keep "You" row XP in sync and maintain sort for active tab
  useEffect(() => {
    if (!profile || !currentUser) return;
    setData(prev => {
      const updated = prev.map(u =>
        u.id === currentUser.uid ? { ...u, totalXP: profile.totalXP || 0 } : u
      );
      return [...updated].sort((a, b) => {
        if (tab === 'streak') return b.longestStreak - a.longestStreak;
        return b.totalXP - a.totalXP;
      });
    });
  }, [profile?.totalXP, tab, currentUser]);

  // Main leaderboard query
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setPermErr(false);

    const profRef = doc(db, 'userProfiles', currentUser.uid);

    // Get a bit more than we need (filtering/permissions may drop some)
    const xpQuery = query(
      collection(db, 'userProfiles'),
      orderBy('totalXP', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(
      xpQuery,
      async snap => {
        try {
          // Base user rows from profiles
          const base = snap.docs
            .map(ds => {
              const d = ds.data() as ProfileDoc;
              const totalXP = d.totalXP || 0;
              const level = LevelingService.getLevelFromXP(totalXP);
              const levelTitle = getLevelTitle(level);
              const showInLeaderboard =
                d.settings?.privacy?.showInLeaderboard !== false; // default true
              return {
                id: ds.id,
                displayName: d.isAnonymous ? 'Anonymous User' : d.displayName || 'Unknown',
                totalXP,
                level,
                levelTitle,
                isAnonymous: d.isAnonymous || false,
                showInLeaderboard
              } as Omit<LeaderboardUser, 'longestStreak'>;
            })
            .filter(u => u.showInLeaderboard);

          const ids = base.map(u => u.id);

          // Get longest streaks from streaks collection
          let streakMap: Record<string, number> = {};
          if (ids.length) {
            // Firestore 'in' constraint: max 10 per query — batch if necessary
            const chunk = <T,>(arr: T[], size: number): T[][] =>
              Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
                arr.slice(i * size, i * size + size)
              );

            const idChunks = chunk(ids, 10);
            const results = await Promise.all(
              idChunks.map(async ch => {
                const sSnap = await getDocs(
                  query(collection(db, 'streaks'), where('userId', 'in', ch))
                );
                const local: Record<string, number> = {};
                sSnap.forEach(s => {
                  const st = s.data() as any;
                  local[st.userId] = st.longestStreak || 0;
                });
                return local;
              })
            );
            streakMap = Object.assign({}, ...results);
          }

          // Merge with streak data
          let merged: LeaderboardUser[] = base.map(u => ({
            ...u,
            longestStreak: streakMap[u.id] || 0
          }));

          // Ensure current user appears even if not in top list
          if (!merged.some(u => u.id === currentUser.uid)) {
            const meSnap = await getDoc(profRef);
            if (meSnap.exists()) {
              const d = meSnap.data() as ProfileDoc;
              const myTotalXP = d.totalXP || 0;
              const myLevel = LevelingService.getLevelFromXP(myTotalXP);
              const myLevelTitle = getLevelTitle(myLevel);

              // Get my longest streak from streaks collection
              let myLongestStreak = 0;
              try {
                const myStreakDoc = await getDoc(doc(db, 'streaks', currentUser.uid));
                if (myStreakDoc.exists()) {
                  myLongestStreak = myStreakDoc.data().longestStreak || 0;
                }
              } catch {
                myLongestStreak = 0;
              }

              merged.push({
                id: currentUser.uid,
                displayName: d.isAnonymous ? 'Anonymous User' : d.displayName || 'You',
                totalXP: myTotalXP,
                level: myLevel,
                levelTitle: myLevelTitle,
                longestStreak: myLongestStreak,
                isAnonymous: d.isAnonymous || false,
                showInLeaderboard:
                  d.settings?.privacy?.showInLeaderboard !== false
              });
            }
          }

          // Top 10 after privacy filter
          merged = merged.filter(u => u.showInLeaderboard).slice(0, 10);

          // Sort by active tab
          merged.sort((a, b) => {
            if (tab === 'streak') return b.longestStreak - a.longestStreak;
            return b.totalXP - a.totalXP;
          });

          setData(merged);
          setLoading(false);
        } catch (e) {
          console.error('leaderboard data error', e);
          setError('Failed to load leaderboard data.');
          setLoading(false);
        }
      },
      e => {
        console.error('leaderboard listener error', e);
        if ((e as any).code === 'permission-denied') {
          setPermErr(true);
          setError("You don't have permission to view the leaderboard.");
        } else if ((e as any).code === 'failed-precondition') {
          // Likely missing composite index for orderBy('totalXP') etc.
          setError('The leaderboard requires a Firestore index. Open the console link from the error and create it.');
        } else {
          setError('Failed to load leaderboard. Please try again later.');
        }
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, tab]);

  const toggleLeaderboardVisibility = async () => {
    if (!currentUser || !profile) return;
    const currentShowInLeaderboard =
      profile.settings?.privacy?.showInLeaderboard !== false; // default true
    await setDoc(
      doc(db, 'userProfiles', currentUser.uid),
      {
        settings: {
          ...profile.settings,
          privacy: {
            ...profile.settings?.privacy,
            showInLeaderboard: !currentShowInLeaderboard
          }
        },
        lastUpdated: new Date()
      },
      { merge: true }
    );
  };

  if (loading) {
    return <div className="animate-pulse p-8 bg-white/10 rounded-2xl" />;
  }

  return (
    <div className="p-8 bg-white/10 rounded-2xl border border-white/20 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
        <button
          onClick={toggleLeaderboardVisibility}
          className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors"
        >
          {profile?.settings?.privacy?.showInLeaderboard !== false ? (
            <>
              <Eye className="h-4 w-4" />
              <span>Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Hidden</span>
            </>
          )}
        </button>
      </div>

      <div className="flex rounded-lg p-1 mb-6">
        {[
          { key: 'xp', label: 'Total XP' },
          { key: 'streak', label: 'Top Streak' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              tab === t.key
                ? 'bg-blue-500/30 text-blue-300'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {permErr && <div className="text-orange-200 mb-4">{error}</div>}
      {error && !permErr && <div className="text-red-300 mb-4">{error}</div>}

      {data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No users are currently visible on the leaderboard.</p>
          {profile?.settings?.privacy?.showInLeaderboard === false && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-blue-200 text-sm">
                You're currently hidden from the leaderboard. Click "Hidden" above to make yourself visible and see other users.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((u, i) => {
            const isMe = u.id === currentUser?.uid;
            return (
              <div
                key={u.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  isMe ? 'ring-2 ring-blue-500/50' : 'border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {u.displayName}{isMe && ' (You)'}
                    </span>
                    {u.isAnonymous && (
                      <span className="text-xs text-gray-300 px-2 py-0.5 rounded-full bg-gray-500/30">
                        Anonymous
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-300 text-sm">
                      Level {u.level} • {u.levelTitle}
                    </p>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {tab === 'xp'
                      ? `${u.totalXP} XP`
                      : `${u.longestStreak}d top streak`}
                  </p>
                </div>
                <span className="text-white font-bold">#{i + 1}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="mt-6 pt-4 border-t border-white/20">
        <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-gray-300 mb-2">Privacy Control</h4>
          <p className="text-gray-400 text-sm">
            You can control your leaderboard visibility in Settings → Privacy → "Show in Leaderboard" or use the toggle button above.
            Only users who have opted in to leaderboard visibility will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
