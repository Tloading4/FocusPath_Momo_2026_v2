import { useState, useEffect } from 'react';
import { Clock, Zap, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface SessionCounterProps {
  onUpgrade?: () => void;
  refreshTrigger?: number;
}

export function SessionCounter({ onUpgrade, refreshTrigger }: SessionCounterProps) {
  const { currentUser } = useAuth();
  const { limits, loading } = useSubscription();
  const [sessionsToday, setSessionsToday] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadTodaysSessions();
    }
  }, [currentUser, refreshTrigger]);

  const loadTodaysSessions = async () => {
    if (!currentUser) return;

    try {
      setLoadingSessions(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sessionsRef = collection(db, 'userProfiles', currentUser.uid, 'sessions');
      const q = query(
        sessionsRef,
        where('date', '>=', Timestamp.fromDate(today)),
        where('completed', '==', true)
      );

      const querySnapshot = await getDocs(q);
      setSessionsToday(querySnapshot.size);
    } catch (error) {
      console.error('Error loading today\'s sessions:', error);
      setSessionsToday(0);
    } finally {
      setLoadingSessions(false);
    }
  };

  if (loading || loadingSessions) {
    return (
      <div className="bg-white/10 rounded-lg px-3 py-2 animate-pulse">
        <div className="h-4 w-24 bg-white/20 rounded"></div>
      </div>
    );
  }

  const isUnlimited = limits?.sessionsPerDay === 0;
  const sessionsLimit = limits?.sessionsPerDay || 3;
  const isNearLimit = !isUnlimited && sessionsToday >= sessionsLimit - 1;
  const isAtLimit = !isUnlimited && sessionsToday >= sessionsLimit;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
        isAtLimit
          ? 'bg-red-500/20 border border-red-500/50'
          : isNearLimit
          ? 'bg-orange-500/20 border border-orange-500/50'
          : 'bg-white/10 border border-white/20'
      }`}
    >
      <Clock className={`h-4 w-4 ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-orange-400' : 'text-blue-400'}`} />

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isAtLimit ? 'text-red-300' : isNearLimit ? 'text-orange-300' : 'text-white'}`}>
            {isUnlimited ? (
              <>
                <span className="text-purple-400">{sessionsToday}</span> sessions today
              </>
            ) : (
              <>
                <span className={isAtLimit ? 'text-red-300' : 'text-white'}>{sessionsToday}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-gray-300">{sessionsLimit}</span>
              </>
            )}
          </span>
          {isUnlimited && (
            <Zap className="h-3 w-3 text-purple-400" />
          )}
        </div>
        {!isUnlimited && isAtLimit && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 mt-1"
          >
            <Crown className="h-3 w-3" />
            <span>Upgrade for unlimited</span>
          </button>
        )}
      </div>
    </div>
  );
}
