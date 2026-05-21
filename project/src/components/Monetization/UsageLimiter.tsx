import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { PaywallModal } from './PaywallModal';
import { AlertTriangle, Crown } from 'lucide-react';

interface UsageLimiterProps {
  feature: 'sessions' | 'ai_queries' | 'exports' | 'backgrounds';
  onUpgrade: () => void;
  children: React.ReactNode;
}

interface UsageData {
  sessionsToday: number;
  aiQueriesThisMonth: number;
  exportsThisMonth: number;
  lastResetDate: string;
  lastMonthlyReset: string;
}

export function UsageLimiter({ feature, onUpgrade, children }: UsageLimiterProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { limits, hasFeature } = useSubscription();

  useEffect(() => {
    if (currentUser) {
      fetchUsageData();
    }
  }, [currentUser]);

  const fetchUsageData = async () => {
    if (!currentUser) return;

    try {
      // For Firebase, we'll use localStorage to track usage
      // In production, this should be stored in Firestore
      const today = new Date().toDateString();
      const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const storedUsage = localStorage.getItem(`usage_${currentUser.uid}`);
      let usageData: UsageData;

      if (storedUsage) {
        usageData = JSON.parse(storedUsage);
        
        // Reset daily counters if it's a new day
        if (usageData.lastResetDate !== today) {
          usageData.sessionsToday = 0;
          usageData.lastResetDate = today;
        }

        // Reset monthly counters if it's a new month
        if (usageData.lastMonthlyReset !== thisMonth) {
          usageData.aiQueriesThisMonth = 0;
          usageData.exportsThisMonth = 0;
          usageData.lastMonthlyReset = thisMonth;
        }
      } else {
        // Create initial usage data
        usageData = {
          sessionsToday: 0,
          aiQueriesThisMonth: 0,
          exportsThisMonth: 0,
          lastResetDate: today,
          lastMonthlyReset: thisMonth
        };
      }

      setUsage(usageData);
      localStorage.setItem(`usage_${currentUser.uid}`, JSON.stringify(usageData));
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async (featureType: string) => {
    if (!currentUser || !usage) return;

    const updatedUsage = { ...usage };
    
    switch (featureType) {
      case 'sessions':
        updatedUsage.sessionsToday = usage.sessionsToday + 1;
        break;
      case 'ai_queries':
        updatedUsage.aiQueriesThisMonth = usage.aiQueriesThisMonth + 1;
        break;
      case 'exports':
        updatedUsage.exportsThisMonth = usage.exportsThisMonth + 1;
        break;
    }

    setUsage(updatedUsage);
    localStorage.setItem(`usage_${currentUser.uid}`, JSON.stringify(updatedUsage));
  };

  const checkLimit = (): { allowed: boolean; reason?: string; current?: number; limit?: number } => {
    // ALL FEATURES ARE FREE - BETA ACCESS
    // No limits enforced during beta period
    return { allowed: true };
  };

  const getFeatureInfo = () => {
    const featureMap = {
      sessions: {
        name: 'Focus Sessions',
        description: 'Start unlimited focus sessions without daily restrictions. Track your progress and build consistency with no limits.',
        requiredTier: 'premium' as const
      },
      ai_queries: {
        name: 'AI Coach Queries',
        description: 'Get unlimited access to your personal AI coach for insights, recommendations, and personalized guidance.',
        requiredTier: 'premium' as const
      },
      exports: {
        name: 'Data Export',
        description: 'Export your focus data, analytics, and progress reports in multiple formats (CSV, PDF, JSON).',
        requiredTier: 'premium' as const
      },
      backgrounds: {
        name: 'Premium Backgrounds',
        description: 'Access our collection of 50+ premium background themes to personalize your focus environment.',
        requiredTier: 'premium' as const
      }
    };

    return featureMap[feature];
  };

  const handleFeatureUse = () => {
    const limitCheck = checkLimit();
    
    if (!limitCheck.allowed) {
      setShowPaywall(true);
      return false;
    }

    // Increment usage counter
    incrementUsage(feature);
    return true;
  };

  // Provide the check function to children
  const childrenWithProps = React.cloneElement(children as React.ReactElement, {
    onFeatureUse: handleFeatureUse,
    canUseFeature: checkLimit().allowed,
    usageInfo: usage ? {
      current: feature === 'sessions' ? usage.sessionsToday : 
               feature === 'ai_queries' ? usage.aiQueriesThisMonth :
               feature === 'exports' ? usage.exportsThisMonth : 0,
      limit: feature === 'sessions' ? limits?.sessionsPerDay :
             feature === 'ai_queries' ? limits?.aiQueriesPerMonth :
             feature === 'exports' ? limits?.exportsPerMonth : 0
    } : null
  });

  if (loading) {
    return <div className="animate-pulse bg-white/10 rounded-lg h-20"></div>;
  }

  const featureInfo = getFeatureInfo();
  const limitCheck = checkLimit();

  return (
    <>
      {childrenWithProps}
      
      {/* Usage Warning */}
      {!limitCheck.allowed && limitCheck.current !== undefined && limitCheck.limit !== undefined && (
        <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <div>
              <h4 className="font-semibold text-orange-300">Limit Reached</h4>
              <p className="text-orange-200 text-sm">
                You've used {limitCheck.current} of {limitCheck.limit} {featureInfo.name.toLowerCase()} this {feature === 'sessions' ? 'day' : 'month'}.
              </p>
            </div>
            <button
              onClick={() => setShowPaywall(true)}
              className="ml-auto bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <Crown className="h-4 w-4" />
              Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          onUpgrade();
        }}
        feature={featureInfo.name}
        description={featureInfo.description}
        requiredTier={featureInfo.requiredTier}
      />
    </>
  );
}