import { useState, useEffect } from 'react';
import { Login } from './Login';
import { Signup } from './Signup';
import { ForgotPassword } from './ForgotPassword';

interface AuthPageProps {
  onBackToOverview?: () => void;
}

export function AuthPage({ onBackToOverview }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className={`min-h-screen theme-bg flex flex-col items-center justify-center p-2 sm:p-4 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      
      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col justify-center">
        <div className={`text-center mb-6 sm:mb-8 transition-all duration-700 ${isVisible ? 'animate-slide-down' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <img
              src="/icon16.png"
              alt="Focus Path™ Logo"
              className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl"
            />
            <h1 className="text-2xl sm:text-4xl font-bold text-white">Focus Path™</h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-300">Master your focus, unlock your potential!</p>
        </div>

        {mode === 'login' && (
          <Login 
            onToggleMode={() => setMode('signup')} 
            onForgotPassword={() => setMode('forgot')}
            onBackToOverview={onBackToOverview}
          />
        )}
        
        {mode === 'signup' && (
          <Signup 
            onToggleMode={() => setMode('login')} 
            onBackToOverview={onBackToOverview}
          />
        )}
        
        {mode === 'forgot' && (
          <ForgotPassword 
            onBack={() => setMode('login')} 
            onBackToOverview={onBackToOverview}
          />
        )}
      </div>

      {/* License Footer */}
      <footer className="relative z-10 w-full max-w-4xl mt-4 sm:mt-8 mb-2 sm:mb-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-white/10">
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="text-xs sm:text-sm text-gray-300">
              © 2025 Focus Path™. All rights reserved.
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              Licensed to <span className="text-white font-semibold">Hemisphir Technologies</span>, <span className="text-white font-semibold">Hemisphir LLC</span>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-4 pt-1 sm:pt-2 text-xs text-gray-400">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Support</span>
            </div>
            {/* Debug Info - Remove in production */}
            <div className="text-xs text-gray-500 mt-2">
              <div>Auth Domain: focuspathai-3cf55.firebaseapp.com</div>
              <div>Project ID: focuspathai-3cf55</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}