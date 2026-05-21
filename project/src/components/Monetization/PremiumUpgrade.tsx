import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionStatus } from './SubscriptionStatus';
import { 
  Crown, 
  X, 
  Sparkles, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Code,
  Palette
} from 'lucide-react';

interface PremiumUpgradeProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
}

export function PremiumUpgrade({ isOpen, onClose, currentTier = 'standard' }: PremiumUpgradeProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 rounded-2xl animate-pulse-glow">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white">All Features Currently Free!</h2>
                <p className="text-xl text-gray-300">Enjoy unlimited sessions and all premium features during beta</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-300">Notice</h4>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-300">Success!</h4>
                <p className="text-green-200 text-sm">{success}</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {!currentUser ? (
            <div className="text-center py-12">
              <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">Authentication Required</h3>
              <p className="text-gray-300 mb-6">Please log in to learn about Premium features.</p>
              <button
                onClick={onClose}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-6 py-3 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Current Subscription Status */}
              <SubscriptionStatus />

              {/* Beta Access Section */}
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-8 mb-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Star className="h-8 w-8 text-green-400" />
                    <h3 className="text-2xl font-bold text-white">Beta Access - All Features Free!</h3>
                  </div>
                  <p className="text-gray-300 mb-6 text-lg">
                    You currently have free access to all premium features during our beta period.
                  </p>

                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                    <h4 className="text-xl font-bold text-white mb-3">Premium Upgrade Coming Soon</h4>
                    <p className="text-blue-200 mb-4">
                      We're working on our premium subscription plans. In the meantime, enjoy unlimited access to:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-blue-200 text-sm">Unlimited focus sessions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-blue-200 text-sm">Unlimited AI coaching</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-blue-200 text-sm">All mini-games</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-blue-200 text-sm">Dashboard customization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-blue-200 text-sm">Premium backgrounds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-blue-200 text-sm">Full session history</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-gray-300 text-sm">
                      We'll notify you before making any changes to pricing or feature access.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-2xl p-6 text-center border border-purple-500/30">
                  <div className="bg-purple-500/20 p-4 rounded-2xl mb-4 mx-auto w-fit">
                    <Zap className="h-8 w-8 text-purple-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Unlimited Sessions</h4>
                  <p className="text-gray-300 text-sm">Focus as much as you want with no daily limits</p>
                </div>

                <div className="bg-white/10 rounded-2xl p-6 text-center border border-blue-500/30">
                  <div className="bg-blue-500/20 p-4 rounded-2xl mb-4 mx-auto w-fit">
                    <Sparkles className="h-8 w-8 text-blue-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Enhanced AI Coach</h4>
                  <p className="text-gray-300 text-sm">Unlimited AI queries and personalized coaching</p>
                </div>

                <div className="bg-white/10 rounded-2xl p-6 text-center border border-green-500/30">
                  <div className="bg-green-500/20 p-4 rounded-2xl mb-4 mx-auto w-fit">
                    <Palette className="h-8 w-8 text-green-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Premium Features</h4>
                  <p className="text-gray-300 text-sm">50+ backgrounds, mini-games, custom dashboard, and more</p>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-6 text-center border border-orange-500/30">
                  <div className="bg-orange-500/20 p-4 rounded-2xl mb-4 mx-auto w-fit">
                    <TrendingUp className="h-8 w-8 text-orange-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Advanced Analytics</h4>
                  <p className="text-gray-300 text-sm">Detailed insights into your focus patterns and progress</p>
                </div>

                <div className="bg-white/10 rounded-2xl p-6 text-center border border-pink-500/30">
                  <div className="bg-pink-500/20 p-4 rounded-2xl mb-4 mx-auto w-fit">
                    <Sparkles className="h-8 w-8 text-pink-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Mini-Games</h4>
                  <p className="text-gray-300 text-sm">Fun brain break games after focus sessions</p>
                </div>

                <div className="bg-white/10 rounded-2xl p-6 text-center border border-indigo-500/30">
                  <div className="bg-indigo-500/20 p-4 rounded-2xl mb-4 mx-auto w-fit">
                    <Shield className="h-8 w-8 text-indigo-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Custom Dashboard</h4>
                  <p className="text-gray-300 text-sm">Personalize your widgets and layout</p>
                </div>
              </div>

              {/* Current Benefits */}
              <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="h-6 w-6 text-yellow-400" />
                  What You Get Right Now (Standard)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-white">3 focus sessions per day</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-white">Basic AI insights</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-white">Standard backgrounds</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-white">Progress tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-white">XP marketplace</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-white">Community support</span>
                  </div>
                </div>
              </div>

              {/* Newsletter Signup */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-3">Questions?</h3>
                <p className="text-gray-300 mb-4">
                  Need help or have questions about Premium? We're here to help!
                </p>
                <div className="bg-purple-500/10 rounded-lg p-4">
                  <p className="text-purple-300 text-sm">
                    Contact us at: <strong>support@focuspath.app</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}