import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { SubscriptionStatus } from './SubscriptionStatus';

interface SubscriptionManagerProps {
  onUpgrade: () => void;
}

interface UsageData {
  sessionsThisMonth: number;
  sessionsLimit: number;
  aiQueriesThisMonth: number;
  aiQueriesLimit: number;
  exportsThisMonth: number;
  exportsLimit: number;
}

export function SubscriptionManager({ onUpgrade }: SubscriptionManagerProps) {
  const { currentUser } = useAuth();
  const { limits, loading } = useSubscription();

  const [usage, setUsage] = useState<UsageData>({
    sessionsThisMonth: 0,
    sessionsLimit: 5,
    aiQueriesThisMonth: 0,
    aiQueriesLimit: 10,
    exportsThisMonth: 0,
    exportsLimit: 0
  });

  useEffect(() => {
    if (currentUser && limits) {
      const storedUsage = localStorage.getItem(`usage_${currentUser.uid}`);
      if (storedUsage) {
        const usageData = JSON.parse(storedUsage);
        setUsage({
          sessionsThisMonth: usageData.sessionsToday || 0,
          sessionsLimit: limits.sessionsPerDay || 5,
          aiQueriesThisMonth: usageData.aiQueriesThisMonth || 0,
          aiQueriesLimit: limits.aiQueriesPerMonth || 10,
          exportsThisMonth: usageData.exportsThisMonth || 0,
          exportsLimit: limits.exportsPerMonth || 0
        });
      }
    }
  }, [currentUser, limits]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded"></div>
          <div className="h-4 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SubscriptionStatus onUpgrade={onUpgrade} />
    </div>
  );
}
