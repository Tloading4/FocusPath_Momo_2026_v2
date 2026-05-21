import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Crown, Star, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { getActiveSubscription, subscribeToSubscriptionChanges } from '../../services/firebaseSubscriptionService';

interface SubscriptionData {
  tier: 'standard' | 'premium' | 'enhanced';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  interval?: 'month' | 'year';
}

interface SubscriptionStatusProps {
  onUpgrade?: () => void;
}

export function SubscriptionStatus({ onUpgrade }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchSubscription();

      const unsubscribe = subscribeToSubscriptionChanges(
        currentUser.uid,
        (firebaseSubscription) => {
          if (firebaseSubscription) {
            setSubscription({
              tier: firebaseSubscription.tier as 'standard' | 'premium' | 'enhanced',
              status: firebaseSubscription.status as 'active' | 'cancelled' | 'expired' | 'trial',
              currentPeriodEnd: firebaseSubscription.current_period_end,
              cancelAtPeriodEnd: firebaseSubscription.cancel_at_period_end,
              interval: firebaseSubscription.interval as 'month' | 'year',
            });
          }
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [currentUser]);

  const fetchSubscription = async () => {
    if (!currentUser) return;

    try {
      const firebaseSubscription = await getActiveSubscription(currentUser.uid);

      if (firebaseSubscription && (firebaseSubscription.status === 'active' || firebaseSubscription.status === 'trialing')) {
        setSubscription({
          tier: firebaseSubscription.tier as 'standard' | 'premium' | 'enhanced',
          status: firebaseSubscription.status as 'active' | 'cancelled' | 'expired' | 'trial',
          currentPeriodEnd: firebaseSubscription.current_period_end,
          cancelAtPeriodEnd: firebaseSubscription.cancel_at_period_end,
          interval: firebaseSubscription.interval as 'month' | 'year',
        });
      } else {
        setSubscription({
          tier: 'standard',
          status: 'active'
        });
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription data');
      setSubscription({
        tier: 'standard',
        status: 'active'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = (tier: string, interval?: string) => {
    switch (tier) {
      case 'premium':
      case 'enhanced': // Legacy support
        return {
          name: 'Premium',
          icon: Crown,
          color: 'from-purple-500 to-pink-600',
          price: interval === 'year' ? '$74.99/year' : '$7.99/month'
        };
      default:
        return {
          name: 'Standard',
          icon: Star,
          color: 'from-blue-500 to-indigo-600',
          price: 'Free'
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'trial':
        return 'text-blue-400';
      case 'cancelled':
        return 'text-orange-400';
      case 'expired':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

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

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-300 mb-2">Error Loading Subscription</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button 
            onClick={fetchSubscription}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!subscription) return null;

  const tierInfo = getTierInfo(subscription.tier, subscription.interval);
  const IconComponent = tierInfo.icon;

  return (
    <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`bg-gradient-to-r ${tierInfo.color} p-3 rounded-2xl`}>
            <IconComponent className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{tierInfo.name} Plan</h2>
            <p className={`text-lg font-semibold capitalize ${getStatusColor(subscription.status)}`}>
              {subscription.status}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{tierInfo.price}</div>
        </div>
      </div>

      {/* Beta Access - All Features Unlocked */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Star className="h-6 w-6 text-green-400" />
          <h3 className="text-xl font-bold text-white">All Premium Features Unlocked!</h3>
        </div>
        <p className="text-green-200 mb-4">
          You currently have free access to all premium features during our beta period:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-200 text-sm">Unlimited focus sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-200 text-sm">All mini-games unlocked</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-200 text-sm">Custom dashboard widgets</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-200 text-sm">Premium backgrounds & themes</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-200 text-sm">Unlimited AI coaching</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-200 text-sm">All power-ups & custom avatars</span>
          </div>
        </div>
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-300 mb-2">Premium Upgrade Coming Soon</h4>
          <p className="text-blue-200 text-sm">
            Enjoy all features for free during our beta period. We'll notify you before any changes to pricing or features.
          </p>
        </div>
      </div>

      {/* Premium User Info */}
      {(subscription.tier === 'premium' || subscription.tier === 'enhanced') && subscription.currentPeriodEnd && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-purple-300 mb-1">Billing Cycle</h4>
              <p className="text-purple-200 text-sm">
                {subscription.interval === 'year' ? 'Annual' : 'Monthly'} subscription
              </p>
            </div>
            <div className="text-right">
              <h4 className="font-semibold text-purple-300 mb-1">Next Billing Date</h4>
              <p className="text-purple-200 text-sm">
                {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            </div>
          </div>
          {subscription.cancelAtPeriodEnd && (
            <div className="mt-4 bg-orange-500/20 border border-orange-500/50 rounded-lg p-3">
              <p className="text-orange-300 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Your subscription will end on {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Current Plan Benefits - All Premium Features Available */}
      <div className="mb-6">
        <h4 className="font-semibold text-white mb-3">Your Current Benefits (All Premium Features):</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Unlimited focus sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">All mini-games unlocked</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Custom dashboard widgets</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">10+ premium backgrounds</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Unlimited AI coaching</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Unlimited data exports</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Custom photo avatars</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">All power-ups unlocked</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Full session history</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Priority support</span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Coming Soon */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white/10 rounded-xl px-6 py-3 flex items-center gap-2">
          <Crown className="h-5 w-5 text-gray-400" />
          <span className="text-gray-300 font-semibold">Premium Upgrade Coming Soon</span>
        </div>
      </div>

      {/* Help Message */}
      <div className="mt-6 pt-6 border-t border-white/20">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-300 mb-2">Need Help?</h4>
          <p className="text-blue-200 text-sm">
            Have questions about your subscription? Contact us at hemisphirtechnologies@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}