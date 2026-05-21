import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Crown, ArrowRight, Home, Sparkles } from 'lucide-react';

export function SuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

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
          {/* Success Animation */}
          <div className="relative mb-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            
            {/* Floating sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-yellow-400 animate-float"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${10 + i * 10}%`,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: `${2 + i * 0.2}s`
                  }}
                >
                  <Sparkles className="h-6 w-6" />
                </div>
              ))}
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 animate-slide-down">
            🎉 Success!
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 animate-fade-in">
            Your action has been completed successfully.
          </p>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 mb-8 animate-slide-up">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="h-6 w-6 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">Thank You</h3>
            </div>
            
            <p className="text-gray-300 mb-4">
              Thank you for using Focus Path™! We're constantly working to improve your experience.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-violet-700 hover:to-indigo-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Go to Dashboard
              <ArrowRight className="h-5 w-5" />
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
            <p className="text-gray-400 text-sm">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@focuspath.com" className="text-violet-400 hover:text-violet-300 transition-colors">
                support@focuspath.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}