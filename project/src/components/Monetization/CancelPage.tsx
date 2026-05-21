import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, MessageCircle, Heart, Home } from 'lucide-react';

export function CancelPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen theme-bg flex items-center justify-center p-4">
      
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/20 text-center">
          {/* Cancel Icon */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <XCircle className="h-12 w-12 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 animate-slide-down">
            Action Cancelled
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 animate-fade-in">
            No worries! Your action was cancelled and no changes were made.
          </p>

          {/* Reassurance Message */}
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-6 mb-8 animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-3">What happened?</h3>
            <p className="text-gray-300 leading-relaxed">
              You cancelled the process before completion. This is completely normal and happens to everyone! 
              No changes were made, and you can try again anytime.
            </p>
          </div>

          {/* Why Upgrade Section */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 mb-8 animate-slide-up">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="h-6 w-6 text-pink-400" />
              <h3 className="text-xl font-bold text-white">We'd Love to Have You!</h3>
            </div>
            
            <p className="text-gray-300 mb-4">
              Premium Focus Path™ users see 3x better results in building focus habits. Here's what you're missing:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              {[
                'Unlimited daily sessions',
                'AI-powered insights',
                'Premium backgrounds',
                'Advanced analytics',
                'Priority support',
                'Export your data'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 animate-slide-right" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-violet-700 hover:to-indigo-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Back to Dashboard
            </button>
          </div>

          {/* Auto-redirect notice */}
          <div className="mt-8 pt-6 border-t border-white/20 animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <p className="text-gray-400 text-sm">
              Automatically redirecting to dashboard in {countdown} seconds...
            </p>
          </div>

          {/* Support */}
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.9s' }}>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <MessageCircle className="h-4 w-4" />
              <span>
                Questions? Contact us at{' '}
                <a href="mailto:support@focuspath.com" className="text-violet-400 hover:text-violet-300 transition-colors">
                  support@focuspath.com
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}