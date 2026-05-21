import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserPlus, Eye, EyeOff, Mail, Lock, Home } from 'lucide-react';

interface SignupProps {
  onToggleMode: () => void;
  onBackToOverview?: () => void;
}

export function Signup({ onToggleMode, onBackToOverview }: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { signup } = useAuth();

  React.useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    
    try {
      setError('');
      setLoading(true);
      console.log('Attempting signup for:', email);
      await signup(email, password);
      
      // Create initial user profile with email
      if (auth.currentUser) {
        const profileRef = doc(db, 'userProfiles', auth.currentUser.uid);
        await setDoc(profileRef, {
          email: email,
          displayName: '',
          totalXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          createdAt: new Date(),
          lastUpdated: new Date(),
          profileCompleted: false
        }, { merge: true });
      }
      
      console.log('Signup successful');
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(`Failed to create account: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto transition-all duration-500 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`}>
      <div className="glass-card rounded-2xl p-8 shadow-2xl hover-lift">
        {/* Home Button */}
        {onBackToOverview && (
          <div className="mb-6">
            <button
              onClick={onBackToOverview}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm hover-glow"
            >
              <Home className="h-4 w-4" />
              Back to Overview
            </button>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <UserPlus className="h-8 w-8 text-white animate-bounce-in" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 animate-slide-down">Join Focus Path™</h2>
          <p className="text-gray-300 animate-fade-in">Start your productivity journey today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm animate-bounce-in">
              {error}
              {(error.includes('An account with this email already exists') || error.includes('email-already-in-use')) && (
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="mt-2 w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 py-2 px-4 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                >
                  Switch to Sign In
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="animate-slide-right card-stagger-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all hover:bg-white/10 focus-ring"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="animate-slide-right card-stagger-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all hover:bg-white/10 focus-ring"
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors hover-bounce"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="animate-slide-right card-stagger-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all hover:bg-white/10 focus-ring"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] btn-press hover-glow animate-scale-in card-stagger-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center animate-fade-in card-stagger-5">
          <p className="text-gray-300">
            Already have an account?{' '}
            <button
              onClick={onToggleMode}
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors hover-glow"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}