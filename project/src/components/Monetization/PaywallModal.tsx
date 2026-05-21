import React from 'react';
import { Crown, Zap, Star, Lock, Unlock, ArrowRight, X, CheckCircle } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
  description: string;
  requiredTier?: 'premium';
}

export function PaywallModal({ isOpen, onClose, onUpgrade, feature, description, requiredTier }: PaywallModalProps) {
  if (!isOpen) return null;

  const tier = {
    name: 'Premium',
    monthlyPrice: '$7.99/month',
    annualPrice: '$74.99/year',
    annualSavings: 'Save $21.89',
    icon: Crown,
    color: 'from-violet-600 to-indigo-600',
    features: [
      'Unlimited focus sessions',
      'Unlimited AI queries & coaching',
      'All mini-games unlocked',
      'Custom dashboard widgets',
      'Premium backgrounds & themes',
      'Unlimited data exports',
      'Custom photo avatars',
      'All power-ups unlocked',
      'Full session history',
      'Priority support'
    ]
  };

  const IconComponent = tier.icon;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl max-w-2xl w-full border border-white/20 overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${tier.color} p-8 text-center relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Lock className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">Feature Now Free!</h2>
          <p className="text-white/90 text-lg">{feature} is available to all users during beta</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">{feature} - Currently Free!</h3>
            <p className="text-gray-300 text-lg leading-relaxed">{description}</p>
            <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-200 text-sm">
                This feature is currently available to all users at no cost during our beta period.
              </p>
            </div>
          </div>

          {/* Tier Showcase */}
          <div className={`bg-gradient-to-r ${tier.color} bg-opacity-20 border border-white/20 rounded-2xl p-6 mb-8`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`bg-gradient-to-r ${tier.color} p-3 rounded-2xl`}>
                <IconComponent className="h-8 w-8 text-white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white">{tier.name} Plan</h4>
                <div className="flex flex-col gap-1">
                  <p className="text-xl text-gray-300">{tier.monthlyPrice}</p>
                  <p className="text-sm text-green-400">{tier.annualPrice} ({tier.annualSavings})</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tier.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="bg-green-500/20 p-4 rounded-2xl mb-3 mx-auto w-fit">
                <Unlock className="h-8 w-8 text-green-400" />
              </div>
              <h5 className="font-semibold text-white mb-2">Instant Access</h5>
              <p className="text-gray-400 text-sm">Upgrade now and start using premium features immediately</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-500/20 p-4 rounded-2xl mb-3 mx-auto w-fit">
                <Star className="h-8 w-8 text-blue-400" />
              </div>
              <h5 className="font-semibold text-white mb-2">7-Day Free Trial</h5>
              <p className="text-gray-400 text-sm">Try Premium risk-free for 7 days</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-500/20 p-4 rounded-2xl mb-3 mx-auto w-fit">
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
              <h5 className="font-semibold text-white mb-2">Cancel Anytime</h5>
              <p className="text-gray-400 text-sm">No long-term commitment, cancel whenever you want</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Continue Using Feature
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Beta Notice */}
          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <p className="text-gray-400 text-sm mb-2">Enjoying all premium features during beta</p>
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
              <span>No Credit Card Required</span>
              <span>All Features Free</span>
              <span>Premium Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}