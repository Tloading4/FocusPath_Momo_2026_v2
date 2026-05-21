import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getActiveSubscription, subscribeToSubscriptionChanges } from '../services/firebaseSubscriptionService';

interface Subscription {
  tier: 'standard' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  features: string[];
  endDate?: Date;
  autoRenew: boolean;
}

interface SubscriptionLimits {
  sessionsPerDay: number;
  aiQueriesPerMonth: number;
  exportsPerMonth: number;
  backgroundsAvailable: number;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  dashboardCustomization: boolean;
  miniGames: boolean;
  customAvatars: boolean;
  powerUps: boolean;
  fullHistory: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setSubscription({
        tier: 'standard',
        status: 'active',
        features: ['3 sessions per day', 'Basic AI insights', 'Standard backgrounds'],
        autoRenew: false
      });
      setLimits(getDefaultLimits());
      setLoading(false);
      return;
    }

    fetchSubscription();

    const unsubscribe = subscribeToSubscriptionChanges(
      currentUser.uid,
      (firebaseSubscription) => {
        if (firebaseSubscription) {
          const sub: Subscription = {
            tier: firebaseSubscription.tier as 'standard' | 'premium',
            status: firebaseSubscription.status as 'active' | 'cancelled' | 'expired' | 'trial',
            features: getTierFeatures(firebaseSubscription.tier),
            endDate: firebaseSubscription.current_period_end,
            autoRenew: !firebaseSubscription.cancel_at_period_end,
          };
          setSubscription(sub);
          setLimits(getDefaultLimits());
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const fetchSubscription = async () => {
    if (!currentUser) return;

    try {
      const firebaseSubscription = await getActiveSubscription(currentUser.uid);

      if (firebaseSubscription && (firebaseSubscription.status === 'active' || firebaseSubscription.status === 'trialing')) {
        const sub: Subscription = {
          tier: firebaseSubscription.tier as 'standard' | 'premium',
          status: firebaseSubscription.status as 'active' | 'cancelled' | 'expired' | 'trial',
          features: getTierFeatures(firebaseSubscription.tier),
          endDate: firebaseSubscription.current_period_end,
          autoRenew: !firebaseSubscription.cancel_at_period_end,
        };
        setSubscription(sub);
        setLimits(getDefaultLimits(firebaseSubscription.tier));
      } else {
        const userDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));

        if (!userDoc.exists()) {
          await setDoc(doc(db, 'userProfiles', currentUser.uid), {
            totalXP: 0,
            displayName: currentUser.email?.split('@')[0] || 'User',
            createdAt: new Date(),
            lastUpdated: new Date()
          }, { merge: true });
        }

        setSubscription({
          tier: 'standard',
          status: 'active',
          features: ['3 sessions per day', 'Basic AI insights', 'Standard backgrounds'],
          autoRenew: false
        });
        setLimits(getDefaultLimits());
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription({
        tier: 'standard',
        status: 'active',
        features: ['3 sessions per day', 'Basic AI insights', 'Standard backgrounds'],
        autoRenew: false
      });
      setLimits(getDefaultLimits());
    } finally {
      setLoading(false);
    }
  };

  const getTierFeatures = (tier: string): string[] => {
    switch (tier) {
      case 'premium':
      case 'enhanced': // Legacy support
        return [
          'Unlimited focus sessions',
          'Unlimited AI queries & coaching',
          'All mini-games unlocked',
          'Custom dashboard widgets',
          'Premium backgrounds & themes',
          'Advanced analytics & reports',
          'Unlimited data exports',
          'Priority support',
          'Custom photo avatars',
          'All power-ups unlocked',
          'Full session history'
        ];
      default: // standard
        return [
          '3 sessions per day',
          'Basic AI insights (10/month)',
          'Standard backgrounds (5)',
          'Basic progress tracking',
          'Last 7 days history'
        ];
    }
  };

  const getDefaultLimits = (tier?: string): SubscriptionLimits => {
    // ALL USERS GET PREMIUM FEATURES - BETA ACCESS
    // Premium tier features are now available to everyone
    return {
      sessionsPerDay: 0, // Unlimited
      aiQueriesPerMonth: 0, // Unlimited
      exportsPerMonth: 0, // Unlimited
      backgroundsAvailable: 50,
      advancedAnalytics: true,
      prioritySupport: true,
      dashboardCustomization: true,
      miniGames: true,
      customAvatars: true,
      powerUps: true,
      fullHistory: true
    };
  };

  const hasFeature = (feature: string): boolean => {
    // ALL FEATURES ARE NOW FREE - BETA ACCESS
    // All premium features are available to everyone
    return true;
  };

  const canUseFeature = (feature: string): { allowed: boolean; reason?: string } => {
    // ALL FEATURES ARE NOW FREE - BETA ACCESS
    // All users can use all features
    return { allowed: true };
  };

  const getRequiredTier = (feature: string): string => {
    const tierMap: Record<string, string> = {
      'unlimited_sessions': 'Premium',
      'advanced_ai': 'Premium',
      'premium_backgrounds': 'Premium',
      'advanced_analytics': 'Premium',
      'data_export': 'Premium',
      'priority_support': 'Premium',
      'distraction_analysis': 'Premium',
      'custom_sessions': 'Premium',
      'dashboard_customization': 'Premium',
      'mini_games': 'Premium',
      'custom_avatars': 'Premium',
      'power_ups': 'Premium',
      'full_history': 'Premium'
    };

    return tierMap[feature] || 'Premium';
  };

  return {
    subscription,
    limits,
    loading,
    hasFeature,
    canUseFeature,
    getRequiredTier,
    refetch: fetchSubscription
  };
}